# Client Bot Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the client Telegram bot with full booking flow, appointment management (cancel/reschedule), automated reminders (24h + 2h), and master notifications.

**Architecture:** Modular structure under `telegram-bot/client/` with 4 modules (booking-flow, appointment-manager, reminders, notify-master). Entry point `client-simple.ts` imports and wires them. All modules share SQLite DB via `../db/index-sqlite`.

**Tech Stack:** Telegraf, Drizzle ORM, better-sqlite3, Telegram Bot API (HTTP for master notifications)

**Spec:** `docs/superpowers/specs/2026-03-19-client-bot-redesign-design.md`

---

## File Structure

```
telegram-bot/
  client-simple.ts                  — MODIFY: import modules, wire handlers, start reminder loop
  client/
    types.ts                        — CREATE: BookingState interface, shared types
    utils.ts                        — CREATE: date formatting, time helpers, role matching
    booking-flow.ts                 — CREATE: category→service→master→date→time→confirm
    appointment-manager.ts          — CREATE: view, cancel, reschedule appointments
    reminders.ts                    — CREATE: background loop, send 24h/2h reminders
    notify-master.ts                — CREATE: HTTP notifications to master bot
```

---

### Task 1: Shared Types and Utilities

**Files:**
- Create: `telegram-bot/client/types.ts`
- Create: `telegram-bot/client/utils.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// telegram-bot/client/types.ts
export interface BookingState {
  step: "category" | "service" | "master" | "date" | "time" | "confirm";
  categoryName?: string;
  serviceId?: number;
  serviceName?: string;
  serviceDuration?: number;
  servicePrice?: string;
  masterId?: number;
  masterName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  // For reschedule — old appointment to cancel after confirm
  rescheduleFromId?: number;
}

export const bookingStates = new Map<string, BookingState>();
```

- [ ] **Step 2: Create utils.ts with time helpers**

```typescript
// telegram-bot/client/utils.ts
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function roleTokens(value: string): string[] {
  return String(value || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
}

export function rolesMatch(executorRole: string | null, specialization: string): boolean {
  if (!executorRole || !executorRole.trim()) return true; // no role requirement
  const expected = executorRole.trim().toLowerCase();
  const tokens = roleTokens(specialization);
  return tokens.some(t => t === expected || t.includes(expected) || expected.includes(t));
}

export function timeRangesOverlap(s1: number, e1: number, s2: number, e2: number): boolean {
  return s1 < e2 && s2 < e1;
}
```

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/client/types.ts telegram-bot/client/utils.ts
git commit -m "feat(bot): add shared types and utility functions for client bot"
```

---

### Task 2: Master Notification Module

**Files:**
- Create: `telegram-bot/client/notify-master.ts`

- [ ] **Step 1: Create notify-master.ts**

```typescript
// telegram-bot/client/notify-master.ts
import { formatDateRu } from "./utils";

const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";

async function sendToMaster(chatId: string, text: string) {
  if (!MASTERS_BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("[notify-master] Error:", e);
  }
}

export async function notifyMasterNewAppointment(opts: {
  masterTelegramId: string | null;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}) {
  if (!opts.masterTelegramId) return;
  const date = formatDateRu(opts.appointmentDate);
  const phone = opts.clientPhone ? `\n📞 ${opts.clientPhone}` : "";
  const text =
    `📌 Новая запись\n\n` +
    `👤 ${opts.clientName}${phone}\n` +
    `💇 ${opts.serviceName}\n` +
    `📅 ${date}, ${opts.startTime}–${opts.endTime}`;
  await sendToMaster(opts.masterTelegramId, text);
}

export async function notifyMasterCancellation(opts: {
  masterTelegramId: string | null;
  clientName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}) {
  if (!opts.masterTelegramId) return;
  const date = formatDateRu(opts.appointmentDate);
  const text =
    `❌ Запись отменена\n\n` +
    `👤 ${opts.clientName}\n` +
    `💇 ${opts.serviceName}\n` +
    `📅 ${date}, ${opts.startTime}–${opts.endTime}`;
  await sendToMaster(opts.masterTelegramId, text);
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client/notify-master.ts
git commit -m "feat(bot): add master notification module"
```

---

### Task 3: Booking Flow Module

**Files:**
- Create: `telegram-bot/client/booking-flow.ts`

- [ ] **Step 1: Create booking-flow.ts — imports, state, category step**

The file imports db, schema, Markup from telegraf, utils, types, notify-master. Exports `registerBookingHandlers(bot)` which registers all callback actions.

Step 1 (categories): query unique categories from services, show as inline buttons with callback `book_cat_<encoded>`.

- [ ] **Step 2: Service selection step**

On `book_cat_*` callback: filter services by category, show inline buttons with name/price/duration, callback `book_svc_<id>`.

- [ ] **Step 3: Master selection step**

On `book_svc_*` callback: load service, find all active masters, filter by `rolesMatch(service.executorRole, master.specialization)`, show inline buttons, callback `book_master_<id>`.

- [ ] **Step 4: Date selection step**

On `book_master_*` callback: generate next 7 days using `dateStr()`, query confirmed workSlots for this master in those dates, show only dates with slots as inline buttons, callback `book_date_<YYYY-MM-DD>`.

- [ ] **Step 5: Time slot selection step**

On `book_date_*` callback: load workSlot for master+date, load existing confirmed appointments, generate 30-min interval slots checking overlaps with `timeRangesOverlap`, show available times as inline buttons, callback `book_time_<HH:MM>`.

- [ ] **Step 6: Confirmation step**

On `book_time_*` callback: compute endTime from startTime + duration, show summary card with all details, inline buttons `book_confirm` / `book_back_date`.

- [ ] **Step 7: Create appointment on confirm**

On `book_confirm` callback: read state, INSERT into appointments, call `notifyMasterNewAppointment`, send success message to client, clear booking state.

- [ ] **Step 8: Back navigation**

Register `book_back_*` callbacks for each step: `book_back_menu` clears state and shows main menu, `book_back_cat` re-shows categories, `book_back_svc` re-shows services, etc.

- [ ] **Step 9: Commit**

```bash
git add telegram-bot/client/booking-flow.ts
git commit -m "feat(bot): add full booking flow (category→service→master→date→time→confirm)"
```

---

### Task 4: Appointment Manager Module

**Files:**
- Create: `telegram-bot/client/appointment-manager.ts`

- [ ] **Step 1: Create appointment-manager.ts — view appointments**

Exports `registerAppointmentHandlers(bot)`. On "Мои записи" text or `my_appointments` callback: query future confirmed appointments for this client's telegramId, join with services and masters for names, show each as a card with `[Перенести]` and `[Отменить]` inline buttons.

- [ ] **Step 2: Cancel flow**

On `cancel_apt_<id>` callback: check 2-hour constraint, if too late show error, else show confirmation with `cancel_confirm_<id>` / `cancel_no_<id>` buttons. On confirm: UPDATE status to cancelled, notify master, send confirmation to client.

- [ ] **Step 3: Reschedule flow**

On `reschedule_apt_<id>` callback: check 2-hour constraint, load appointment to get serviceId and masterId, set booking state with `rescheduleFromId`, pre-fill service and master, jump to date selection step. On final `book_confirm`: also cancel old appointment.

- [ ] **Step 4: Handle cancel from reminders**

Register `cancel_apt_<id>` handler (same as above — reuse). Reminders send this callback on their "Отменить запись" button.

- [ ] **Step 5: Commit**

```bash
git add telegram-bot/client/appointment-manager.ts
git commit -m "feat(bot): add appointment management (view, cancel, reschedule)"
```

---

### Task 5: Reminders Module

**Files:**
- Create: `telegram-bot/client/reminders.ts`

- [ ] **Step 1: Create reminders.ts**

Exports `startReminderLoop()`. Uses `setInterval(checkAndSendReminders, 5 * 60 * 1000)`. Also runs once immediately on start.

`checkAndSendReminders`: query all confirmed appointments, for each compute hours until start, check 24h window (23.92–24.08h) and 2h window (1.92–2.08h), check `reminderSent` for dedup, send message via Telegram HTTP API (using client bot token), insert into `reminderSent`.

- [ ] **Step 2: Reminder message formatting**

24h message: "⏰ Напоминание о записи" with date "Завтра, ..." and `[Отменить запись]` button.

2h message: "⏰ Скоро запись!" with "Сегодня, ..." and `[Отменить запись]` button (only if > 2h, which it is at the boundary).

Join with services and masters tables to get names for the message.

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/client/reminders.ts
git commit -m "feat(bot): add reminder loop (24h + 2h before appointment)"
```

---

### Task 6: Wire Everything Into client-simple.ts

**Files:**
- Modify: `telegram-bot/client-simple.ts`

- [ ] **Step 1: Add imports**

```typescript
import { registerBookingHandlers } from "./client/booking-flow";
import { registerAppointmentHandlers } from "./client/appointment-manager";
import { startReminderLoop } from "./client/reminders";
```

- [ ] **Step 2: Register handlers after bot creation**

After `const bot = new Telegraf(...)`:
```typescript
registerBookingHandlers(bot);
registerAppointmentHandlers(bot);
```

- [ ] **Step 3: Start reminder loop before bot.launch()**

```typescript
startReminderLoop();
bot.launch().then(() => { ... });
```

- [ ] **Step 4: Update "Записаться" handler**

Replace the current "coming soon" message for booking button with the booking flow entry point (show categories). The exact handler is registered by `registerBookingHandlers` — just remove the old placeholder.

- [ ] **Step 5: Update "Мои записи" handler**

Replace current simple list with the new handler from `registerAppointmentHandlers` that includes cancel/reschedule buttons.

- [ ] **Step 6: Commit**

```bash
git add telegram-bot/client-simple.ts
git commit -m "feat(bot): wire booking, appointments, reminders into client bot"
```

---

### Task 7: End-to-End Testing

- [ ] **Step 1: Start the bot**

```bash
npm run bot:client
```

Verify: bot starts without errors, reminder loop logs first check.

- [ ] **Step 2: Test booking flow**

In Telegram: "Записаться" → pick category → pick service → pick master → pick date → pick time → confirm. Verify appointment appears in DB and master gets notification.

- [ ] **Step 3: Test "Мои записи"**

Check appointment shows with cancel/reschedule buttons.

- [ ] **Step 4: Test cancellation**

Cancel the appointment. Verify status changes to "cancelled" in DB, master gets notification.

- [ ] **Step 5: Test reschedule**

Create new appointment, reschedule it. Verify old cancelled, new created.

- [ ] **Step 6: Test reminders**

Create appointment 2h from now. Wait for reminder loop (or temporarily set interval to 10s). Verify reminder sent, recorded in `reminderSent`.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(bot): client bot redesign complete — booking, management, reminders"
git push origin main
```
