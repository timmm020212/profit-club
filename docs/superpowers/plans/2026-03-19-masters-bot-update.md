# Masters Bot Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite masters bot: unified schedule view with day navigation, working change-day flow, notification settings.

**Architecture:** Rewrite `masters-bot-full.ts` with new menu structure. Add `notificationSettings` field to masters table. Check settings before sending notifications in `notify-master.ts`.

**Tech Stack:** Telegraf, Drizzle ORM, better-sqlite3

**Spec:** `docs/superpowers/specs/2026-03-19-masters-bot-update-design.md`

---

## File Structure

```
telegram-bot/masters-bot-full.ts              — REWRITE: new menu, schedule, change day, settings
telegram-bot/client/notify-master.ts          — MODIFY: check notification settings before sending
db/schema-sqlite.ts                           — MODIFY: add notificationSettings field to masters
```

---

### Task 1: Add notificationSettings to DB schema

**Files:**
- Modify: `db/schema-sqlite.ts`

- [ ] **Step 1: Add field to schema**

Add `notificationSettings: text("notificationSettings")` to masters table in schema-sqlite.ts.

- [ ] **Step 2: Run ALTER TABLE**

```bash
node -e "const Database = require('better-sqlite3'); const db = new Database('profit_club.db'); db.exec('ALTER TABLE masters ADD COLUMN notificationSettings TEXT'); console.log('Done'); db.close();"
```

- [ ] **Step 3: Commit**

```bash
git add db/schema-sqlite.ts
git commit -m "feat(db): add notificationSettings field to masters table"
```

---

### Task 2: Check notification settings before sending

**Files:**
- Modify: `telegram-bot/client/notify-master.ts`

- [ ] **Step 1: Add settings check helper**

Add a function that reads master's `notificationSettings` from DB and checks if a given notification type is enabled. Default (null/empty) = all enabled except morningReminder.

```typescript
import { db } from "../../db";
import { masters } from "../../db/schema";
import { eq } from "drizzle-orm";

interface NotificationSettings {
  newAppointments: boolean;
  cancellations: boolean;
  breaks: boolean;
  morningReminder: boolean;
}

const DEFAULTS: NotificationSettings = {
  newAppointments: true,
  cancellations: true,
  breaks: true,
  morningReminder: false,
};

async function getSettings(masterTelegramId: string): Promise<NotificationSettings> {
  try {
    const rows = await db.select({ notificationSettings: masters.notificationSettings })
      .from(masters).where(eq(masters.telegramId, masterTelegramId)).limit(1);
    if (rows.length === 0 || !rows[0].notificationSettings) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(rows[0].notificationSettings) };
  } catch { return DEFAULTS; }
}
```

- [ ] **Step 2: Add settings check to each notification function**

- `notifyMasterNewAppointment`: check `settings.newAppointments`
- `notifyMasterCancellation`: check `settings.cancellations`
- `notifyMasterBreak`: check `settings.breaks`
- `notifyMasterEarlyFinish`: check `settings.breaks`

Add at the start of each function (after the null check):
```typescript
const settings = await getSettings(opts.masterTelegramId);
if (!settings.newAppointments) return; // (or appropriate flag)
```

- [ ] **Step 3: Export getSettings and DEFAULTS for use in bot**

- [ ] **Step 4: Commit**

```bash
git add telegram-bot/client/notify-master.ts
git commit -m "feat(bot): check notification settings before sending to master"
```

---

### Task 3: Rewrite masters bot — schedule view

**Files:**
- Modify: `telegram-bot/masters-bot-full.ts`

This is the largest task. Rewrite the bot with new menu and schedule feature.

- [ ] **Step 1: New menu keyboard**

Replace old 4-button keyboard with:
```typescript
const masterMenu = Markup.keyboard([
  ['📅 Расписание'],
  ['🔄 Изменить рабочий день'],
  ['⚙️ Настройки'],
]).resize();
```

Remove "📋 Записи на сегодня" handler entirely.

- [ ] **Step 2: Implement schedule display function**

Create `async function showSchedule(ctx, masterId, targetDate?)` that:

1. If no targetDate — find nearest confirmed workSlot (workDate >= today), sorted by workDate ASC
2. Query workSlot for master+date (confirmed)
3. Query confirmed appointments for master+date, JOIN services for names
4. Sort appointments by startTime
5. Build message:
   - Header: "📅 Расписание — пт, 20 марта" + shift time
   - For each gap between shift start and first appointment (if ≥ 30 min): "🕐 HH:MM–HH:MM свободно"
   - For each appointment: "HH:MM–HH:MM 💇 ServiceName — ClientName"
   - For each gap between appointments:
     - if < 30 min: "☕ HH:MM–HH:MM перерыв (N мин)"
     - if ≥ 30 min: "🕐 HH:MM–HH:MM свободно"
   - After last appointment to shift end:
     - if gap < minServiceDuration: "🏁 Свободны с HH:MM"
     - else: "🕐 HH:MM–HH:MM свободно"
   - If no appointments: "Нет записей, весь день свободен"
6. Navigation buttons: find prev/next confirmed workSlot dates, show buttons if they exist

- [ ] **Step 3: Register schedule handlers**

- `bot.hears('📅 Расписание', ...)` → call showSchedule(ctx, master.id)
- `bot.action(/^schedule_prev_(.+)$/, ...)` → parse date, find previous workSlot, call showSchedule
- `bot.action(/^schedule_next_(.+)$/, ...)` → parse date, find next workSlot, call showSchedule

Use `ctx.editMessageText` for navigation (inline buttons), `ctx.reply` for initial menu press.

- [ ] **Step 4: Commit**

```bash
git add telegram-bot/masters-bot-full.ts
git commit -m "feat(bot): new masters bot schedule with day navigation"
```

---

### Task 4: Change day flow

**Files:**
- Modify: `telegram-bot/masters-bot-full.ts`

- [ ] **Step 1: Show list of upcoming work days**

On "🔄 Изменить рабочий день" text: query confirmed workSlots where workDate >= today, show as inline buttons with formatted date + time. Callback: `change_day_<slotId>`.

- [ ] **Step 2: Show action choices**

On `change_day_<slotId>`: show slot info + inline buttons:
- `[🕐 Изменить время | change_time_<slotId>]`
- `[❌ Отменить день | change_cancel_<slotId>]`
- `[← Назад | change_back]`

- [ ] **Step 3: Time change flow**

On `change_time_<slotId>`: set userState `waitingForNewTime` with slotId. Reply "Введите новое время в формате ЧЧ:ММ-ЧЧ:ММ".

In text handler: validate format, parse times, create workSlotChangeRequest with type "time_change", reply confirmation.

- [ ] **Step 4: Cancel day flow**

On `change_cancel_<slotId>`: show confirmation "Вы уверены?" with `[Да, отменить | cancel_confirm_slot_<slotId>]` `[Нет | change_back]`.

On confirm: create workSlotChangeRequest with type "cancel", reply confirmation.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/masters-bot-full.ts
git commit -m "feat(bot): masters bot change day flow (time change + cancel)"
```

---

### Task 5: Notification settings

**Files:**
- Modify: `telegram-bot/masters-bot-full.ts`

- [ ] **Step 1: Show settings**

On "⚙️ Настройки" text: load master's notificationSettings from DB (or defaults). Show message with toggle buttons:

```
⚙️ Настройки уведомлений

✅ Новые записи
✅ Отмены записей
✅ Перерывы
❌ Утреннее напоминание
```

Each line is an inline button with callback `toggle_notif_<key>`.

- [ ] **Step 2: Toggle handler**

On `toggle_notif_<key>`: load current settings, flip the value, save to DB (UPDATE masters SET notificationSettings = JSON), edit message with updated toggles.

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/masters-bot-full.ts
git commit -m "feat(bot): masters bot notification settings with toggles"
```

---

### Task 6: Cleanup and test

- [ ] **Step 1: Remove old handlers**

Remove "📋 Записи на сегодня" handler, old "📅 Мое расписание" handler, clean up unused code.

- [ ] **Step 2: Keep existing callback handlers**

Keep `confirm_X` / `reject_X` and `confirm_request_X` / `reject_request_X` callback handlers for work slot confirmation — these are triggered by admin bot notifications.

- [ ] **Step 3: Test bot startup**

```bash
npx tsx telegram-bot/masters-bot-full.ts
```

Verify: starts without errors, menu shows 3 buttons.

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "feat(bot): masters bot update complete — schedule, change day, settings"
git push origin main
```
