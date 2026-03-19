# Duration Fix & Break Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix duration display in admin, show break gaps visually, notify master about breaks.

**Architecture:** API already calculates endTime correctly. Fix is in admin page rendering (gap detection) + notify-master module (break notification).

**Spec:** `docs/superpowers/specs/2026-03-19-duration-breaks-design.md`

---

## File Structure

```
app/admin/page.tsx                          — MODIFY: add break gap rendering between appointments
telegram-bot/client/notify-master.ts        — MODIFY: add notifyMasterBreak function
telegram-bot/client/booking-flow.ts         — MODIFY: call notifyMasterBreak after creating appointment
app/api/appointments/route.ts               — MODIFY: call break notification after POST
```

---

### Task 1: Visual break gaps in admin schedule

**Files:**
- Modify: `app/admin/page.tsx` (appointment rendering section ~lines 280-366)

- [ ] **Step 1: Read the admin page and understand appointment block rendering**

The admin page renders appointment cards as absolute-positioned blocks within master columns. `PX_PER_MIN = 2.5`. Position: `top = (appStart - roundedMin) * PX_PER_MIN`, `height = (appEnd - appStart) * PX_PER_MIN`.

- [ ] **Step 2: Add break gap detection and rendering**

After rendering appointment blocks for each master, detect gaps:
1. Sort confirmed appointments by startTime
2. For each consecutive pair: if `endTime[i] < startTime[i+1]` and gap < 30 min — render a break block
3. Break block: same absolute positioning as appointments, but with dashed border, gray bg, "☕ Перерыв" text

Style:
```
border: 1px dashed rgba(255,255,255,0.15)
background: rgba(255,255,255,0.02)
color: rgba(255,255,255,0.3)
font-size: 10px
text: "☕ Перерыв" + duration in minutes
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/page.tsx
git commit -m "feat(admin): show break gaps between appointments in schedule"
```

---

### Task 2: Break notification function

**Files:**
- Modify: `telegram-bot/client/notify-master.ts`

- [ ] **Step 1: Add notifyMasterBreak function**

```typescript
export async function notifyMasterBreak(opts: {
  masterTelegramId: string | null;
  appointmentDate: string;
  breakStart: string;  // HH:MM
  breakEnd: string;    // HH:MM
  breakMinutes: number;
}) {
  if (!opts.masterTelegramId) return;
  const date = formatDateRu(opts.appointmentDate);
  const text =
    `☕ Перерыв ${opts.breakMinutes} мин\n\n` +
    `📅 ${date}\n` +
    `🕐 ${opts.breakStart}–${opts.breakEnd}`;
  await sendToMaster(opts.masterTelegramId, text);
}
```

- [ ] **Step 2: Add break detection helper**

```typescript
export function detectBreaks(
  appointments: { startTime: string; endTime: string }[],
  slotInterval: number = 30
): { breakStart: string; breakEnd: string; breakMinutes: number }[] {
  // Sort by startTime
  const sorted = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const breaks: { breakStart: string; breakEnd: string; breakMinutes: number }[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const endMin = timeToMinutes(sorted[i].endTime);
    const nextStartMin = timeToMinutes(sorted[i + 1].startTime);
    const gap = nextStartMin - endMin;
    if (gap > 0 && gap < slotInterval) {
      breaks.push({
        breakStart: sorted[i].endTime,
        breakEnd: sorted[i + 1].startTime,
        breakMinutes: gap,
      });
    }
  }
  return breaks;
}
```

Need to import `timeToMinutes` from `./utils`.

- [ ] **Step 3: Commit**

```bash
git add telegram-bot/client/notify-master.ts
git commit -m "feat(bot): add break detection and master notification"
```

---

### Task 3: Send break notification from bot booking flow

**Files:**
- Modify: `telegram-bot/client/booking-flow.ts` (book_confirm handler)

- [ ] **Step 1: After INSERT appointment in book_confirm, detect and notify breaks**

After the appointment is inserted and master is notified about the new appointment:
1. Query all confirmed appointments for this master on this date
2. Call `detectBreaks(appointments)`
3. For each detected break, call `notifyMasterBreak`

Import `notifyMasterBreak` and `detectBreaks` from `./notify-master`.

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client/booking-flow.ts
git commit -m "feat(bot): notify master about breaks after booking"
```

---

### Task 4: Send break notification from site API

**Files:**
- Modify: `app/api/appointments/route.ts` (POST handler)

- [ ] **Step 1: After INSERT appointment in POST, detect breaks and notify master**

The API already notifies master about new appointments. Add after that:
1. Query all confirmed appointments for this master on this date
2. Detect gaps (inline logic — same as detectBreaks but without import since this is Next.js API)
3. For each gap > 0 and < 30 min, send HTTP POST to masters bot

Use same `timeToMinutes` helper (already exists in this file) and send via `fetch` to Telegram API.

- [ ] **Step 2: Commit and push**

```bash
git add app/api/appointments/route.ts
git commit -m "feat(api): notify master about breaks after appointment creation"
git push origin main
```
