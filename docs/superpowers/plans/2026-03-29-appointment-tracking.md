# Appointment Status Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track appointment lifecycle from confirmed → in_progress → completed_by_master → completed with master/client notifications and auto-completion.

**Architecture:** Add fields to appointments table for tracking. Timer in existing reminder loop checks status transitions every minute. Masters bot handles "Завершить", client bot handles "Подтверждаю/Не согласен". Visual status in mini-app and admin panel.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, PostgreSQL, Telegraf (both bots).

---

### Task 1: Schema Changes

**Files:**
- Modify: `db/schema-postgres.ts`

- [ ] **Step 1: Add tracking fields to appointments**

In `db/schema-postgres.ts`, in the `appointments` table, add after the `createdAt` field:

```typescript
  completedByMasterAt: text("completedByMasterAt"),
  autoCompleted: boolean("autoCompleted").default(false).notNull(),
```

- [ ] **Step 2: Apply schema via SQL**

Run in Supabase SQL Editor:

```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "completedByMasterAt" text;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "autoCompleted" boolean NOT NULL DEFAULT false;
```

- [ ] **Step 3: Commit**

```bash
git add db/schema-postgres.ts
git commit -m "feat: add completedByMasterAt, autoCompleted to appointments schema"
```

---

### Task 2: Status Tracking Timer

**Files:**
- Create: `telegram-bot/client/status-tracker.ts`

This module runs in the reminder loop and handles 3 transitions:
1. confirmed → in_progress (at startTime)
2. in_progress → completed_by_master (15 min after endTime, auto)
3. completed_by_master → completed (1 hour after completedByMasterAt, auto)

- [ ] **Step 1: Create status-tracker.ts**

Create `telegram-bot/client/status-tracker.ts`:

```typescript
import { db } from "../../db/index-postgres";
import { appointments, services, masters } from "../../db/schema-postgres";
import { eq, and, inArray } from "drizzle-orm";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function getMastersBotToken(): string {
  return process.env.MASTERS_BOT_TOKEN || "";
}

function nowStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

async function sendMasterMessage(chatId: string, text: string, buttons?: any) {
  const body: any = { chat_id: chatId, text };
  if (buttons) body.reply_markup = { inline_keyboard: buttons };
  await fetch(`https://api.telegram.org/bot${getMastersBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendClientMessage(chatId: string, text: string, buttons?: any) {
  const body: any = { chat_id: chatId, text };
  if (buttons) body.reply_markup = { inline_keyboard: buttons };
  await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function notifyAdmin(text: string) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId || adminId === "123456789") return;
  await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: adminId, text }),
  });
}

export async function checkStatusTransitions(): Promise<void> {
  try {
    const today = nowStr();
    const nowMin = currentMinutes();

    // 1. confirmed → in_progress (startTime reached today)
    const confirmedToday = await db.select({
      id: appointments.id,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      clientName: appointments.clientName,
      clientTelegramId: appointments.clientTelegramId,
      serviceId: appointments.serviceId,
      masterId: appointments.masterId,
    }).from(appointments)
      .where(and(
        eq(appointments.appointmentDate, today),
        eq(appointments.status, "confirmed"),
      ));

    for (const apt of confirmedToday) {
      const aptMin = timeToMin(apt.startTime);
      if (nowMin >= aptMin) {
        // Transition to in_progress
        await db.update(appointments)
          .set({ status: "in_progress" })
          .where(eq(appointments.id, apt.id));

        // Notify master
        const [master] = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
          .from(masters).where(eq(masters.id, apt.masterId));
        const [svc] = await db.select({ name: services.name })
          .from(services).where(eq(services.id, apt.serviceId));

        if (master?.telegramId) {
          await sendMasterMessage(master.telegramId,
            `🔔 Запись началась!\n\n💇 ${svc?.name || "Услуга"} — ${apt.clientName}\n⏰ ${apt.startTime}–${apt.endTime}`,
            [[{ text: "✅ Завершить запись", callback_data: `complete_apt_${apt.id}` }]],
          );
        }
        console.log(`[status-tracker] apt ${apt.id} → in_progress`);
      }
    }

    // 2. in_progress → completed_by_master (15 min after endTime, auto)
    const inProgress = await db.select({
      id: appointments.id,
      endTime: appointments.endTime,
      clientName: appointments.clientName,
      clientTelegramId: appointments.clientTelegramId,
      serviceId: appointments.serviceId,
      masterId: appointments.masterId,
      startTime: appointments.startTime,
    }).from(appointments)
      .where(and(
        eq(appointments.appointmentDate, today),
        eq(appointments.status, "in_progress"),
      ));

    for (const apt of inProgress) {
      const endMin = timeToMin(apt.endTime);
      if (nowMin >= endMin + 15) {
        const now = new Date().toISOString();
        await db.update(appointments)
          .set({ status: "completed_by_master", completedByMasterAt: now })
          .where(eq(appointments.id, apt.id));

        // Notify client
        const [svc] = await db.select({ name: services.name })
          .from(services).where(eq(services.id, apt.serviceId));

        if (apt.clientTelegramId) {
          await sendClientMessage(apt.clientTelegramId,
            `✅ Ваша запись завершена\n\n💇 ${svc?.name || "Услуга"}\n⏰ ${apt.startTime}–${apt.endTime}\n\nПодтвердите завершение:`,
            [
              [{ text: "✅ Подтверждаю", callback_data: `confirm_complete_${apt.id}` }],
              [{ text: "❌ Не согласен", callback_data: `dispute_complete_${apt.id}` }],
            ],
          );
        }
        console.log(`[status-tracker] apt ${apt.id} → completed_by_master (auto)`);
      }
    }

    // 3. completed_by_master → completed (1 hour after completedByMasterAt)
    const awaitingConfirm = await db.select({
      id: appointments.id,
      completedByMasterAt: appointments.completedByMasterAt,
      clientName: appointments.clientName,
      serviceId: appointments.serviceId,
      masterId: appointments.masterId,
      startTime: appointments.startTime,
    }).from(appointments)
      .where(eq(appointments.status, "completed_by_master"));

    for (const apt of awaitingConfirm) {
      if (!apt.completedByMasterAt) continue;
      const completedAt = new Date(apt.completedByMasterAt).getTime();
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (completedAt <= hourAgo) {
        await db.update(appointments)
          .set({ status: "completed", autoCompleted: true })
          .where(eq(appointments.id, apt.id));

        // Notify admin
        const [svc] = await db.select({ name: services.name })
          .from(services).where(eq(services.id, apt.serviceId));
        const [master] = await db.select({ fullName: masters.fullName })
          .from(masters).where(eq(masters.id, apt.masterId));

        await notifyAdmin(
          `⚠️ Запись завершена автоматически — клиент не подтвердил\n\n💇 ${svc?.name || "Услуга"}\n👤 ${apt.clientName}\n👩 ${master?.fullName || "Мастер"}\n⏰ ${apt.startTime}`,
        );
        console.log(`[status-tracker] apt ${apt.id} → completed (auto, client no response)`);
      }
    }
  } catch (err) {
    console.error("[status-tracker] Error:", err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client/status-tracker.ts
git commit -m "feat: add appointment status tracker with auto-transitions"
```

---

### Task 3: Integrate Timer + Bot Handlers

**Files:**
- Modify: `telegram-bot/client-simple.ts`
- Modify: `telegram-bot/masters-bot-full.ts`

- [ ] **Step 1: Add status tracker to client bot reminder loop**

In `telegram-bot/client-simple.ts`, add import at the top (after other imports):

```typescript
import { checkStatusTransitions } from './client/status-tracker';
```

Find the line `startReminderLoop();` and add after it:

```typescript
// Status tracking loop — check every minute
setInterval(() => {
  checkStatusTransitions().catch(err => console.error('[status-tracker] loop error:', err));
}, 60_000);
console.log('[status-tracker] Loop started (every 1 min)');
```

- [ ] **Step 2: Add client confirm/dispute handlers to client bot**

In `telegram-bot/client-simple.ts`, before the `bot.action('about', ...)` handler, add:

```typescript
// ── Appointment completion confirm/dispute ──────────────────
bot.action(/^confirm_complete_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const aptId = parseInt(ctx.match[1]);
  await db.update(appointments)
    .set({ status: "completed" })
    .where(eq(appointments.id, aptId));
  try {
    await ctx.editMessageText("✅ Запись завершена! Спасибо за подтверждение.");
  } catch {}
});

bot.action(/^dispute_complete_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const aptId = parseInt(ctx.match[1]);
  // Notify admin about dispute
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (adminId && adminId !== "123456789") {
    const [apt] = await db.select({
      clientName: appointments.clientName,
      serviceId: appointments.serviceId,
      masterId: appointments.masterId,
      startTime: appointments.startTime,
      appointmentDate: appointments.appointmentDate,
    }).from(appointments).where(eq(appointments.id, aptId));

    if (apt) {
      const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
      const [master] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt.masterId));
      const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminId,
          text: `⚠️ Клиент не согласен с завершением записи!\n\n👤 ${apt.clientName}\n💇 ${svc?.name || "Услуга"}\n👩 ${master?.fullName || "Мастер"}\n📅 ${apt.appointmentDate} ${apt.startTime}`,
        }),
      });
    }
  }
  try {
    await ctx.editMessageText("📨 Ваше обращение отправлено администратору. Мы свяжемся с вами.");
  } catch {}
});
```

- [ ] **Step 3: Add "complete" handler to masters bot**

In `telegram-bot/masters-bot-full.ts`, before the `// ── Callback queries` section, add:

```typescript
// ── Complete appointment ─────────────────────────────────────

bot.action(/^complete_apt_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const aptId = parseInt(ctx.match[1]);

  const [apt] = await db.select({
    id: appointments.id,
    status: appointments.status,
    clientName: appointments.clientName,
    clientTelegramId: appointments.clientTelegramId,
    serviceId: appointments.serviceId,
    startTime: appointments.startTime,
    endTime: appointments.endTime,
  }).from(appointments).where(eq(appointments.id, aptId));

  if (!apt || (apt.status !== "in_progress" && apt.status !== "confirmed")) {
    try { await ctx.editMessageText("❌ Запись уже завершена или не найдена."); } catch {}
    return;
  }

  const now = new Date().toISOString();
  await db.update(appointments)
    .set({ status: "completed_by_master", completedByMasterAt: now })
    .where(eq(appointments.id, aptId));

  // Notify client
  if (apt.clientTelegramId) {
    const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
    const clientBotToken = process.env.TELEGRAM_BOT_TOKEN || "";
    await fetch(`https://api.telegram.org/bot${clientBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: apt.clientTelegramId,
        text: `✅ Мастер завершил вашу запись\n\n💇 ${svc?.name || "Услуга"}\n⏰ ${apt.startTime}–${apt.endTime}\n\nПодтвердите завершение:`,
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Подтверждаю", callback_data: `confirm_complete_${aptId}` }],
            [{ text: "❌ Не согласен", callback_data: `dispute_complete_${aptId}` }],
          ],
        },
      }),
    });
  }

  try {
    await ctx.editMessageText(
      `✅ Запись завершена!\n\n💇 ${apt.clientName}\n⏰ ${apt.startTime}–${apt.endTime}\n\nКлиенту отправлен запрос на подтверждение.`,
      Markup.inlineKeyboard([[Markup.button.callback("🏠 Главное меню", "go_main")]]),
    );
  } catch {}
});
```

- [ ] **Step 4: Commit**

```bash
git add telegram-bot/client-simple.ts telegram-bot/masters-bot-full.ts
git commit -m "feat: add appointment complete/confirm handlers to both bots"
```

---

### Task 4: Visual Status in Master Mini-App

**Files:**
- Modify: `components/master/MasterDaySchedule.tsx`

- [ ] **Step 1: Add status colors and badges**

In `components/master/MasterDaySchedule.tsx`, add a status config object after the imports:

```typescript
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  confirmed: { color: "#9CA3AF", label: "Подтверждена" },
  in_progress: { color: "#3B82F6", label: "В процессе" },
  completed_by_master: { color: "#F59E0B", label: "Ожидает подтверждения" },
  completed: { color: "#22C55E", label: "Завершена" },
};
```

Update the `Appointment` interface — add `status` and `autoCompleted`:

```typescript
interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  clientTelegramId?: string;
  clientNote?: string;
  status?: string;
  autoCompleted?: boolean;
}
```

In the appointment card rendering, replace `style={{ borderLeft: "3px solid #B2223C" }}` with dynamic color based on status:

```typescript
const statusCfg = STATUS_CONFIG[apt.status || "confirmed"] || STATUS_CONFIG.confirmed;
```

Use `statusCfg.color` for borderLeft:

```typescript
style={{ borderLeft: `3px solid ${statusCfg.color}` }}
```

After the service name div, add a status badge:

```tsx
<div className="flex items-center gap-1 mt-1">
  <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
  <span className="text-[9px] font-medium" style={{ color: statusCfg.color }}>
    {statusCfg.label}{apt.autoCompleted ? " (авто)" : ""}
  </span>
</div>
```

- [ ] **Step 2: Update MasterApp interface**

In `components/master/MasterApp.tsx`, add `status` and `autoCompleted` to the Appointment interface:

```typescript
interface Appointment {
  id: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  clientTelegramId?: string;
  clientNote?: string;
  serviceName: string;
  status?: string;
  autoCompleted?: boolean;
}
```

- [ ] **Step 3: Update schedule API to return status fields**

In `app/api/master/schedule/route.ts`, add `autoCompleted` to the select:

After `status: appointments.status,` add:

```typescript
        autoCompleted: appointments.autoCompleted,
```

Remove the filter `eq(appointments.status, "confirmed")` from the where clause — we now want ALL statuses except cancelled:

Replace the where clause for weekAppointments. Remove `eq(appointments.status, "confirmed")`. Instead, keep all appointments (they're all relevant for the schedule view).

The where should be:

```typescript
      .where(
        and(
          eq(appointments.masterId, masterId),
          gte(appointments.appointmentDate, week.start),
          lte(appointments.appointmentDate, week.end),
        )
      );
```

- [ ] **Step 4: Commit**

```bash
git add components/master/MasterDaySchedule.tsx components/master/MasterApp.tsx app/api/master/schedule/route.ts
git commit -m "feat: visual status colors and badges in master mini-app schedule"
```

---

### Task 5: Visual Status in Admin Panel

**Files:**
- Modify: `app/(app)/admin/page.tsx`

- [ ] **Step 1: Update admin query to include all statuses**

In `app/(app)/admin/page.tsx`, find the appointments query that filters by `eq(appointments.status, "confirmed")`. Change it to show all non-cancelled appointments. Remove the status filter or change to:

```typescript
// Remove: eq(appointments.status, "confirmed")
// Keep the rest of the where clause
```

Add `autoCompleted` to the select fields for appointments.

- [ ] **Step 2: Add status colors to admin appointment cards**

Add the same STATUS_CONFIG at the top of the component:

```typescript
const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  confirmed: { color: "#9CA3AF", label: "Подтверждена", bg: "rgba(156,163,175,0.1)" },
  in_progress: { color: "#3B82F6", label: "В процессе", bg: "rgba(59,130,246,0.1)" },
  completed_by_master: { color: "#F59E0B", label: "Ожидает подтверждения", bg: "rgba(245,158,11,0.1)" },
  completed: { color: "#22C55E", label: "Завершена", bg: "rgba(34,197,94,0.1)" },
};
```

On appointment blocks in the timeline, add a colored left border and status badge pill.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/admin/page.tsx
git commit -m "feat: appointment status colors and badges in admin panel"
```

---

### Task 6: Update Masters Bot Schedule Display

**Files:**
- Modify: `telegram-bot/masters-bot-full.ts`

- [ ] **Step 1: Add status emoji to schedule text**

In the `showSchedule` function, where appointments are listed, add status emoji before each appointment line. Find the line:

```typescript
msg += `${apt.startTime}–${apt.endTime} 💇 ${apt.serviceName || 'Услуга'} — ${clientShort}\n`;
```

Replace with:

```typescript
const statusEmoji = apt.status === 'in_progress' ? '🔵' : apt.status === 'completed_by_master' ? '🟡' : apt.status === 'completed' ? '✅' : '⬜';
msg += `${statusEmoji} ${apt.startTime}–${apt.endTime} 💇 ${apt.serviceName || 'Услуга'} — ${clientShort}\n`;
```

Also need to add `status` to the appointments select in `showSchedule`. Add to the select:

```typescript
status: appointments.status,
```

And remove `eq(appointments.status, 'confirmed')` from the where clause so all statuses show.

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/masters-bot-full.ts
git commit -m "feat: show status emoji in masters bot schedule"
```

---

### Task 7: Build & Push

- [ ] **Step 1: Build**

```bash
npm run build
```

- [ ] **Step 2: Push**

```bash
git add -A
git commit -m "feat: appointment status tracking — complete flow with auto-completion"
git push origin main
```
