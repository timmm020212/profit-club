# Optimization Master Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add master approval step to optimization flow — master approves/declines each move before it's sent to clients.

**Architecture:** Add `masterRespondedAt` field to `optimizationMoves`. Change `clientResponse` values to support 7 statuses. Master bot gets new handlers. Send endpoint supports `sendTo=master|client`. Admin UI gets two-stage buttons and 7 status badges. Auto-optimize sends to master first.

**Tech Stack:** Next.js 15, TypeScript, Drizzle ORM, PostgreSQL, Telegraf.

---

### Task 1: Schema Change

**Files:**
- Modify: `db/schema-postgres.ts`

- [ ] **Step 1: Add masterRespondedAt to optimizationMoves**

In `db/schema-postgres.ts`, in the `optimizationMoves` table, add after `sentAt`:

```typescript
  masterRespondedAt: text("masterRespondedAt"),
```

- [ ] **Step 2: Apply via SQL in Supabase**

```sql
ALTER TABLE "optimizationMoves" ADD COLUMN IF NOT EXISTS "masterRespondedAt" text;
```

- [ ] **Step 3: Commit**

```bash
git add db/schema-postgres.ts
git commit -m "feat: add masterRespondedAt to optimizationMoves"
```

---

### Task 2: Master Bot Handlers

**Files:**
- Modify: `telegram-bot/masters-bot-full.ts`

Add handlers for `opt_master_accept_[moveId]` and `opt_master_decline_[moveId]` before the `// ── Callback queries` section.

- [ ] **Step 1: Add master optimization handlers**

In `telegram-bot/masters-bot-full.ts`, before `// ── Complete appointment`, add:

```typescript
// ── Optimization master approval ─────────────────────────────

bot.action(/^opt_master_accept_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const moveId = parseInt(ctx.match[1]);

  const [move] = await db.select().from(optimizationMoves).where(eq(optimizationMoves.id, moveId));
  if (!move || move.clientResponse !== "awaiting_master") {
    try { await ctx.editMessageText("Это предложение уже обработано."); } catch {}
    return;
  }

  await db.update(optimizationMoves)
    .set({ clientResponse: "master_accepted", masterRespondedAt: new Date().toISOString() })
    .where(eq(optimizationMoves.id, moveId));

  try {
    await ctx.editMessageText(
      `✅ Перенос одобрен!\n\n🕐 ${move.oldStartTime}–${move.oldEndTime} → ${move.newStartTime}–${move.newEndTime}\n\nПредложение будет отправлено клиенту.`,
      Markup.inlineKeyboard([[Markup.button.callback("🏠 Главное меню", "go_main")]]),
    );
  } catch {}
});

bot.action(/^opt_master_decline_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const moveId = parseInt(ctx.match[1]);

  const [move] = await db.select().from(optimizationMoves).where(eq(optimizationMoves.id, moveId));
  if (!move || move.clientResponse !== "awaiting_master") {
    try { await ctx.editMessageText("Это предложение уже обработано."); } catch {}
    return;
  }

  await db.update(optimizationMoves)
    .set({ clientResponse: "master_declined", masterRespondedAt: new Date().toISOString() })
    .where(eq(optimizationMoves.id, moveId));

  try {
    await ctx.editMessageText(
      `❌ Перенос отклонён\n\n🕐 Запись остаётся на ${move.oldStartTime}–${move.oldEndTime}`,
      Markup.inlineKeyboard([[Markup.button.callback("🏠 Главное меню", "go_main")]]),
    );
  } catch {}
});
```

Also add `optimizationMoves` to the imports at the top of the file. Find:

```typescript
import { masters, workSlots, appointments, services, workSlotChangeRequests, botFlows, botSteps } from '../db/schema-postgres';
```

Replace with:

```typescript
import { masters, workSlots, appointments, services, workSlotChangeRequests, botFlows, botSteps, optimizationMoves } from '../db/schema-postgres';
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/masters-bot-full.ts
git commit -m "feat: add master optimization approve/decline handlers"
```

---

### Task 3: Send Endpoint — Two-Stage Support

**Files:**
- Modify: `app/api/admin/optimize-schedule/send/route.ts`

The endpoint now accepts `sendTo: "master" | "client"`. When `sendTo=master`, it sends proposals to the master via MASTERS_BOT_TOKEN and sets status to `awaiting_master`. When `sendTo=client`, it only sends `master_accepted` moves to clients and sets their status to `sent_to_client`.

- [ ] **Step 1: Rewrite the send endpoint**

Replace the entire content of `app/api/admin/optimize-schedule/send/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  scheduleOptimizations,
  optimizationMoves,
  appointments,
  services,
  masters,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org/bot";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { optimizationId, sendTo = "master" } = body;

    if (!optimizationId) {
      return NextResponse.json({ error: "optimizationId is required" }, { status: 400 });
    }

    const [optimization] = await db.select().from(scheduleOptimizations)
      .where(eq(scheduleOptimizations.id, optimizationId));
    if (!optimization) {
      return NextResponse.json({ error: "Optimization not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const sendResults: any[] = [];

    if (sendTo === "master") {
      // Send to master — filter pending (draft) moves
      const moves = await db.select({
        moveId: optimizationMoves.id,
        appointmentId: optimizationMoves.appointmentId,
        oldStartTime: optimizationMoves.oldStartTime,
        oldEndTime: optimizationMoves.oldEndTime,
        newStartTime: optimizationMoves.newStartTime,
        newEndTime: optimizationMoves.newEndTime,
        clientResponse: optimizationMoves.clientResponse,
      }).from(optimizationMoves)
        .where(and(
          eq(optimizationMoves.optimizationId, optimizationId),
          eq(optimizationMoves.clientResponse, "pending"),
        ));

      if (moves.length === 0) {
        return NextResponse.json({ error: "No pending moves" }, { status: 400 });
      }

      // Get master info
      const [master] = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
        .from(masters).where(eq(masters.id, optimization.masterId));

      if (!master?.telegramId) {
        return NextResponse.json({ error: "Master has no Telegram ID" }, { status: 400 });
      }

      const mastersBotToken = process.env.MASTERS_BOT_TOKEN;
      if (!mastersBotToken) {
        return NextResponse.json({ error: "MASTERS_BOT_TOKEN not configured" }, { status: 500 });
      }

      for (const move of moves) {
        // Get appointment details
        const [apt] = await db.select({ clientName: appointments.clientName, serviceId: appointments.serviceId })
          .from(appointments).where(eq(appointments.id, move.appointmentId));
        const [svc] = apt ? await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId)) : [null];

        const text =
          `🔄 Предложение по оптимизации\n\n` +
          `💇 ${svc?.name || "Услуга"} — ${apt?.clientName || "Клиент"}\n` +
          `❌ Сейчас: ${move.oldStartTime}–${move.oldEndTime}\n` +
          `✅ Предлагается: ${move.newStartTime}–${move.newEndTime}\n\n` +
          `Согласны на перенос?`;

        try {
          const res = await fetch(`${TELEGRAM_API}${mastersBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: master.telegramId,
              text,
              reply_markup: { inline_keyboard: [[
                { text: "✅ Согласен", callback_data: `opt_master_accept_${move.moveId}` },
                { text: "❌ Отклонить", callback_data: `opt_master_decline_${move.moveId}` },
              ]] },
            }),
          });
          const result = await res.json();
          if (result.ok) {
            await db.update(optimizationMoves)
              .set({ clientResponse: "awaiting_master", sentAt: now })
              .where(eq(optimizationMoves.id, move.moveId));
            sendResults.push({ moveId: move.moveId, status: "sent_to_master" });
          } else {
            sendResults.push({ moveId: move.moveId, status: "failed", reason: result.description });
          }
        } catch (err) {
          sendResults.push({ moveId: move.moveId, status: "failed", reason: String(err) });
        }
      }

      await db.update(scheduleOptimizations)
        .set({ status: "sent", sentAt: now })
        .where(eq(scheduleOptimizations.id, optimizationId));

    } else if (sendTo === "client") {
      // Send to clients — only master_accepted moves
      const moves = await db.select({
        moveId: optimizationMoves.id,
        appointmentId: optimizationMoves.appointmentId,
        oldStartTime: optimizationMoves.oldStartTime,
        oldEndTime: optimizationMoves.oldEndTime,
        newStartTime: optimizationMoves.newStartTime,
        newEndTime: optimizationMoves.newEndTime,
      }).from(optimizationMoves)
        .where(and(
          eq(optimizationMoves.optimizationId, optimizationId),
          eq(optimizationMoves.clientResponse, "master_accepted"),
        ));

      if (moves.length === 0) {
        return NextResponse.json({ error: "No master-accepted moves to send" }, { status: 400 });
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
      }

      for (const move of moves) {
        const [apt] = await db.select({
          clientTelegramId: appointments.clientTelegramId,
          clientName: appointments.clientName,
          serviceId: appointments.serviceId,
        }).from(appointments).where(eq(appointments.id, move.appointmentId));

        if (!apt?.clientTelegramId) {
          sendResults.push({ moveId: move.moveId, status: "skipped", reason: "no telegramId" });
          continue;
        }

        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
        const [master] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, optimization.masterId));

        const text =
          `🔄 Предложение о переносе\n\n` +
          `💇 ${svc?.name || "Услуга"}\n` +
          `👩 ${master?.fullName || "Мастер"}\n\n` +
          `❌ Текущее время: ${move.oldStartTime}–${move.oldEndTime}\n` +
          `✅ Предлагаемое: ${move.newStartTime}–${move.newEndTime}\n\n` +
          `Это позволит оптимизировать расписание мастера.`;

        try {
          const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: apt.clientTelegramId,
              text,
              reply_markup: { inline_keyboard: [[
                { text: "✅ Согласиться", callback_data: `opt_accept_${move.moveId}` },
                { text: "❌ Оставить как есть", callback_data: `opt_decline_${move.moveId}` },
              ]] },
            }),
          });
          const result = await res.json();
          if (result.ok) {
            await db.update(optimizationMoves)
              .set({ clientResponse: "sent_to_client", sentAt: now })
              .where(eq(optimizationMoves.id, move.moveId));
            sendResults.push({ moveId: move.moveId, status: "sent_to_client" });
          } else {
            sendResults.push({ moveId: move.moveId, status: "failed", reason: result.description });
          }
        } catch (err) {
          sendResults.push({ moveId: move.moveId, status: "failed", reason: String(err) });
        }
      }
    }

    return NextResponse.json({ optimizationId, sendTo, results: sendResults });
  } catch (error) {
    console.error("optimize-schedule/send POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/optimize-schedule/send/route.ts
git commit -m "feat: two-stage send (master then client) for optimization"
```

---

### Task 4: Update Client Optimization Handler

**Files:**
- Modify: `telegram-bot/client/optimization-handler.ts`

Change `clientResponse` check from `"pending"` to `"sent_to_client"` since that's the new status when proposals reach clients.

- [ ] **Step 1: Update status checks**

In `telegram-bot/client/optimization-handler.ts`, find both occurrences of:

```typescript
if (!moveRows.length || moveRows[0].clientResponse !== "pending") {
```

Replace both with:

```typescript
if (!moveRows.length || moveRows[0].clientResponse !== "sent_to_client") {
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client/optimization-handler.ts
git commit -m "fix: check sent_to_client status in client optimization handler"
```

---

### Task 5: Update Admin UI — Status Badges & Two-Stage Buttons

**Files:**
- Modify: `components/AdminScheduleOptimizer.tsx`

- [ ] **Step 1: Update statusBadge function**

Find the `statusBadge` function and replace it entirely with:

```typescript
const statusBadge = (status: string) => {
  const configs: Record<string, { bg: string; border: string; text: string; label: string }> = {
    pending: { bg: "bg-zinc-500/[0.08]", border: "border-zinc-500/15", text: "text-zinc-400", label: "Черновик" },
    awaiting_master: { bg: "bg-violet-500/[0.08]", border: "border-violet-500/15", text: "text-violet-400", label: "Ожидает мастера" },
    master_accepted: { bg: "bg-blue-500/[0.08]", border: "border-blue-500/15", text: "text-blue-400", label: "Мастер одобрил" },
    master_declined: { bg: "bg-red-500/[0.08]", border: "border-red-500/15", text: "text-red-400", label: "Отклонено мастером" },
    sent_to_client: { bg: "bg-amber-500/[0.08]", border: "border-amber-500/15", text: "text-amber-400", label: "Отправлено клиенту" },
    sent: { bg: "bg-amber-500/[0.08]", border: "border-amber-500/15", text: "text-amber-400", label: "Ожидает клиента" },
    accepted: { bg: "bg-emerald-500/[0.08]", border: "border-emerald-500/15", text: "text-emerald-400", label: "Клиент согласен" },
    declined: { bg: "bg-red-500/[0.08]", border: "border-red-500/15", text: "text-red-400", label: "Клиент отказался" },
  };
  const cfg = configs[status] || configs.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg ${cfg.bg} border ${cfg.border} px-2 py-0.5 text-[10px] font-medium ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};
```

- [ ] **Step 2: Update buttons section**

Find the buttons section. Replace the `hasPending` send button with two-stage buttons. Find:

```typescript
{hasPending && (
  <button
    type="button"
    onClick={handleSendProposals}
```

Replace the entire `hasPending` button block with:

```tsx
{hasPending && (
  <button
    type="button"
    onClick={() => handleSendToMaster()}
    disabled={sending}
    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-violet-900/25"
  >
    {sending ? "Отправляем..." : "Отправить мастеру"}
  </button>
)}

{hasMasterAccepted && (
  <button
    type="button"
    onClick={() => handleSendToClients()}
    disabled={sending}
    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-amber-900/25"
  >
    {sending ? "Отправляем..." : "Отправить клиентам"}
  </button>
)}
```

- [ ] **Step 3: Add handler functions and state variables**

Add these variables where `hasPending`, `hasSent` etc. are computed:

```typescript
const hasMasterAccepted = optimization?.moves.some((m: any) => m.status === "master_accepted");
```

Add these handler functions near `handleSendProposals`:

```typescript
const handleSendToMaster = async () => {
  if (!optimization) return;
  setSending(true);
  try {
    await fetch("/api/admin/optimize-schedule/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optimizationId: optimization.id, sendTo: "master" }),
    });
    await fetchOptimization();
  } catch (e) { console.error(e); }
  setSending(false);
};

const handleSendToClients = async () => {
  if (!optimization) return;
  setSending(true);
  try {
    await fetch("/api/admin/optimize-schedule/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optimizationId: optimization.id, sendTo: "client" }),
    });
    await fetchOptimization();
  } catch (e) { console.error(e); }
  setSending(false);
};
```

- [ ] **Step 4: Commit**

```bash
git add components/AdminScheduleOptimizer.tsx
git commit -m "feat: 7 status badges and two-stage buttons in admin optimizer"
```

---

### Task 6: Update Auto-Optimize to Send to Master First

**Files:**
- Modify: `telegram-bot/client/reminders.ts`

- [ ] **Step 1: Change auto-optimize to send to master**

In `telegram-bot/client/reminders.ts`, find the auto-optimize section where draft delay passes and moves are sent. Change it to send to **master** instead of client.

Find the block that starts with `// Send all pending moves` and sends to `apt.clientTelegramId`. Replace it to send to master's telegramId via MASTERS_BOT_TOKEN with `opt_master_accept_/opt_master_decline_` callbacks, and set `clientResponse` to `"awaiting_master"` instead of keeping `"pending"`.

Replace from `// Send all pending moves` through the `sentAt` update to:

```typescript
              // Send to master first (not client)
              const mastersBotToken = process.env.MASTERS_BOT_TOKEN || "";
              for (const move of pendingMoves) {
                const [apt] = await db.select().from(appointments).where(and(eq(appointments.id, move.appointmentId), eq(appointments.status, "confirmed")));
                if (!apt) continue;
                const [svc] = await db.select().from(services).where(eq(services.id, apt.serviceId));

                const text =
                  `🔄 Предложение по оптимизации\n\n` +
                  `💇 ${svc?.name || "Услуга"} — ${apt.clientName || "Клиент"}\n` +
                  `❌ Сейчас: ${move.oldStartTime}–${move.oldEndTime}\n` +
                  `✅ Предлагается: ${move.newStartTime}–${move.newEndTime}\n\n` +
                  `Согласны на перенос?`;

                try {
                  await fetch(`https://api.telegram.org/bot${mastersBotToken}/sendMessage`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: master.telegramId,
                      text,
                      reply_markup: { inline_keyboard: [[
                        { text: "✅ Согласен", callback_data: `opt_master_accept_${move.id}` },
                        { text: "❌ Отклонить", callback_data: `opt_master_decline_${move.id}` },
                      ]] },
                    }),
                  });
                  await db.update(optimizationMoves).set({ clientResponse: "awaiting_master", sentAt: new Date().toISOString() }).where(eq(optimizationMoves.id, move.id));
                } catch {}
              }
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client/reminders.ts
git commit -m "feat: auto-optimize sends to master first, not client"
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
git commit -m "feat: optimization master approval — complete flow"
git push origin main
```
