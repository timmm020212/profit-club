# Preliminary Booking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a preliminary booking system where appointments made 2+ days ahead without a work slot get status "preliminary", block time for other clients, and appear in a dedicated admin panel for batch confirmation.

**Architecture:** New status value "preliminary" in existing appointments table. Modify appointment creation to set preliminary when no work slot exists. Modify available-slots to include preliminary in overlap checks. New admin panel component with checkboxes for bulk confirm. Visual badges in admin and master mini-app.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Telegraf.

---

### Task 1: Modify Appointment Creation

**Files:**
- Modify: `app/api/appointments/route.ts`

Currently line 506 hardcodes `status: "confirmed"`. Change it to set `"preliminary"` when `diffDays >= 2` and no confirmed work slot exists.

- [ ] **Step 1: Change status logic**

In `app/api/appointments/route.ts`, find the section around line 494-509 where the appointment is inserted. The current code:

```typescript
status: "confirmed",
```

Replace with dynamic status. Find the `// Создаем запись` section and change the values object. Before the insert (around line 494), add:

```typescript
    // Determine status: preliminary if 2+ days ahead and no work slot
    const appointmentStatus = (diffDays >= 2 && workDays.length === 0) ? "preliminary" : "confirmed";
```

Then change the insert to use `appointmentStatus`:

```typescript
        status: appointmentStatus,
```

- [ ] **Step 2: Send preliminary notification to master**

After the appointment is created, find where master notification is sent (around line 628-643). Wrap the notification to include "(предварительно)" label. Find:

```typescript
      try {
        await sendMasterNotification({
```

Before this block, add a check and modify the notification if preliminary. Actually simpler — just modify the `sendMasterNotification` call area. After the appointment is created and before notifications, add:

After `const newAppointment = ...returning();` and before the client Telegram notification section, add:

```typescript
    // Notify master about preliminary booking
    if (appointmentStatus === "preliminary") {
      const masterInfo = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
        .from(masters).where(eq(masters.id, masterIdNum));
      if (masterInfo[0]?.telegramId) {
        const svcInfo = await db.select({ name: services.name }).from(services).where(eq(services.id, serviceId));
        const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";
        await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: masterInfo[0].telegramId,
            text: `📋 Новая запись (предварительно)\n\n💇 ${svcInfo[0]?.name || "Услуга"} — ${finalClientName}\n⏰ ${startTime}–${endTime}\n📅 ${appointmentDate}\n📝 Запись предварительная — рабочий день ещё не создан`,
          }),
        }).catch(() => {});
      }
    }
```

- [ ] **Step 3: Commit**

```bash
git add app/api/appointments/route.ts
git commit -m "feat: set preliminary status for bookings 2+ days ahead without work slot"
```

---

### Task 2: Include Preliminary in Available Slots Overlap

**Files:**
- Modify: `app/api/available-slots/route.ts`

Currently line 221 filters only `eq(appointments.status, "confirmed")`. Need to include `"preliminary"` too.

- [ ] **Step 1: Change the filter**

In `app/api/available-slots/route.ts`, find line 221:

```typescript
      eq(appointments.status, "confirmed")
```

Replace with:

```typescript
      inArray(appointments.status, ["confirmed", "preliminary"])
```

Add `inArray` to the drizzle-orm import at the top of the file. Find the import line:

```typescript
import { eq, and, gte, lte } from "drizzle-orm";
```

or similar, and add `inArray`:

```typescript
import { eq, and, gte, lte, inArray } from "drizzle-orm";
```

- [ ] **Step 2: Commit**

```bash
git add app/api/available-slots/route.ts
git commit -m "feat: block preliminary appointments from available slots"
```

---

### Task 3: Admin Preliminary Bookings Panel

**Files:**
- Create: `components/AdminPreliminaryBookings.tsx`

- [ ] **Step 1: Create the component**

Create `components/AdminPreliminaryBookings.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PreliminaryAppointment {
  id: number;
  masterId: number;
  serviceId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string | null;
  masterName?: string;
  serviceName?: string;
  hasWorkSlot?: boolean;
  fitsInSlot?: boolean;
}

interface Props {
  appointments: PreliminaryAppointment[];
}

const MONTH_NAMES = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export default function AdminPreliminaryBookings({ appointments }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  if (appointments.length === 0) return null;

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === appointments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(appointments.map((a) => a.id)));
    }
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setConfirming(true);
    try {
      await fetch("/api/admin/preliminary-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      console.error(e);
    }
    setConfirming(false);
  };

  return (
    <section className="rounded-2xl border border-violet-500/[0.15] bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-violet-400">
              <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-violet-300">Предварительные записи</span>
          <span className="inline-flex items-center rounded-full bg-violet-500/15 border border-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-400">
            {appointments.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {selected.size === appointments.length ? "Снять все" : "Выбрать все"}
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white disabled:opacity-50 transition-all"
            >
              {confirming ? "..." : `✅ Подтвердить (${selected.size})`}
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {appointments.map((apt) => {
          const isSelected = selected.has(apt.id);
          const borderColor = apt.fitsInSlot === false
            ? "border-l-red-500/50"
            : apt.hasWorkSlot
            ? "border-l-emerald-500/50"
            : "border-l-zinc-500/30";

          return (
            <div
              key={apt.id}
              onClick={() => toggleSelect(apt.id)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-white/[0.02] transition-colors border-l-2 ${borderColor}`}
            >
              <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-violet-600 border-violet-500"
                  : "border-zinc-600 bg-transparent"
              }`}>
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-white">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">{apt.serviceName || "Услуга"}</span>
                  <span className="text-[10px] text-zinc-500">{apt.clientName}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-violet-400 font-mono">{formatDate(apt.appointmentDate)} {apt.startTime}–{apt.endTime}</span>
                  <span className="text-[10px] text-zinc-600">• {apt.masterName || "Мастер"}</span>
                </div>
              </div>

              {apt.fitsInSlot === false && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex-shrink-0">
                  Вне графика
                </span>
              )}
              {!apt.hasWorkSlot && apt.fitsInSlot !== false && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 flex-shrink-0">
                  Нет раб. дня
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AdminPreliminaryBookings.tsx
git commit -m "feat: add AdminPreliminaryBookings panel component"
```

---

### Task 4: Preliminary Confirm API

**Files:**
- Create: `app/api/admin/preliminary-confirm/route.ts`

- [ ] **Step 1: Create the confirm endpoint**

Create `app/api/admin/preliminary-confirm/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masters } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    // Update all selected to confirmed
    for (const id of ids) {
      await db.update(appointments)
        .set({ status: "confirmed" })
        .where(eq(appointments.id, id));
    }

    // Send confirmation notifications to masters
    const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";
    for (const id of ids) {
      try {
        const [apt] = await db.select({
          masterId: appointments.masterId,
          serviceId: appointments.serviceId,
          clientName: appointments.clientName,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          appointmentDate: appointments.appointmentDate,
        }).from(appointments).where(eq(appointments.id, id));

        if (!apt) continue;

        const [master] = await db.select({ telegramId: masters.telegramId }).from(masters).where(eq(masters.id, apt.masterId));
        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));

        if (master?.telegramId) {
          await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: master.telegramId,
              text: `✅ Запись подтверждена\n\n💇 ${svc?.name || "Услуга"} — ${apt.clientName}\n⏰ ${apt.startTime}–${apt.endTime}\n📅 ${apt.appointmentDate}`,
            }),
          }).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, confirmed: ids.length });
  } catch (error) {
    console.error("preliminary-confirm error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/preliminary-confirm/route.ts
git commit -m "feat: add preliminary booking confirm API endpoint"
```

---

### Task 5: Integrate into Admin Page

**Files:**
- Modify: `app/(app)/admin/page.tsx`

- [ ] **Step 1: Fetch preliminary appointments and add panel**

Add import:
```typescript
import AdminPreliminaryBookings from "@/components/AdminPreliminaryBookings";
```

In `getAdminDataForDate`, add a query for preliminary appointments (next 14 days). Add to the `Promise.all`:

```typescript
    db.select().from(appointments)
      .where(eq(appointments.status, "preliminary")),
```

Add to destructuring as `preliminaryData`.

In the return, add to the object: `preliminaryData`.

In the JSX, after the "Записи вне рабочего времени" section and before the main schedule area, add:

```tsx
{(preliminaryData as any[]).length > 0 && (
  <AdminPreliminaryBookings
    appointments={(preliminaryData as any[]).map((apt: any) => {
      const master = (mastersData as any[]).find((m: any) => m.id === apt.masterId);
      const service = (servicesData as any[]).find((s: any) => s.id === apt.serviceId);
      const workSlot = (workSlotsData as any[]).find(
        (w: any) => w.masterId === apt.masterId && w.workDate === apt.appointmentDate && w.isConfirmed
      );
      const fitsInSlot = workSlot
        ? timeToMinutes(apt.startTime) >= timeToMinutes(workSlot.startTime) && timeToMinutes(apt.endTime) <= timeToMinutes(workSlot.endTime)
        : undefined;
      return {
        ...apt,
        masterName: master?.fullName || "Мастер",
        serviceName: service?.name || "Услуга",
        hasWorkSlot: !!workSlot,
        fitsInSlot: workSlot ? fitsInSlot : undefined,
      };
    })}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/admin/page.tsx
git commit -m "feat: add preliminary bookings panel to admin page"
```

---

### Task 6: Visual Status in Admin and Master Mini-App

**Files:**
- Modify: `components/AdminAppointmentManager.tsx`
- Modify: `components/master/MasterDaySchedule.tsx`

- [ ] **Step 1: Add preliminary to admin status colors**

In `components/AdminAppointmentManager.tsx`, find `STATUS_COLORS` and add:

```typescript
  preliminary: { border: "rgba(139,92,246,0.5)", badge: "bg-violet-500/20 text-violet-400", label: "Предварительно" },
```

- [ ] **Step 2: Add preliminary to master mini-app status colors**

In `components/master/MasterDaySchedule.tsx`, find `STATUS_CONFIG` and add:

```typescript
  preliminary: { color: "#8B5CF6", label: "Предварительно" },
```

- [ ] **Step 3: Commit**

```bash
git add components/AdminAppointmentManager.tsx components/master/MasterDaySchedule.tsx
git commit -m "feat: add preliminary status badge to admin and master mini-app"
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
git commit -m "feat: preliminary booking system — full implementation"
git push origin main
```
