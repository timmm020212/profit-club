# Настройки уведомлений ботов в админке

## Цель

Добавить страницу `/admin/bots` с настройками уведомлений для клиентского и мастер-бота. Админ может включать/выключать каждое уведомление и редактировать текст шаблона с переменными.

## Страница

`/admin/bots` — два таба: **"Бот клиентов"** и **"Бот мастеров"**. Каждый таб — список карточек уведомлений. Дизайн в стиле админки: тёмная тема `#0D0D11`, violet/indigo акценты.

## Карточка уведомления

Каждая карточка содержит:
- **Название** (например "Напоминание за 24ч")
- **Переключатель** вкл/выкл (toggle)
- **Textarea** с текстом шаблона (`bg-[#1C1C22] border border-white/[0.08]`)
- **Чипы переменных** под textarea (`bg-amber-500/20 text-amber-300`) — клик вставляет `{{переменная}}` в позицию курсора

## Уведомления — Бот клиентов

| Slug | Название | Дефолтный шаблон | Переменные |
|------|----------|-----------------|------------|
| `reminder_24h` | Напоминание за 24ч | `⏰ Напоминание о записи\n\n📅 Завтра, {{date}}, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club` | `date`, `startTime`, `serviceName`, `masterName` |
| `reminder_2h` | Напоминание за 2ч | `⏰ Скоро запись!\n\n📅 Сегодня, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club` | `date`, `startTime`, `serviceName`, `masterName` |
| `optimization_proposal` | Предложение переноса | `🔄 Предложение о переносе\n\n💇 {{serviceName}}\n👩 {{masterName}}\n\n❌ Текущее время: {{oldTime}}\n✅ Предлагаемое: {{newTime}}\n\nЭто позволит оптимизировать расписание мастера.` | `serviceName`, `masterName`, `oldTime`, `newTime` |

## Уведомления — Бот мастеров

| Slug | Название | Дефолтный шаблон | Переменные |
|------|----------|-----------------|------------|
| `master_new_appointment` | Новая запись | `📌 Новая запись\n\n👤 {{clientName}}\n📞 {{clientPhone}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}` | `clientName`, `clientPhone`, `serviceName`, `date`, `startTime`, `endTime` |
| `master_cancellation` | Отмена записи | `❌ Запись отменена\n\n👤 {{clientName}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}` | `clientName`, `serviceName`, `date`, `startTime`, `endTime` |
| `master_break` | Перерыв | `☕ Перерыв {{breakMinutes}} мин\n\n📅 {{date}}\n🕐 {{breakStart}}–{{breakEnd}}` | `date`, `breakStart`, `breakEnd`, `breakMinutes` |
| `master_early_finish` | Ранний конец смены | `🏁 Вы свободны с {{freeFrom}}\n\n📅 {{date}}\n🕐 Последняя запись заканчивается в {{freeFrom}}\n📋 Конец смены: {{shiftEnd}}` | `date`, `freeFrom`, `shiftEnd` |

## Хранение

Новая таблица `bot_notification_templates` в PostgreSQL (схема `db/schema-postgres.ts`):

```typescript
export const botNotificationTemplates = pgTable("bot_notification_templates", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  botType: varchar("bot_type", { length: 20 }).notNull(), // "client" | "masters"
  name: varchar("name", { length: 255 }).notNull(),
  messageTemplate: text("message_template").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  variables: text("variables").notNull(), // JSON array of strings, e.g. '["date","startTime"]'
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

При первом обращении к API — seed дефолтными шаблонами если таблица пуста.

## API

### `GET /api/admin/bot-notifications?botType=client`

Возвращает массив шаблонов для указанного бота. Если таблица пуста — сидит дефолтами и возвращает их.

### `PUT /api/admin/bot-notifications/[slug]`

Обновляет шаблон:
```json
{
  "messageTemplate": "новый текст с {{переменными}}",
  "isEnabled": true
}
```

## Новые файлы

### `app/(app)/admin/bots/page.tsx`

Серверная страница. Рендерит `BotNotificationsAdmin`.

### `components/admin/BotNotificationsAdmin.tsx`

Клиентский компонент:
- Два таба: "Бот клиентов" / "Бот мастеров"
- Загружает шаблоны через `GET /api/admin/bot-notifications?botType=...`
- Для каждого шаблона рендерит `NotificationCard`
- Сохранение автоматическое (debounce) или по кнопке

### `components/admin/NotificationCard.tsx`

Клиентский компонент — карточка одного уведомления:
- Toggle вкл/выкл → `PUT` с `isEnabled`
- Textarea для текста шаблона
- Чипы переменных из `variables` — клик вставляет `{{var}}` в позицию курсора textarea
- Кнопка "Сохранить" → `PUT` с `messageTemplate`
- Кнопка "Сбросить" → вернуть дефолтный текст

### `app/api/admin/bot-notifications/route.ts`

GET handler: возвращает шаблоны, seed при первом обращении.

### `app/api/admin/bot-notifications/[slug]/route.ts`

PUT handler: обновляет `messageTemplate` и/или `isEnabled`.

## Модификации существующих файлов

### `db/schema-postgres.ts`

Добавить таблицу `botNotificationTemplates`.

### `telegram-bot/client/reminders.ts`

Заменить хардкоженные тексты напоминаний на чтение из `botNotificationTemplates`. Функция:

```typescript
async function getTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
  const rows = await db.select().from(botNotificationTemplates)
    .where(eq(botNotificationTemplates.slug, slug)).limit(1);
  if (rows.length === 0) return null;
  return { template: rows[0].messageTemplate, enabled: rows[0].isEnabled };
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
```

Если `enabled = false` — пропустить отправку. Если шаблон не найден — использовать хардкоженный fallback.

### `telegram-bot/client/notify-master.ts`

Аналогично — читать шаблоны `master_new_appointment`, `master_cancellation`, `master_break`, `master_early_finish` из БД. Fallback на текущие хардкоженные тексты.

### Optimization proposals (в `reminders.ts`)

Текст предложения оптимизации (`optimization_proposal`) тоже из БД.

## Навигация

Добавить ссылку "Боты" в `AdminHeader.tsx` (если есть навигация) или в sidebar.

## Дизайн UI

- Background страницы: `bg-[#070709]`
- Карточки: `bg-[#0D0D10] border border-white/[0.07] rounded-xl`
- Textarea: `bg-[#1C1C22] border border-white/[0.08] rounded-lg text-white font-mono text-sm`
- Toggle: `bg-violet-600` когда вкл, `bg-white/10` когда выкл
- Чипы переменных: `bg-amber-500/20 text-amber-300 rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer hover:bg-amber-500/30`
- Табы: `border-b border-white/[0.07]`, активный таб `text-violet-400 border-b-2 border-violet-400`
