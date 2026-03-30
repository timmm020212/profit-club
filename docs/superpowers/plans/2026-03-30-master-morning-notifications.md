# Master Morning Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send each master a daily summary (breaks + early finish) at the start of their shift, replacing instant break notifications.

**Architecture:** New cron endpoint `/api/cron/master-morning` called every 5 minutes. It finds masters whose shift starts within the last 5 minutes, checks deduplication via `reminderSent`, collects breaks/appointments, and sends a Telegram message via `MASTERS_BOT_TOKEN`.

**Tech Stack:** Next.js API route, Drizzle ORM, PostgreSQL, Telegram Bot API

---

### Task 1: Remove instant break notification from schedule-block API

**Files:**
- Modify: `app/api/admin/schedule-block/route.ts:92-99`

- [ ] **Step 1: Remove break notification code**

In `app/api/admin/schedule-block/route.ts`, replace the block notification section inside the `else` branch (non-appointment block creation) — remove the Telegram notification but keep the insert and return:

```typescript
// REPLACE lines 92-99 (from "console.log..." to the closing "}")
// Remove:
      console.log("schedule-block: master lookup result", { masterIdNum, telegramId: master?.telegramId, blockType });
      if (master?.telegramId) {
        const icon = blockType === "break" ? "☕" : "📌";
        const label = blockType === "break" ? "Перерыв запланирован" : blockType;
        await notifyMaster(master.telegramId,
          `${icon} ${label}\n\n⏰ ${startTime}–${endTime}\n📅 ${date}${comment ? `\n📝 ${comment}` : ""}`,
        );
      }
// Keep the return statement that follows
```

- [ ] **Step 2: Verify the appointment branch notification is untouched**

The `if (blockType === "appointment")` branch (lines 46-72) still sends notifications about new direct appointments — this must NOT be removed. Verify it's still intact.

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/schedule-block/route.ts
git commit -m "refactor: remove instant break notification from schedule-block API

Breaks will now be communicated via morning summary notification."
```

---

### Task 2: Create the master-morning cron endpoint

**Files:**
- Create: `app/api/cron/master-morning/route.ts`

- [ ] **Step 1: Create the cron route file**

Create `app/api/cron/master-morning/route.ts` with this content:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlots, scheduleBlocks, appointments, masters, reminderSent } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function getMoscowNow(): Date {
  // Create a date string in Moscow timezone, then parse it back
  const now = new Date();
  const moscowStr = now.toLocaleString("en-US", { timeZone: "Europe/Moscow" });
  return new Date(moscowStr);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

function getMasterSettings(settingsJson: string | null): Record<string, boolean> {
  const defaults: Record<string, boolean> = {
    newAppointments: true,
    cancellations: true,
    breaks: true,
    morningReminder: false,
  };
  if (!settingsJson) return defaults;
  try {
    return { ...defaults, ...JSON.parse(settingsJson) };
  } catch {
    return defaults;
  }
}

async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const token = process.env.MASTERS_BOT_TOKEN;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const moscowNow = getMoscowNow();
    const todayStr = `${moscowNow.getFullYear()}-${String(moscowNow.getMonth() + 1).padStart(2, "0")}-${String(moscowNow.getDate()).padStart(2, "0")}`;
    const nowMinutes = moscowNow.getHours() * 60 + moscowNow.getMinutes();

    // Get all confirmed work slots for today
    const todaySlots = await db.select().from(workSlots)
      .where(and(eq(workSlots.workDate, todayStr), eq(workSlots.isConfirmed, true)));

    let sent = 0;

    for (const slot of todaySlots) {
      const slotStartMin = timeToMinutes(slot.startTime);

      // Check if slot starts within [now - 5min, now]
      if (slotStartMin < nowMinutes - 5 || slotStartMin > nowMinutes) continue;

      // Deduplication: check reminderSent (use negative masterId as appointmentId)
      const dedupeId = -slot.masterId;
      const existing = await db.select().from(reminderSent)
        .where(and(
          eq(reminderSent.appointmentId, dedupeId),
          eq(reminderSent.reminderType, "master_morning"),
        ));
      // Filter by today's date in sentAt
      const alreadySent = existing.some((r) => r.sentAt.startsWith(todayStr));
      if (alreadySent) continue;

      // Check master settings
      const [master] = await db.select({
        telegramId: masters.telegramId,
        fullName: masters.fullName,
        notificationSettings: masters.notificationSettings,
      }).from(masters).where(eq(masters.id, slot.masterId));

      if (!master?.telegramId) continue;

      const settings = getMasterSettings(master.notificationSettings);
      if (!settings.morningReminder) continue;

      // Collect breaks
      const breaks = await db.select().from(scheduleBlocks)
        .where(and(eq(scheduleBlocks.blockDate, todayStr), eq(scheduleBlocks.masterId, slot.masterId)));

      // Collect confirmed appointments
      const apps = await db.select().from(appointments)
        .where(and(
          eq(appointments.appointmentDate, todayStr),
          eq(appointments.masterId, slot.masterId),
          eq(appointments.status, "confirmed"),
        ));

      // Build message
      const dateFormatted = formatDateRu(todayStr);
      let msg = `📋 Ваш день на сегодня\n\n📅 ${dateFormatted}, ${slot.startTime}–${slot.endTime}`;

      // Breaks section
      if (breaks.length > 0) {
        const breakLines = breaks
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((b) => `• ${b.startTime}–${b.endTime}`)
          .join("\n");
        msg += `\n\n☕ Перерывы:\n${breakLines}`;
      }

      // Appointments / early finish section
      if (apps.length === 0) {
        msg += "\n\n📝 Записей пока нет";
      } else {
        const lastEndTime = apps
          .map((a) => a.endTime)
          .sort()
          .pop()!;
        const lastEndMin = timeToMinutes(lastEndTime);
        const shiftEndMin = timeToMinutes(slot.endTime);

        if (lastEndMin < shiftEndMin) {
          msg += `\n\n🏁 Последняя запись заканчивается в ${lastEndTime}\n   Свободны с ${lastEndTime} (смена до ${slot.endTime})`;
        }
      }

      // Send
      const ok = await sendTelegram(master.telegramId, msg);
      if (ok) {
        await db.insert(reminderSent).values({
          appointmentId: dedupeId,
          sentAt: new Date().toISOString(),
          reminderType: "master_morning",
        });
        sent++;
        console.log(`Morning notification sent to ${master.fullName}`);
      }
    }

    return NextResponse.json({ ok: true, sent, date: todayStr });
  } catch (error) {
    console.error("master-morning cron error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit 2>&1 | grep "master-morning"
```
Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/master-morning/route.ts
git commit -m "feat: add master morning notification cron endpoint

Sends daily summary with breaks and early finish info at shift start.
Deduplicates via reminderSent table. Checks morningReminder setting."
```

---

### Task 3: Manual test

- [ ] **Step 1: Test the endpoint locally**

To test without waiting for the time window, temporarily widen the window or call with a master whose shift starts now. Use curl:

```bash
curl http://localhost:3000/api/cron/master-morning
```

Expected: `{"ok":true,"sent":0,"date":"2026-03-30"}` (sent=0 is fine if no shifts start right now or morningReminder is off).

- [ ] **Step 2: Verify in server logs**

Check the Next.js terminal for any errors. If a master's shift starts in the window and `morningReminder` is enabled, you should see:
```
Morning notification sent to [Master Name]
```

- [ ] **Step 3: Commit any fixes if needed**

If any issues found, fix and commit:
```bash
git add -A
git commit -m "fix: master morning notification adjustments from testing"
```
