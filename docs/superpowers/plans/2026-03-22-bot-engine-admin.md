# Bot Engine + Visual Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded Telegram bot logic with a data-driven engine managed through a visual admin UI at `/admin/bots`.

**Architecture:** Bot behavior (texts, buttons, flows, conditions) stored in PostgreSQL tables (`bot_flows`, `bot_steps`, `bot_buttons`, `bot_user_states`). A universal engine reads config from DB, executes actions/conditions from registries, renders templates. Admin UI provides CRUD for all bot config. Payload CMS stays for landing/services/masters.

**Tech Stack:** Next.js 15, PostgreSQL (Supabase), Drizzle ORM, Telegraf, TypeScript, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-22-bot-engine-admin-design.md`

---

## File Structure

### New files to create:

```
db/schema-postgres.ts                          — ADD 4 new tables (bot_flows, bot_steps, bot_buttons, bot_user_states)

telegram-bot/engine/types.ts                   — Engine type definitions
telegram-bot/engine/cache.ts                   — Flow/step/button cache with 60s TTL + HTTP invalidation
telegram-bot/engine/template.ts                — Template renderer: t("{{var}}", context)
telegram-bot/engine/state.ts                   — User state persistence (bot_user_states CRUD)
telegram-bot/engine/engine.ts                  — Core engine: parse callback → load step → evaluate → render → send
telegram-bot/engine/index.ts                   — Re-export + registerEngine(bot) setup
telegram-bot/engine/actions.ts                 — Action registry (business logic)
telegram-bot/engine/conditions.ts              — Condition registry (named boolean functions)
telegram-bot/engine/data-sources.ts            — Data source registry (dynamic list queries)
telegram-bot/engine/scheduler.ts               — Reminder + auto-optimization loops

app/api/admin/bot-flows/route.ts               — GET (list), POST (create)
app/api/admin/bot-flows/[id]/route.ts          — PUT (update), DELETE
app/api/admin/bot-steps/route.ts               — GET (list), POST (create)
app/api/admin/bot-steps/[id]/route.ts          — PUT, DELETE
app/api/admin/bot-steps/reorder/route.ts       — PUT (batch reorder)
app/api/admin/bot-buttons/route.ts             — GET, POST
app/api/admin/bot-buttons/[id]/route.ts        — PUT, DELETE
app/api/admin/bot-cache/invalidate/route.ts    — POST
app/api/admin/bot-registry/route.ts            — GET (available actions/conditions/sources)

app/(app)/admin/bots/page.tsx                  — Bot selector (client/masters cards)
app/(app)/admin/bots/[botType]/page.tsx        — Flow list + step chain editor
components/admin/BotFlowList.tsx               — Left sidebar: flow list with CRUD
components/admin/BotStepChain.tsx              — Main area: step cards chain
components/admin/BotStepEditor.tsx             — Step edit modal
components/admin/BotButtonEditor.tsx           — Button list editor inside step modal

scripts/migrate-bot-flows.ts                   — One-time migration: hardcoded flows → DB records
```

### Files to modify:
```
db/schema-postgres.ts                          — Add 4 new table definitions
telegram-bot/client-simple.ts                  — Replace with engine-based client bot
telegram-bot/masters-bot-full.ts               — Replace with engine-based masters bot
package.json                                   — Remove AdminJS packages, add npm scripts
payload.config.ts                              — Remove bot-settings globals
```

### Files to delete (after engine works):
```
telegram-bot/bot-settings.ts
telegram-bot/client/booking-flow.ts
telegram-bot/client/appointment-manager.ts
telegram-bot/client/optimization-handler.ts
telegram-bot/client/reminders.ts
telegram-bot/client/notify-master.ts
telegram-bot/client/types.ts
telegram-bot/client/utils.ts
adminjs/server.ts
adminjs/                                       — entire directory
```

---

## Task 1: Database Schema

**Files:**
- Modify: `db/schema-postgres.ts`

- [ ] **Step 1: Add bot_flows table to schema**

Add to `db/schema-postgres.ts` after the `adminSettings` table:

```typescript
import { pgTable, text, varchar, serial, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const botFlows = pgTable("bot_flows", {
  id: serial("id").primaryKey(),
  botType: varchar("bot_type", { length: 20 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  triggerCommand: varchar("trigger_command", { length: 100 }),
  triggerCallback: varchar("trigger_callback", { length: 100 }),
  triggerText: varchar("trigger_text", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("bot_flows_bot_type_slug_idx").on(table.botType, table.slug),
]);
```

- [ ] **Step 2: Add bot_steps table**

```typescript
export const botSteps = pgTable("bot_steps", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").notNull().references(() => botFlows.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(), // message, dynamic_list, confirmation, action, condition
  messageTemplate: text("message_template"),
  parseMode: varchar("parse_mode", { length: 20 }), // Markdown, HTML, null
  order: integer("order").default(0).notNull(),
  actionType: varchar("action_type", { length: 50 }),
  dataSource: varchar("data_source", { length: 100 }),
  dataFilter: text("data_filter"), // JSON
  backStepId: integer("back_step_id"),
  nextStepId: integer("next_step_id"),
  conditionFn: varchar("condition_fn", { length: 50 }),
  conditionParams: text("condition_params"), // JSON
  onConditionFailStepId: integer("on_condition_fail_step_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("bot_steps_flow_id_slug_idx").on(table.flowId, table.slug),
]);
```

- [ ] **Step 3: Add bot_buttons table**

```typescript
export const botButtons = pgTable("bot_buttons", {
  id: serial("id").primaryKey(),
  stepId: integer("step_id").notNull().references(() => botSteps.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // callback, url
  targetStepId: integer("target_step_id"),
  targetFlowSlug: varchar("target_flow_slug", { length: 100 }),
  urlTemplate: varchar("url_template", { length: 500 }),
  order: integer("order").default(0).notNull(),
  row: integer("row").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 4: Add bot_user_states table**

```typescript
export const botUserStates = pgTable("bot_user_states", {
  id: serial("id").primaryKey(),
  telegramId: varchar("telegram_id", { length: 50 }).notNull().unique(),
  botType: varchar("bot_type", { length: 20 }).notNull(),
  flowId: integer("flow_id"),
  stepId: integer("step_id"),
  vars: text("vars"), // JSON
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 5: Add type exports**

```typescript
export type BotFlow = typeof botFlows.$inferSelect;
export type NewBotFlow = typeof botFlows.$inferInsert;
export type BotStep = typeof botSteps.$inferSelect;
export type NewBotStep = typeof botSteps.$inferInsert;
export type BotButton = typeof botButtons.$inferSelect;
export type NewBotButton = typeof botButtons.$inferInsert;
export type BotUserState = typeof botUserStates.$inferSelect;
```

- [ ] **Step 6: Push schema to DB**

Run: `npm run db:push`
Expected: 4 new tables created in Supabase

- [ ] **Step 7: Commit**

```bash
git add db/schema-postgres.ts
git commit -m "feat: add bot engine database tables (bot_flows, bot_steps, bot_buttons, bot_user_states)"
```

---

## Task 2: Engine Core — Types, Template, Cache, State

**Files:**
- Create: `telegram-bot/engine/types.ts`
- Create: `telegram-bot/engine/template.ts`
- Create: `telegram-bot/engine/cache.ts`
- Create: `telegram-bot/engine/state.ts`

- [ ] **Step 1: Create engine types**

Create `telegram-bot/engine/types.ts` with all shared interfaces:
- `EngineContext` — variables available during step rendering
- `ActionFn`, `ActionResult` — action function signature
- `ConditionFn` — condition function signature
- `DataSourceFn`, `DataSourceItem` — data source function signature
- `StepConfig` — loaded step with buttons attached
- `FlowConfig` — loaded flow with steps

- [ ] **Step 2: Create template renderer**

Create `telegram-bot/engine/template.ts`:
- `t(template, vars)` — replaces `{{key}}` with values from vars object
- Re-use existing logic from `bot-settings.ts`

- [ ] **Step 3: Create cache module**

Create `telegram-bot/engine/cache.ts`:
- In-memory cache for flows, steps, buttons
- 60-second TTL
- `loadFlows(botType)` — loads all active flows with their steps and buttons
- `invalidateCache()` — clears cache
- `startCacheServer(port)` — tiny HTTP server on port 3002 listening for `POST /invalidate-cache`

- [ ] **Step 4: Create state module**

Create `telegram-bot/engine/state.ts`:
- `getUserState(telegramId, botType)` — read from `bot_user_states`
- `saveUserState(telegramId, botType, flowId, stepId, vars)` — upsert
- `clearUserState(telegramId, botType)` — delete
- `cleanExpiredStates()` — delete states older than 24 hours

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/engine/
git commit -m "feat: add engine core modules (types, template, cache, state)"
```

---

## Task 3: Engine Registries — Actions, Conditions, Data Sources

**Files:**
- Create: `telegram-bot/engine/actions.ts`
- Create: `telegram-bot/engine/conditions.ts`
- Create: `telegram-bot/engine/data-sources.ts`

- [ ] **Step 1: Create actions registry**

Create `telegram-bot/engine/actions.ts` with all actions extracted from current bot code:
- `create_appointment` — from `booking-flow.ts` lines 486-501
- `cancel_appointment` — from `appointment-manager.ts` lines 204-207
- `notify_master_new` — from `notify-master.ts` lines 55-74
- `notify_master_cancel` — from `notify-master.ts` lines 77-102
- `generate_reg_code` — from `client-simple.ts` lines 154-164
- `check_registration` — from `client-simple.ts` lines 186-214
- `link_telegram` — from `client-simple.ts` lines 82-111
- `detect_breaks` — from `notify-master.ts` lines 104-123
- `notify_master_break` — from `notify-master.ts` lines 125-146
- `notify_master_early_finish` — from `notify-master.ts` lines 148-170
- `toggle_notification_setting` — from `masters-bot-full.ts` lines 460-479
- `create_change_request` — from `masters-bot-full.ts` lines 593-612
- `confirm_work_slot` — from `masters-bot-full.ts` lines 653-684

Each action: `async (ctx, vars, engine) => Promise<ActionResult>`

- [ ] **Step 2: Create conditions registry**

Create `telegram-bot/engine/conditions.ts`:
- `can_modify(vars, params)` — check if appointment is modifiable (params.hours threshold)
- `is_registered(vars)` — check if telegramId exists in clients table
- `has_appointments(vars)` — check for future confirmed appointments
- `role_matches(vars)` — check executorRole vs specialization substring match
- `is_work_day(vars)` — check if master has confirmed workSlot on date
- `day_has_appointments(vars)` — check if date has confirmed appointments

- [ ] **Step 3: Create data sources registry**

Create `telegram-bot/engine/data-sources.ts`:
- `services.category` — `SELECT DISTINCT category FROM services`
- `services` — `SELECT * FROM services WHERE category = filter.category`
- `masters` — `SELECT * FROM masters WHERE is_active = true` + role filter
- `available_dates` — next 7 days with confirmed workSlots for master
- `available_slots` — free time slots on date for master (30-min intervals, exclude booked)
- `my_appointments` — client's future confirmed appointments
- `master_work_days` — master's confirmed future workSlots
- `master_day_appointments` — appointments on specific day for master

Each returns `Array<{ id, label, value? }>`

- [ ] **Step 4: Commit**

```bash
git add telegram-bot/engine/
git commit -m "feat: add engine registries (actions, conditions, data-sources)"
```

---

## Task 4: Engine Core — Main Engine

**Files:**
- Create: `telegram-bot/engine/engine.ts`
- Create: `telegram-bot/engine/index.ts`

- [ ] **Step 1: Create main engine**

Create `telegram-bot/engine/engine.ts`:

The engine class with methods:
- `handleCallback(ctx, callbackData)` — parse `s:<stepId>:<param>`, load step, execute
- `handleCommand(ctx, command, botType)` — find flow by triggerCommand, go to first step
- `handleText(ctx, text, botType)` — find flow by triggerText, go to first step
- `executeStep(ctx, step, vars)` — the core: evaluate condition → run action → render → send
- `renderStep(step, vars)` — build message text + keyboard from step config
- `buildKeyboard(step, vars)` — static buttons from bot_buttons + dynamic from dataSource
- `sendMessage(ctx, text, keyboard, parseMode, isEdit)` — editMessageText or reply
- `goToStep(ctx, stepId, vars)` — navigate to a specific step
- `goToMainMenu(ctx, botType)` — reset state, show main menu flow

Callback data format:
- `s:<stepId>` — go to step
- `s:<stepId>:<paramValue>` — go to step with param (dynamic list selection)
- `a:<stepId>:<actionParam>` — execute action on step

- [ ] **Step 2: Create index.ts**

Create `telegram-bot/engine/index.ts`:
- `registerEngine(bot, botType)` — registers all handlers on Telegraf bot instance:
  - Load all active flows for this botType
  - For each flow with `triggerCommand` → `bot.command(cmd, handler)`
  - For each flow with `triggerCallback` → `bot.action(cb, handler)`
  - For each flow with `triggerText` → `bot.hears(text, handler)`
  - Register catch-all `bot.action(/^s:\d+/, handler)` for step navigation
  - Register catch-all `bot.action(/^a:\d+/, handler)` for actions
  - Start cache invalidation HTTP server

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/engine/
git commit -m "feat: add main bot engine and registration"
```

---

## Task 5: Scheduler (Reminders + Auto-Optimization)

**Files:**
- Create: `telegram-bot/engine/scheduler.ts`

- [ ] **Step 1: Create scheduler**

Create `telegram-bot/engine/scheduler.ts`:
- `startScheduler(botToken)` — starts both loops
- `checkReminders(botToken)` — every 5 min, checks upcoming appointments, sends 24h/2h reminders
  - Reads reminder message templates from `bot_steps` where flow slug = `reminders`
  - Uses `t()` template renderer with appointment/service/master data
  - Tracks sent reminders via `reminderSent` table (same as current)
- `checkAutoOptimization(botToken)` — every 1 min, creates drafts + sends proposals
  - Same logic as current `reminders.ts` auto-optimization section
  - Reads proposal template from `bot_steps` where flow slug = `optimization`

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/engine/scheduler.ts
git commit -m "feat: add scheduler for reminders and auto-optimization"
```

---

## Task 6: Migration Script

**Files:**
- Create: `scripts/migrate-bot-flows.ts`

- [ ] **Step 1: Create migration script**

Create `scripts/migrate-bot-flows.ts` that inserts all current hardcoded flows into DB:

**Client bot flows to migrate:**
1. `main_menu` — triggerCallback: `menu`, buttons: book, my_appointments, about
2. `registration` — triggerCommand: `/start` (for unregistered), steps: welcome → reg_button → check_registration
3. `booking` — triggerCallback: `book`, steps: category → service → master → date → time → confirm → success
4. `my_appointments` — triggerCallback: `my_appointments`, steps: list → cancel_confirm → cancel_success / reschedule
5. `about` — triggerCallback: `about`, single message step
6. `reminders` — no trigger (used by scheduler), steps: reminder_24h, reminder_2h
7. `optimization` — no trigger (used by scheduler), steps: proposal, accept_confirm, decline_confirm

**Masters bot flows to migrate:**
1. `main_menu` — triggerCommand: `/start`, reply keyboard buttons
2. `schedule` — triggerText: `📅 Расписание`, steps: show_schedule with nav
3. `change_day` — triggerText: `🔄 Изменить рабочий день`, steps: select_day → action_menu → time_picker → confirm
4. `settings` — triggerText: `⚙️ Настройки`, steps: show_settings → toggle

Each flow: insert into `bot_flows`, then `bot_steps` with correct order, then `bot_buttons` with correct step references.

- [ ] **Step 2: Run migration**

Run: `npx tsx scripts/migrate-bot-flows.ts`
Expected: All flows, steps, buttons inserted. Log count of each.

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-bot-flows.ts
git commit -m "feat: add bot flow migration script and seed data"
```

---

## Task 7: Switch Bots to Engine

**Files:**
- Modify: `telegram-bot/client-simple.ts`
- Modify: `telegram-bot/masters-bot-full.ts`

- [ ] **Step 1: Rewrite client bot**

Replace `telegram-bot/client-simple.ts` with minimal entry point:

```typescript
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Telegraf } from 'telegraf';
import { registerEngine } from './engine';
import { startScheduler } from './engine/scheduler';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

registerEngine(bot, 'client');
startScheduler(process.env.TELEGRAM_BOT_TOKEN || '');

bot.launch({ dropPendingUpdates: true });
console.log('[client-bot] Engine-based bot launched');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

- [ ] **Step 2: Rewrite masters bot**

Replace `telegram-bot/masters-bot-full.ts` with minimal entry point:

```typescript
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Telegraf } from 'telegraf';
import { registerEngine } from './engine';

const bot = new Telegraf(process.env.MASTERS_BOT_TOKEN || '');

registerEngine(bot, 'masters');

bot.launch({ dropPendingUpdates: true });
console.log('[masters-bot] Engine-based bot launched');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

- [ ] **Step 3: Test both bots**

Run: `npm run bot:client` — test booking flow, about, appointments
Run: `npm run bot:masters` — test schedule, change day, settings

- [ ] **Step 4: Commit**

```bash
git add telegram-bot/client-simple.ts telegram-bot/masters-bot-full.ts
git commit -m "feat: switch both bots to engine-based architecture"
```

---

## Task 8: Admin API Endpoints

**Files:**
- Create: `app/api/admin/bot-flows/route.ts`
- Create: `app/api/admin/bot-flows/[id]/route.ts`
- Create: `app/api/admin/bot-steps/route.ts`
- Create: `app/api/admin/bot-steps/[id]/route.ts`
- Create: `app/api/admin/bot-steps/reorder/route.ts`
- Create: `app/api/admin/bot-buttons/route.ts`
- Create: `app/api/admin/bot-buttons/[id]/route.ts`
- Create: `app/api/admin/bot-cache/invalidate/route.ts`
- Create: `app/api/admin/bot-registry/route.ts`

- [ ] **Step 1: Create bot-flows API**

`app/api/admin/bot-flows/route.ts`:
- GET: `?botType=client` → list flows ordered by `order`
- POST: create flow, validate UNIQUE(botType, slug)

`app/api/admin/bot-flows/[id]/route.ts`:
- PUT: update flow, set `updatedAt = now()`
- DELETE: cascade deletes steps + buttons

All endpoints: check admin session via `requireAdminSession()` from `lib/requireAdminSession.ts`

- [ ] **Step 2: Create bot-steps API**

`app/api/admin/bot-steps/route.ts`:
- GET: `?flowId=1` → list steps with their buttons, ordered by `order`
- POST: create step

`app/api/admin/bot-steps/[id]/route.ts`:
- PUT: update step
- DELETE: cascade deletes buttons

`app/api/admin/bot-steps/reorder/route.ts`:
- PUT: body `[{id, order}]` → batch update order

- [ ] **Step 3: Create bot-buttons API**

`app/api/admin/bot-buttons/route.ts`:
- GET: `?stepId=1` → list buttons ordered by row, order
- POST: create button

`app/api/admin/bot-buttons/[id]/route.ts`:
- PUT: update button
- DELETE: delete button

- [ ] **Step 4: Create cache invalidation endpoint**

`app/api/admin/bot-cache/invalidate/route.ts`:
- POST: calls `http://localhost:3002/invalidate-cache` to clear bot's in-memory cache
- Returns success/failure

- [ ] **Step 5: Create registry endpoint**

`app/api/admin/bot-registry/route.ts`:
- GET: returns `{ actions: string[], conditions: string[], dataSources: string[] }` — names of all registered functions for admin UI dropdowns

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/bot-flows/ app/api/admin/bot-steps/ app/api/admin/bot-buttons/ app/api/admin/bot-cache/ app/api/admin/bot-registry/
git commit -m "feat: add admin API endpoints for bot flow management"
```

---

## Task 9: Admin UI — Bot Selector + Flow List

**Files:**
- Create: `app/(app)/admin/bots/page.tsx`
- Create: `app/(app)/admin/bots/[botType]/page.tsx`
- Create: `components/admin/BotFlowList.tsx`

- [ ] **Step 1: Create bot selector page**

`app/(app)/admin/bots/page.tsx`:
- Two cards: "Бот клиентов" (link to `/admin/bots/client`) and "Бот мастеров" (link to `/admin/bots/masters`)
- Style: match existing admin dark theme (`bg-[#0D0D11]`, violet/indigo accents)

- [ ] **Step 2: Create flow list page**

`app/(app)/admin/bots/[botType]/page.tsx`:
- Layout: left sidebar (flow list) + main area (step chain)
- Fetches flows from `/api/admin/bot-flows?botType=X`
- URL-based flow selection: `?flow=booking` query param

- [ ] **Step 3: Create BotFlowList component**

`components/admin/BotFlowList.tsx`:
- List of flows with: name, slug badge, active toggle, order arrows
- Click to select → updates URL query param
- "+ Новый flow" button → modal with: name, slug, botType, triggerCommand/Callback/Text, description
- Delete button with confirmation
- Active toggle calls PUT to update `isActive`

- [ ] **Step 4: Commit**

```bash
git add app/(app)/admin/bots/ components/admin/BotFlowList.tsx
git commit -m "feat: add bot admin UI — selector and flow list pages"
```

---

## Task 10: Admin UI — Step Chain + Step Editor + Button Editor

**Files:**
- Create: `components/admin/BotStepChain.tsx`
- Create: `components/admin/BotStepEditor.tsx`
- Create: `components/admin/BotButtonEditor.tsx`

- [ ] **Step 1: Create BotStepChain component**

`components/admin/BotStepChain.tsx`:
- Vertical list of step cards connected by arrows
- Each card: name, type badge, message preview (first 100 chars), button count, condition indicator
- Actions per card: Edit (opens modal), Delete, Move up/down
- "+ Добавить шаг" button at bottom
- Fetches steps from `/api/admin/bot-steps?flowId=X`
- Reorder calls PUT `/api/admin/bot-steps/reorder`

- [ ] **Step 2: Create BotStepEditor modal**

`components/admin/BotStepEditor.tsx`:
- Modal (createPortal to body, z-[9999] per project conventions)
- Fields:
  - Name (text input)
  - Type (select: message, dynamic_list, confirmation, action, condition)
  - Message template (textarea, with hint showing available `{{vars}}`)
  - Parse mode (select: plain, Markdown, HTML) — shown for message/dynamic_list
  - Data source (select from registry) — shown for dynamic_list type
  - Data filter (textarea for JSON) — shown for dynamic_list
  - Action type (select from registry) — shown for action type
  - Next step (select from flow's steps)
  - Back step (select from flow's steps)
  - Condition function (select from registry) — shown for condition type
  - Condition params (textarea for JSON) — shown for condition type
  - On condition fail step (select) — shown for condition type
- Save calls POST or PUT, then invalidates cache
- Fetches registry from `/api/admin/bot-registry`

- [ ] **Step 3: Create BotButtonEditor component**

`components/admin/BotButtonEditor.tsx` (embedded inside BotStepEditor):
- List of buttons with inline editing
- Each button: label input, type select (callback/url), target step select OR target flow slug OR url template
- Row number input, order arrows, delete button
- "+ Добавить кнопку" button
- Save is part of step save (buttons saved after step)

- [ ] **Step 4: Commit**

```bash
git add components/admin/BotStepChain.tsx components/admin/BotStepEditor.tsx components/admin/BotButtonEditor.tsx
git commit -m "feat: add bot admin UI — step chain editor, step modal, button editor"
```

---

## Task 11: Cleanup

**Files:**
- Delete: old bot files, AdminJS directory, AdminJS packages
- Modify: `payload.config.ts`, `package.json`

- [ ] **Step 1: Delete old bot code**

```bash
rm telegram-bot/bot-settings.ts
rm telegram-bot/client/booking-flow.ts
rm telegram-bot/client/appointment-manager.ts
rm telegram-bot/client/optimization-handler.ts
rm telegram-bot/client/reminders.ts
rm telegram-bot/client/notify-master.ts
rm telegram-bot/client/types.ts
rm telegram-bot/client/utils.ts
rmdir telegram-bot/client
```

- [ ] **Step 2: Delete AdminJS**

```bash
rm -rf adminjs/
npm uninstall adminjs @adminjs/express @adminjs/sql @adminjs/design-system styled-components connect-pg-simple express-session
```

- [ ] **Step 3: Remove Payload bot-settings globals**

Edit `payload.config.ts`: remove the two globals (`client-bot-settings`, `masters-bot-settings`) from the `globals` array. Keep collections and everything else.

- [ ] **Step 4: Drop old DB tables**

```sql
DROP TABLE IF EXISTS client_bot_settings CASCADE;
DROP TABLE IF EXISTS masters_bot_settings CASCADE;
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: remove old bot code, AdminJS, and Payload bot-settings globals"
```

---

## Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Database schema (4 tables) | None |
| 2 | Engine core (types, template, cache, state) | Task 1 |
| 3 | Engine registries (actions, conditions, data-sources) | Task 2 |
| 4 | Main engine + registration | Tasks 2, 3 |
| 5 | Scheduler (reminders, optimization) | Tasks 2, 3 |
| 6 | Migration script (seed flows from hardcoded) | Tasks 1-4 |
| 7 | Switch bots to engine | Tasks 4, 5, 6 |
| 8 | Admin API endpoints | Task 1 |
| 9 | Admin UI — selector + flow list | Task 8 |
| 10 | Admin UI — step chain + editors | Task 8 |
| 11 | Cleanup old code | Tasks 7, 9, 10 |
