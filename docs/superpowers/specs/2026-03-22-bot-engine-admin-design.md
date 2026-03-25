



# Bot Engine + Visual Admin — Design Spec

## Overview

Replace hardcoded Telegram bot logic with a data-driven engine. All bot behavior (texts, buttons, flow order, conditions) is stored in the database and managed through a visual admin interface at `/admin/bots`. Zero code changes needed for text edits, new commands, flow modifications, or button changes.

Payload CMS remains for landing page content, services/masters CRUD, and media management.

## Architecture

```
┌─────────────────────────────────────────────┐
│               Admin Interface               │
│            /admin/bots/[botType]             │
│                                             │
│  Flow list → Step editor → Button editor    │
│  Drag-and-drop ordering, live preview       │
└──────────────────┬──────────────────────────┘
                   │ CRUD via API
                   ▼
┌─────────────────────────────────────────────┐
│              PostgreSQL (Supabase)           │
│                                             │
│  bot_flows │ bot_steps │ bot_buttons        │
│  bot_user_states │ bot_conditions           │
└──────────────────┬──────────────────────────┘
                   │ Read (cached 60s)
                   ▼
┌─────────────────────────────────────────────┐
│              Bot Engine (runtime)            │
│           telegram-bot/engine.ts             │
│                                             │
│  1. Parse callback/command                  │
│  2. Load step config from DB                │
│  3. Build context (variables)               │
│  4. Evaluate conditions                     │
│  5. Execute action (if any)                 │
│  6. Render message template                 │
│  7. Generate buttons (static/dynamic)       │
│  8. Send to Telegram                        │
└─────────────────────────────────────────────┘
```

## Database Schema

### `bot_flows` — top-level flow definitions

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| botType | varchar(20) NOT NULL | `client` or `masters` |
| slug | varchar(100) NOT NULL | Unique per botType |
| name | varchar(255) NOT NULL | Human-readable: "Запись", "Главное меню" |
| description | text | Admin documentation for this flow |
| triggerCommand | varchar(100) | `/start`, `/booking` or null |
| triggerCallback | varchar(100) | `book`, `about` or null |
| triggerText | varchar(255) | Text for `bot.hears()` or null (masters reply keyboard) |
| isActive | boolean DEFAULT true | Enable/disable flow |
| order | integer DEFAULT 0 | Order in menu |
| createdAt | timestamp NOT NULL DEFAULT now() | |
| updatedAt | timestamp NOT NULL DEFAULT now() | |

**Constraints:** `UNIQUE(botType, slug)`, allowing both bots to have `main_menu`.

### `bot_steps` — steps within a flow

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| flowId | integer FK NOT NULL | → bot_flows.id ON DELETE CASCADE |
| slug | varchar(100) NOT NULL | `category_select`, `confirm` |
| name | varchar(255) NOT NULL | "Выбор категории" |
| type | varchar(30) NOT NULL | `message`, `dynamic_list`, `confirmation`, `action`, `condition` |
| messageTemplate | text | Text with `{{variables}}` |
| parseMode | varchar(20) | `Markdown`, `HTML`, or null (plain text) |
| order | integer DEFAULT 0 | Order in chain |
| actionType | varchar(50) | `create_appointment`, `cancel_appointment`, null |
| dataSource | varchar(100) | `services.category`, `masters`, `available_slots`, null |
| dataFilter | text | JSON filter: `{"category": "{{categoryName}}"}` |
| backStepId | integer FK | → bot_steps.id (nullable) |
| nextStepId | integer FK | → bot_steps.id (nullable) |
| conditionFn | varchar(50) | Named condition function: `can_modify`, `is_registered`, null |
| conditionParams | text | JSON params for condition: `{"hours": 2}` |
| onConditionFailStepId | integer FK | → bot_steps.id — where to go if condition fails |
| createdAt | timestamp NOT NULL DEFAULT now() | |
| updatedAt | timestamp NOT NULL DEFAULT now() | |

**Constraints:** `UNIQUE(flowId, slug)`

### `bot_buttons` — buttons on steps

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| stepId | integer FK NOT NULL | → bot_steps.id ON DELETE CASCADE |
| label | varchar(255) NOT NULL | Button text |
| type | varchar(20) NOT NULL | `callback` or `url` |
| targetStepId | integer FK | → bot_steps.id (for callback buttons) |
| targetFlowSlug | varchar(100) | Jump to another flow's first step (for menu buttons) |
| urlTemplate | varchar(500) | For URL buttons: `{{siteUrl}}/?tg_code={{code}}` |
| order | integer DEFAULT 0 | Order |
| row | integer DEFAULT 0 | Row (for 2-column layouts) |
| createdAt | timestamp NOT NULL DEFAULT now() | |
| updatedAt | timestamp NOT NULL DEFAULT now() | |

Note: `dynamic` buttons are NOT a button type. Dynamic lists are a step type (`dynamic_list`) where buttons are auto-generated from a `dataSource` query. Each dynamic item becomes a callback button pointing to `nextStepId` with the item's ID as a parameter.

### `bot_user_states` — persistent user state (survives bot restarts)

| Column | Type | Description |
|--------|------|-------------|
| id | serial PK | |
| telegramId | varchar(50) NOT NULL UNIQUE | User's Telegram ID |
| botType | varchar(20) NOT NULL | `client` or `masters` |
| flowId | integer FK | Current flow |
| stepId | integer FK | Current step |
| vars | text | JSON: accumulated variables `{"serviceId": 5, "masterId": 3}` |
| updatedAt | timestamp NOT NULL DEFAULT now() | |

On bot restart, users resume where they left off. States expire after 24 hours (cleaned by periodic job).

## Bot Engine

### File: `telegram-bot/engine.ts`

Single universal handler that replaces all current hardcoded handlers.

**Flow:**
1. Receive callback/command/text from Telegram
2. Parse callback data to find step ID + parameters
3. Load step config from DB (cached 60s)
4. Load/create user state from `bot_user_states`
5. Evaluate condition function (if `conditionFn` set) — may redirect to `onConditionFailStepId`
6. Execute action (if `actionType` set) — call into actions registry
7. Render `messageTemplate` with `t(template, context)`
8. Generate buttons: static from `bot_buttons`, dynamic from `dataSource`
9. Send message to Telegram
10. Save user state to `bot_user_states`

### Callback data format

Telegram limits callback_data to **64 bytes**. Use compact numeric encoding:

```
s:<stepId>              — navigate to step (no params)
s:<stepId>:<paramValue> — navigate with one param (e.g., serviceId)
```

Examples:
- `s:42` — go to step 42 (13 bytes)
- `s:42:5` — go to step 42 with param=5 (15 bytes)
- `s:42:2026-03-22` — step 42 with date param (23 bytes)

Step IDs are serial integers, so this stays well under 64 bytes. The engine resolves step ID → flow → slug → full config server-side.

For action callbacks (confirm/decline): `a:<stepId>:<actionParam>`

### Conditions — named functions (not JSON DSL)

Complex conditions (time calculations, role matching, date logic) cannot be expressed in simple JSON. Instead, conditions are **named functions** registered in code, similar to actions:

```typescript
// telegram-bot/conditions.ts
export const conditions: Record<string, ConditionFn> = {
  can_modify:        (vars, params) => { /* check 2h window */ },
  is_registered:     (vars) => { /* check clients table */ },
  has_appointments:  (vars) => { /* check future appointments */ },
  role_matches:      (vars) => { /* substring match */ },
  is_work_day:       (vars) => { /* check confirmed workSlot */ },
  day_has_appointments: (vars) => { /* check if day has bookings */ },
};
```

Each condition: `(vars, params?) => Promise<boolean>`

In the admin UI, the `conditionFn` dropdown shows available condition names. `conditionParams` is an optional JSON field for configurable thresholds (e.g., `{"hours": 2}` for `can_modify`). This way admins can change "2 hours" to "3 hours" without code.

### File: `telegram-bot/actions.ts`

Registry of executable actions. The only place that requires code changes for new business logic.

```typescript
export const actions: Record<string, ActionFn> = {
  create_appointment,
  cancel_appointment,
  notify_master_new,
  notify_master_cancel,
  send_reminder,
  generate_reg_code,
  check_registration,
  link_telegram,
  detect_breaks,
  notify_master_break,
  notify_master_early_finish,
  optimize_schedule,
  toggle_notification_setting,
  create_change_request,
  confirm_work_slot,
  reject_work_slot,
};
```

Each action: `(ctx, vars, engine) => Promise<ActionResult>`

`ActionResult`: `{ success: boolean, vars?: Record<string, any>, goto?: stepId }`

### File: `telegram-bot/data-sources.ts`

Registry of dynamic data sources for `dynamic_list` steps.

```typescript
export const dataSources: Record<string, DataSourceFn> = {
  "services.category":        // SELECT DISTINCT category FROM services
  "services":                 // SELECT * FROM services WHERE category = filter
  "masters":                  // SELECT * FROM masters WHERE isActive AND role matches
  "available_dates":          // Dates with confirmed workSlots for next N days
  "available_slots":          // Free time slots on a given date
  "my_appointments":          // Client's confirmed future appointments
  "master_work_days":         // Master's upcoming confirmed work slots
  "master_day_appointments":  // Appointments on master's work day
};
```

Each source: `(vars, filter?) => Promise<Array<{ id, label, value? }>>`

### Scheduled Tasks (Reminders, Auto-Optimization)

The engine is reactive (responds to user actions). Scheduled tasks run separately:

**File: `telegram-bot/scheduler.ts`**

Runs periodic loops (same as current `reminders.ts`), but reads message templates from `bot_steps` table:

- **Reminder loop** (every 5 min): checks upcoming appointments, sends 24h/2h reminders using templates from a dedicated `reminders` flow
- **Auto-optimization loop** (every 1 min): creates drafts, sends proposals using templates from an `optimization` flow

The scheduler reads templates from DB but does NOT go through the engine's step-by-step flow. It directly renders templates and sends via Telegram API.

### Reply Keyboard Support (Masters Bot)

The masters bot uses a `Markup.keyboard` (reply keyboard with text buttons) for the main menu. The engine handles this:

- Flows with `triggerText` set → register as `bot.hears(triggerText, handler)`
- On bot startup, engine loads all active flows and registers both callback handlers and text handlers
- Reply keyboard is built from active flows where `triggerText` is set, ordered by `order`

### Caching and Cache Invalidation

- All flows, steps, buttons cached in-memory for 60 seconds
- Bot process exposes a tiny HTTP server on port 3002: `POST /invalidate-cache`
- Admin API endpoint `POST /api/admin/bot-cache/invalidate` calls `http://localhost:3002/invalidate-cache`
- Admin UI calls the API after every save

### Error Handling

| Scenario | Behavior |
|----------|----------|
| `dataSource` query fails | Show "Произошла ошибка, попробуйте позже" + log error |
| `actionType` throws | Show error message + log, stay on current step |
| `targetStepId` does not exist | Show "Ошибка конфигурации" + log, return to main menu |
| Deleted flow/step callback received | Show "Эта команда больше не доступна" + main menu |
| User state references deleted step | Reset state, show main menu |
| Bot process restart | User states restored from `bot_user_states` table |

## Admin Interface

### Pages

#### `/admin/bots` — Bot selector
Two cards: "Бот клиентов" and "Бот мастеров". Click → go to flow list.

#### `/admin/bots/[botType]` — Flow list
Left sidebar: list of flows with name, slug, active toggle, order arrows.
Button: "+ Новый flow" → modal with name, slug, trigger type (command/callback/text), description.

#### `/admin/bots/[botType]/[flowSlug]` — Step editor
Main area: vertical chain of step cards.

Each card shows:
- Step name and type badge
- Message preview (first 100 chars)
- Button count
- Back/next step indicators
- Condition indicator (if set)
- Actions: Edit (modal), Delete, Move up/down

"+ Добавить шаг" button at bottom.

#### Step edit modal
Fields:
- Name (text)
- Type (select: message, dynamic_list, confirmation, action, condition)
- Message template (textarea with variable hints showing available `{{vars}}`)
- Parse mode (select: plain, Markdown, HTML)
- Data source (select, shown for dynamic_list type)
- Data filter (JSON editor, shown for dynamic_list)
- Action type (select from actions registry, shown for action type)
- Next step (select from flow's steps)
- Back step (select from flow's steps)
- Condition function (select from conditions registry, shown for condition type)
- Condition params (JSON editor for thresholds)
- On condition fail → step (select)

#### Button editor (inside step modal)
List of buttons with:
- Label (text)
- Type (callback/url)
- Target step (select from current flow) or Target flow (select, for cross-flow jumps) or URL template (text)
- Row number (for layout)
- Order arrows, delete

"+ Добавить кнопку" button.

### API Endpoints

```
GET    /api/admin/bot-flows?botType=client
POST   /api/admin/bot-flows
PUT    /api/admin/bot-flows/[id]
DELETE /api/admin/bot-flows/[id]

GET    /api/admin/bot-steps?flowId=1
POST   /api/admin/bot-steps
PUT    /api/admin/bot-steps/[id]
DELETE /api/admin/bot-steps/[id]
PUT    /api/admin/bot-steps/reorder  (body: [{id, order}])

GET    /api/admin/bot-buttons?stepId=1
POST   /api/admin/bot-buttons
PUT    /api/admin/bot-buttons/[id]
DELETE /api/admin/bot-buttons/[id]

POST   /api/admin/bot-cache/invalidate

GET    /api/admin/bot-registry  (returns available actions, conditions, dataSources)
```

All endpoints require admin session (existing NextAuth middleware).

## Migration

### What gets created
- 4 new tables: `bot_flows`, `bot_steps`, `bot_buttons`, `bot_user_states`
- Engine: `telegram-bot/engine.ts`, `telegram-bot/actions.ts`, `telegram-bot/data-sources.ts`, `telegram-bot/conditions.ts`, `telegram-bot/scheduler.ts`
- Admin pages: `/admin/bots/...`
- API: `/api/admin/bot-flows`, `/api/admin/bot-steps`, `/api/admin/bot-buttons`, `/api/admin/bot-cache`, `/api/admin/bot-registry`
- Migration script: `scripts/migrate-bot-flows.ts` — converts current hardcoded flows to DB records

### What gets removed
- Payload globals: `client-bot-settings`, `masters-bot-settings` (from payload.config.ts)
- DB tables: `client_bot_settings`, `masters_bot_settings`
- `telegram-bot/bot-settings.ts`
- `telegram-bot/client/booking-flow.ts`
- `telegram-bot/client/appointment-manager.ts`
- `telegram-bot/client/optimization-handler.ts`
- `telegram-bot/client/reminders.ts` (becomes scheduler.ts)
- `telegram-bot/client/notify-master.ts` (becomes actions)
- `telegram-bot/client/types.ts`, `telegram-bot/client/utils.ts` (merged into engine)
- AdminJS packages: `adminjs`, `@adminjs/express`, `@adminjs/sql`, `@adminjs/design-system`, `styled-components`, `connect-pg-simple`, `express-session`
- `adminjs/` directory

### What stays
- Payload CMS at `/super-admin` — landing blocks, services, masters, media
- Current admin panel at `/admin` — schedule, analytics (gets new `/admin/bots` section)
- Both Telegram bots (client + masters) — rewritten to use engine
- All existing DB tables (services, masters, appointments, etc.)

### Migration order
1. Create new tables in schema + push to DB
2. Build engine + actions + conditions + data-sources
3. Build scheduler (reminders + auto-optimization)
4. Write migration script to seed flows/steps/buttons from current hardcoded logic
5. Run migration script
6. Switch bots to engine
7. Build admin UI pages
8. Remove old bot code files
9. Remove AdminJS packages
10. Remove Payload bot-settings globals

## What requires code vs what doesn't

| Task | Code needed? |
|------|-------------|
| Change any message text | No — admin UI |
| Change button labels | No — admin UI |
| Add/remove/reorder steps in a flow | No — admin UI |
| Create new command/flow for the bot | No — admin UI |
| Add button to main menu pointing to new flow | No — admin UI |
| Change condition thresholds (e.g., cancel window hours) | No — admin UI (conditionParams) |
| Enable/disable entire flow | No — admin UI |
| Reorder flows in menu | No — admin UI |
| Add new business logic action | Yes — add to actions.ts |
| Add new data source (new DB query) | Yes — add to data-sources.ts |
| Add new condition function | Yes — add to conditions.ts |
| Change Telegram API integration | Yes — engine.ts |
