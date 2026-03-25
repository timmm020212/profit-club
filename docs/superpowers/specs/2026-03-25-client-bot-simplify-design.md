# Упрощение клиентского бота + регистрация через Mini App

## Цель

Убрать inline booking flow из клиентского бота. Регистрация и запись — через Mini App. Бот остаётся точкой входа: проверяет регистрацию, показывает меню, обрабатывает "Мои записи" и "О нас".

## Scope

Только клиентский бот (`telegram-bot/client-simple.ts` + `telegram-bot/client/`). Бот мастеров (`masters-bot-full.ts`) не трогаем.

## Flow

### Незарегистрированный пользователь

1. `/start` → бот проверяет `clients` по `telegramId`
2. Не найден → сообщение: "Для доступа необходимо зарегистрироваться" + inline-кнопка WebApp "📝 Регистрация" → открывает `/miniapp/register`
3. Menu button НЕ устанавливается (нет доступа к букингу)
4. Пользователь регистрируется в Mini App (имя + телефон)
5. API создаёт запись в `clients` (`isVerified: true`, `telegramId`) и через bot token отправляет сообщение:
   ```
   Добро пожаловать, {name}! 👋

   Выберите действие:
   ```
   С кнопками: "📅 Записаться" (WebApp → /miniapp), "👤 Мои записи", "ℹ️ О нас"
6. Menu button "📅 Записаться" устанавливается для этого пользователя

### Зарегистрированный пользователь

1. `/start` → найден в `clients` → сообщение "Добро пожаловать, {name}! 👋\n\nВыберите действие:"
2. Inline-кнопки: "📅 Записаться" (WebApp → /miniapp), "👤 Мои записи", "ℹ️ О нас"
3. Menu button "📅 Записаться" всегда видна у поля ввода

## Что удаляется

### Файлы
- `telegram-bot/client/booking-flow.ts` — весь inline booking через бот (994 строк)
- `telegram-bot/bot-texts.ts` — тексты шагов из БД
- `telegram-bot/engine/` — весь каталог (engine.ts, cache.ts, state.ts, conditions.ts, data-sources.ts, actions.ts, template.ts, types.ts, scheduler.ts, index.ts)

### Из client-simple.ts
- `import { registerBookingHandlers }` и вызов `registerBookingHandlers(bot)`
- `import { stepText, stepButtons }` и все использования
- `import { registerEngine }` и вызов `registerEngine(bot, 'client')`
- Функция `buildMainMenuKeyboard()` — заменяется простым inline keyboard
- Функция `buttonAction()` — больше не нужна
- Хендлер `bot.action('book')` — заменяется WebApp кнопкой
- Логика `pendingClients` в `/start` — убираем концепцию незавершённой регистрации
- Хендлер `bot.action('check_registration')` — больше не нужен

### Концептуально
- Таблица `pendingClients` больше не используется клиентским ботом (может использоваться сайтом — не трогаем таблицу)
- `telegramVerificationCodes` — логика кодов в `/start` остаётся для обратной совместимости (LOGIN_ deep links с сайта)

## Что остаётся

### Файлы без изменений
- `telegram-bot/client/appointment-manager.ts` — "Мои записи" (inline management)
- `telegram-bot/client/optimization-handler.ts` — предложения оптимизации расписания
- `telegram-bot/client/reminders.ts` — напоминания о записях
- `telegram-bot/client/notify-master.ts` — уведомления мастеру
- `telegram-bot/client/types.ts` — типы (убрать BookingState если есть)
- `telegram-bot/client/utils.ts` — утилиты

### Хендлеры в client-simple.ts
- `bot.action('about')` — "О нас"
- `bot.action('menu')` — возврат в меню
- `bot.action('book_back_menu')` — возврат в меню
- `bot.action('my_appointments')` — открытие списка записей
- LOGIN_ deep link обработка в `/start`

## Новые файлы

### `app/(app)/miniapp/register/page.tsx`

Страница регистрации в Mini App:
- Форма: имя + телефон + кнопка "Зарегистрироваться"
- Если уже зарегистрирован (по initData) — редирект на `/miniapp` (букинг)
- Дизайн: тёмная тема как на сайте (`#09090D`, акцент `#B2223C`)
- После успешной регистрации: сообщение "Регистрация успешна!" + `Telegram.WebApp.close()`

### `app/api/miniapp/register/route.ts`

POST endpoint:
- Принимает `{ initData, name, phone }`
- Валидирует `initData` (HMAC-SHA256 с `TELEGRAM_BOT_TOKEN`)
- Создаёт запись в `clients`:
  ```typescript
  {
    name,
    phone,
    telegramId,
    isVerified: true,
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
  }
  ```
- Отправляет welcome-сообщение через bot token:
  ```
  POST https://api.telegram.org/bot{TOKEN}/sendMessage
  chat_id: telegramId
  text: "Добро пожаловать, {name}! 👋\n\nВыберите действие:"
  reply_markup: inline_keyboard с кнопками
  ```
- Устанавливает menu button для этого пользователя:
  ```
  POST https://api.telegram.org/bot{TOKEN}/setChatMenuButton
  chat_id: telegramId
  menu_button: { type: "web_app", text: "📅 Записаться", web_app: { url: SITE_URL/miniapp } }
  ```
- Возвращает `{ success: true }`

## Модификации

### `telegram-bot/client-simple.ts`

Полная переработка. Новая структура:

```typescript
// Imports: только нужные
import { Telegraf, Markup } from 'telegraf';
import { db } from '../db/index-postgres';
import { clients, telegramVerificationCodes } from '../db/schema-postgres';
import { eq, and, gt } from 'drizzle-orm';
import { registerAppointmentHandlers } from './client/appointment-manager';
import { startReminderLoop } from './client/reminders';
import { registerOptimizationHandlers } from './client/optimization-handler';

const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const bot = new Telegraf(getBotToken());

registerAppointmentHandlers(bot);
registerOptimizationHandlers(bot);

// /start — проверка регистрации
bot.start(async (ctx) => {
  // 1. Handle LOGIN_ deep links (оставляем)
  // 2. Check clients by telegramId
  // 3. If registered → showMainMenu(ctx, name)
  // 4. If not → showRegistrationPrompt(ctx)
});

// showMainMenu — welcome + inline кнопки
async function showMainMenu(ctx, name) {
  await ctx.reply(`Добро пожаловать, ${name}! 👋\n\nВыберите действие:`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('📅 Записаться', `${SITE_URL}/miniapp`)],
      [Markup.button.callback('👤 Мои записи', 'my_appointments')],
      [Markup.button.callback('ℹ️ О нас', 'about')],
    ])
  );
}

// showRegistrationPrompt — просьба зарегистрироваться
async function showRegistrationPrompt(ctx) {
  await ctx.reply('Для доступа необходимо зарегистрироваться:',
    Markup.inlineKeyboard([
      [Markup.button.webApp('📝 Регистрация', `${SITE_URL}/miniapp/register`)],
    ])
  );
}

// about, menu, book_back_menu — как сейчас
// my_appointments — делегируется в appointment-manager
```

### Menu button — динамически по пользователю

В `/start` для зарегистрированных:
```typescript
if (SITE_URL.startsWith('https://')) {
  bot.telegram.setChatMenuButton({
    chatId: ctx.chat.id,
    menuButton: { type: 'web_app', text: '📅 Записаться', web_app: { url: `${SITE_URL}/miniapp` } }
  });
}
```

Для незарегистрированных — не устанавливаем (или ставим default).

### `components/MiniAppBooking.tsx`

Добавить проверку: если пользователь не зарегистрирован (auth API вернул `client: null`) — редирект на `/miniapp/register`.

## Безопасность

- Регистрация валидирует `initData` — нельзя зарегистрироваться без Telegram
- `TELEGRAM_BOT_TOKEN` используется для HMAC и отправки сообщений
- Телефон валидируется на клиенте и сервере
