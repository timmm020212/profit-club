# Schedule Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto/manual schedule optimization that compacts appointments, proposes moves to clients via Telegram, and lets admin control the process.

**Architecture:** New DB tables for optimization state. Algorithm computes compact schedule. Admin UI shows before/after. Bot sends proposals to clients with accept/decline callbacks. Auto-scheduler runs via configurable cron-like interval.

**Tech Stack:** Drizzle ORM, Next.js API routes, Telegraf callbacks, React admin UI

**Spec:** `docs/superpowers/specs/2026-03-19-schedule-optimization-design.md`

---

## File Structure

```
db/schema-sqlite.ts                                    — MODIFY: add 2 tables
lib/optimize-schedule.ts                                — CREATE: core algorithm (pure logic)
app/api/admin/optimize-schedule/route.ts                — CREATE: POST compute, GET list
app/api/admin/optimize-schedule/send/route.ts           — CREATE: POST send proposals
app/api/admin/optimize-schedule/move/route.ts           — CREATE: PATCH manual edit
app/api/admin/optimize-schedule/apply/route.ts          — CREATE: POST apply accepted
components/AdminScheduleOptimizer.tsx                    — CREATE: admin UI
app/admin/page.tsx                                      — MODIFY: add optimizer button/panel
telegram-bot/client/optimization-handler.ts             — CREATE: bot callbacks
telegram-bot/client-simple.ts                           — MODIFY: wire handler
```

---

### Task 1: DB Schema — new tables

**Files:**
- Modify: `db/schema-sqlite.ts`

- [ ] **Step 1: Add scheduleOptimizations table**

```typescript
export const scheduleOptimizations = sqliteTable("scheduleOptimizations", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  masterId: integer("masterId").notNull(),
  workDate: text("workDate").notNull(),
  status: text("status").notNull().default("draft"), // draft, sent, completed
  createdAt: text("createdAt").default(new Date().toISOString()).notNull(),
  sentAt: text("sentAt"),
});
```

- [ ] **Step 2: Add optimizationMoves table**

```typescript
export const optimizationMoves = sqliteTable("optimizationMoves", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  optimizationId: integer("optimizationId").notNull(),
  appointmentId: integer("appointmentId").notNull(),
  oldStartTime: text("oldStartTime").notNull(),
  oldEndTime: text("oldEndTime").notNull(),
  newStartTime: text("newStartTime").notNull(),
  newEndTime: text("newEndTime").notNull(),
  clientResponse: text("clientResponse").notNull().default("pending"), // pending, accepted, declined
  sentAt: text("sentAt"),
});
```

- [ ] **Step 3: Run ALTER TABLE**

```bash
node -e "const Database = require('better-sqlite3'); const db = new Database('profit_club.db'); db.exec('CREATE TABLE scheduleOptimizations (id INTEGER PRIMARY KEY AUTOINCREMENT, masterId INTEGER NOT NULL, workDate TEXT NOT NULL, status TEXT NOT NULL DEFAULT \"draft\", createdAt TEXT NOT NULL, sentAt TEXT)'); db.exec('CREATE TABLE optimizationMoves (id INTEGER PRIMARY KEY AUTOINCREMENT, optimizationId INTEGER NOT NULL, appointmentId INTEGER NOT NULL, oldStartTime TEXT NOT NULL, oldEndTime TEXT NOT NULL, newStartTime TEXT NOT NULL, newEndTime TEXT NOT NULL, clientResponse TEXT NOT NULL DEFAULT \"pending\", sentAt TEXT)'); console.log('Done'); db.close();"
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(db): add scheduleOptimizations and optimizationMoves tables"
```

---

### Task 2: Core optimization algorithm

**Files:**
- Create: `lib/optimize-schedule.ts`

- [ ] **Step 1: Create pure algorithm**

Input: array of appointments (id, startTime, endTime, duration), shiftStart, shiftEnd.
Output: array of moves { appointmentId, oldStart, oldEnd, newStart, newEnd }.

Logic:
1. Sort appointments by startTime
2. Start cursor at shiftStart
3. For each appointment: if gap from cursor > 60 min, compact it (move to cursor + any min break)
4. Keep gaps < 30 min as-is (existing breaks)
5. Only generate a move if new time differs from old
6. Don't move appointments starting within 2 hours of now

Export: `computeOptimization(appointments, shiftStart, shiftEnd): Move[]`

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: core schedule optimization algorithm"
```

---

### Task 3: Optimization API endpoints

**Files:**
- Create: `app/api/admin/optimize-schedule/route.ts`
- Create: `app/api/admin/optimize-schedule/send/route.ts`
- Create: `app/api/admin/optimize-schedule/move/route.ts`
- Create: `app/api/admin/optimize-schedule/apply/route.ts`

- [ ] **Step 1: POST /api/admin/optimize-schedule — compute and save draft**

Receives `{ masterId, workDate }`. Runs algorithm. Saves `scheduleOptimizations` (status: "draft") + `optimizationMoves`. Returns the optimization with moves.

Also: GET returns list of optimizations for a master/date.

- [ ] **Step 2: POST /api/admin/optimize-schedule/send — send proposals to clients**

Receives `{ optimizationId }`. For each move with clientResponse="pending": sends Telegram message to client via CLIENT_BOT_TOKEN with accept/decline buttons (`opt_accept_<moveId>` / `opt_decline_<moveId>`). Updates optimization status to "sent", sets sentAt on moves.

Message format from spec:
```
🔄 Предложение о переносе

💇 <serviceName>
👩 <masterName>

❌ Текущее время: <oldStart>–<oldEnd>
✅ Предлагаемое: <newStart>–<newEnd>

Это позволит оптимизировать расписание мастера.

[✅ Согласиться] [❌ Оставить как есть]
```

- [ ] **Step 3: PATCH /api/admin/optimize-schedule/move — admin manual edit**

Receives `{ moveId, newStartTime, newEndTime }`. Updates the move's proposed times. Only for status="draft" or "sent" with clientResponse="pending".

- [ ] **Step 4: POST /api/admin/optimize-schedule/apply — apply accepted moves**

Receives `{ optimizationId }`. For each move with clientResponse="accepted": UPDATE appointment with new times, notify master. Set optimization status to "completed".

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(api): schedule optimization endpoints — compute, send, edit, apply"
```

---

### Task 4: Bot optimization callbacks

**Files:**
- Create: `telegram-bot/client/optimization-handler.ts`
- Modify: `telegram-bot/client-simple.ts`

- [ ] **Step 1: Create optimization-handler.ts**

Export `registerOptimizationHandlers(bot)`.

Handlers:
- `opt_accept_<moveId>`: update optimizationMoves.clientResponse = "accepted", edit message to "✅ Вы согласились на перенос...", notify admin (update UI)
- `opt_decline_<moveId>`: update clientResponse = "declined", edit message to "Запись остаётся на прежнем времени."

Both handlers: answerCbQuery, check move exists and is pending.

- [ ] **Step 2: Wire into client-simple.ts**

Add import and `registerOptimizationHandlers(bot)` after other handler registrations.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(bot): optimization accept/decline callbacks"
```

---

### Task 5: Admin UI — optimizer component

**Files:**
- Create: `components/AdminScheduleOptimizer.tsx`

- [ ] **Step 1: Create component**

"use client" component. Props: `masterId`, `workDate`, `onClose`.

States: loading, optimization data (moves), sending.

Flow:
1. On mount or button click: POST `/api/admin/optimize-schedule` to compute
2. Show two columns: "Сейчас" (current times) vs "Предложение" (new times)
3. Each move row: old time → new time, client name, service name
4. Admin can click a move to edit proposed time (inline input)
5. "Отправить предложения" button → POST send
6. After sending: show live statuses (pending/accepted/declined)
7. "Применить согласованные" button → POST apply
8. Show @username for declined clients (from appointments.clientTelegramId → link to t.me/)

Style: dark card matching admin design (violet/indigo accents). Modal or inline panel.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(admin): schedule optimizer UI component"
```

---

### Task 6: Integrate into admin page

**Files:**
- Modify: `app/admin/page.tsx`

- [ ] **Step 1: Add optimizer button to schedule view**

In the master day timeline, add a button "⚡ Оптимизировать" when there are appointments with gaps > 1 hour. Opens AdminScheduleOptimizer as a modal/panel.

- [ ] **Step 2: Add auto-optimization settings section**

Simple settings panel (can be in admin page or separate):
- Toggle: auto-optimization on/off
- Input: hours before day (default 24)
- Select: "Только показать" / "Авто-отправить"

Store in localStorage or a new admin settings table (localStorage simpler for now).

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(admin): add optimizer button and auto-settings to schedule"
```

---

### Task 7: Auto-optimization background job

**Files:**
- Modify: `telegram-bot/client-simple.ts` (or separate script)

- [ ] **Step 1: Add auto-optimization check to reminder loop**

In the existing reminder loop (runs every 5 min), add a check:
- Read auto-optimization settings (from DB or env)
- If enabled: for each master with confirmed workSlots tomorrow (or N hours ahead), check if optimization hasn't been computed yet
- If gaps > 1 hour exist: compute optimization, optionally auto-send

This piggybacks on the existing setInterval in client bot. Simpler than a separate process.

- [ ] **Step 2: Commit and push**

```bash
git commit -m "feat: auto-optimization in reminder loop"
git push origin main
```
