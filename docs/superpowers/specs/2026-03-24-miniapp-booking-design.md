# Telegram Mini App — Бронирование услуг

## Цель

Добавить Telegram Mini App, открывающий полноценный интерфейс бронирования прямо в Telegram. Идентичный дизайн и функционал сайта, без лендинга — сразу выбор услуг.

## Точка входа

Menu button бота клиентов (постоянная кнопка у поля ввода). Inline-кнопка "📅 Записаться" в главном меню остаётся — оба варианта сосуществуют.

## Архитектура

Одна новая Next.js страница переиспользует существующие компоненты. Никакого дублирования кода.

```
Telegram WebApp
  → GET SITE_URL/miniapp
    → BookingServicesGrid (фильтры + карточки)
      → BookingModal (мастер → дата → время → данные → готово)
        → POST /api/appointments
```

### Существующие компоненты

- `BookingServiceCard` — карточка услуги (картинка, название, цена, длительность, бейдж, кнопка "Записаться"). Без изменений.

**Важно:** `BookingServicesGrid` рендерит `BookingModal` внутри себя (управляет `activeService` state). Чтобы передать `telegramUser` в `BookingModal`, нужно пробросить его через `BookingServicesGrid`.

- `BookingServicesGrid` — сетка услуг с категорийными фильтрами, поиском, FLIP-анимацией чипов. **Модификация:** новый опциональный пропс `telegramUser`, который пробрасывается в `BookingModal`.
- `BookingModal` — модалка записи с 5 шагами:
  1. Выбор мастера (аватар-инициалы, специализация, фильтр по executorRole)
  2. Выбор даты (DayPicker, ru locale)
  3. Выбор времени (слоты по группам утро/день/вечер)
  4. Данные клиента (имя + телефон) — предзаполняется из `telegramUser`
  5. Подтверждение (анимированная галочка, сводка)
- Step progress pills с анимацией (expanding pills, glow, edit hint)

### Существующие API (без изменений)

- `GET /api/services` — список услуг
- `GET /api/masters` — список мастеров
- `GET /api/available-slots?masterId=X&serviceId=X&date=YYYY-MM-DD` — свободные слоты
- `POST /api/appointments` — создание записи

## Новые файлы

### 1. `app/(app)/miniapp/page.tsx`

Серверная страница-обёртка:
- `<script src="https://telegram.org/js/telegram-web-app.js">` в head
- Фон `bg-[#09090D]`, шрифты Playfair + Montserrat (те же что на сайте)
- Рендерит клиентский компонент `MiniAppBooking`

### 2. `components/MiniAppBooking.tsx`

Клиентский компонент:
- При монтировании: `Telegram.WebApp.ready()`, `Telegram.WebApp.expand()`
- Извлекает `initData` и отправляет на `/api/miniapp/auth` для валидации
- Получает данные клиента (имя, телефон) если зарегистрирован
- Рендерит `BookingServicesGrid`
- При клике "Записаться" открывает `BookingModal` с пропсом `telegramUser`
- После успешной записи: `Telegram.WebApp.close()` или кнопка "Закрыть"

### 3. `app/api/miniapp/auth/route.ts`

POST endpoint:
- Принимает `{ initData: string }`
- Валидация HMAC-SHA256:
  ```
  data_check_string = sorted key=value pairs from initData (excluding hash)
  secret_key = HMAC-SHA256(bot_token, "WebAppData")
  hash = HMAC-SHA256(secret_key, data_check_string)
  ```
- Проверяет `auth_date` не старше 5 минут
- Извлекает `user.id` → ищет в `clients` по `telegramId`
- Возвращает:
  ```json
  {
    "valid": true,
    "telegramId": "123456",
    "telegramName": "Тимур",
    "client": {                    // null если не зарегистрирован
      "id": 1,
      "name": "Тимур",
      "phone": "+79991234567"
    }
  }
  ```

### 4. `app/(app)/miniapp/layout.tsx`

Минимальный layout. Родительский `app/(app)/layout.tsx` добавляет только `AuthSessionProvider` + `RegistrationProvider` (без Header) — это подходит. Данный layout добавляет `<script>` для Telegram WebApp SDK и метатег `viewport` для мобильного отображения. Без навигации сайта.

## Модификации существующих файлов

### `components/BookingServicesGrid.tsx`

Новый опциональный пропс:
```typescript
interface Props {
  carousel?: boolean;
  telegramUser?: { telegramId: string; name: string; phone: string } | null;
}
```

Пробрасывает `telegramUser` в `BookingModal`:
```tsx
{activeService && (
  <BookingModal service={activeService} onClose={() => setActiveService(null)} telegramUser={telegramUser} />
)}
```

### `components/BookingModal.tsx`

Новый опциональный пропс:
```typescript
interface Props {
  service: Service;
  onClose: () => void;
  telegramUser?: {
    telegramId: string;
    name: string;
    phone: string;
  } | null;
}
```

Изменения:
- Шаг 4: если `telegramUser` передан — предзаполнить `clientName` и `clientPhone` из него. Шаг всегда показывается, клиент может отредактировать.
- `handleSubmit`: всегда передавать `clientTelegramId` если есть `telegramUser.telegramId`
- После успешной записи: если `telegramUser` и клиент не был в `clients` — создать запись (через авто-регистрацию в POST /api/appointments)
- `onClose` на шаге 5 (после успешной записи): если в Mini App — вызвать `Telegram.WebApp.close()`. На шагах 1-4 `onClose` просто закрывает модалку (возврат к списку услуг), НЕ закрывает Mini App.

### `telegram-bot/client-simple.ts`

Добавить при запуске бота:
```typescript
bot.telegram.setChatMenuButton({
  menuButton: {
    type: 'web_app',
    text: '📅 Записаться',
    web_app: { url: `${SITE_URL}/miniapp` }
  }
});
```

### `app/api/appointments/route.ts`

Поле `clientTelegramId` уже поддерживается в POST body. Добавить авто-регистрацию: если `clientTelegramId` передан и клиент с таким `telegramId` не существует в `clients` — создать запись:
```typescript
await db.insert(clients).values({
  name: clientName,
  phone: clientPhone,
  telegramId: clientTelegramId,
  isVerified: true,
  createdAt: new Date().toISOString(),
  verifiedAt: new Date().toISOString(),
});
```

## Дизайн

Идентичен текущему сайту:
- Тёмная тема: `bg-[#09090D]`
- Акцент: `#B2223C` → `#e8556e` (градиент)
- Шрифты: Playfair Display (заголовки), Montserrat (UI)
- Карточки: `rgba(255,255,255,0.03)` с `border rgba(255,255,255,0.06)`
- Модалка: `bg-[#0e0e14]`, скруглённые углы `rounded-3xl`
- Все анимации сохраняются (FLIP chips, stagger cards, modal-in, pill animations)

## Авторизация

1. Telegram передаёт `initData` автоматически при открытии Mini App
2. Клиент `MiniAppBooking` отправляет `initData` на `/api/miniapp/auth`
3. Сервер валидирует HMAC-SHA256 с bot token
4. Если `telegramId` найден в `clients` — возвращает имя/телефон для предзаполнения
5. Если не найден — `client: null`, пользователь заполняет форму, при записи создаётся `clients` запись

## Безопасность

- `initData` валидируется HMAC-SHA256 на сервере с `TELEGRAM_BOT_TOKEN` (клиентский бот — именно он открывает Mini App)
- `auth_date` проверяется (не старше 5 минут)
- SITE_URL должен быть HTTPS в production (требование Telegram для WebApp)
- Бот token НЕ отправляется на клиент

## Edge cases

- Загрузка: спиннер `#B2223C` пока идёт валидация `initData`
- Если `initData` невалидный — показать ошибку "Откройте через Telegram"
- Если сервер недоступен — показать retry кнопку
- Если SITE_URL = localhost — Mini App не будет работать в Telegram (требуется HTTPS). Для разработки использовать ngrok или аналог
- `BookingModal.onClose` на шаге 5 → `Telegram.WebApp.close()` (закрыть Mini App). На шагах 1-4 → вернуться к списку услуг (не закрывать Mini App)
- CORS не требуется — Mini App загружается с того же origin что и API
