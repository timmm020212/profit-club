# Admin Schedule Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins full control over master schedules — create direct appointments, breaks, and custom blocks from the admin panel with two entry points (button + timeline click).

**Architecture:** New `scheduleBlocks` table for breaks/custom blocks. Direct appointments go into existing `appointments` table with `source: "admin"`. New API endpoint, modal component, and timeline integration. Status tracker handles block transitions.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL, Telegraf.

---

### Task 1: Schema Changes

**Files:**
- Modify: `db/schema-postgres.ts`

- [ ] **Step 1: Add source to appointments and create scheduleBlocks table**

In `db/schema-postgres.ts`, add `source` field to `appointments` table after `autoCompleted`:

```typescript
  source: varchar("source", { length: 20 }).default("site").notNull(),
```

Add new table at the end of the file:

```typescript
export const scheduleBlocks = pgTable("scheduleBlocks", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  blockDate: varchar("blockDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  blockType: varchar("blockType", { length: 30 }).notNull(),
  status: varchar("status", { length: 20 }).default("scheduled").notNull(),
  comment: text("comment"),
  createdAt: text("createdAt").notNull(),
});
```

- [ ] **Step 2: Apply via SQL in Supabase**

```sql
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "source" varchar(20) NOT NULL DEFAULT 'site';

CREATE TABLE IF NOT EXISTS "scheduleBlocks" (
  id serial PRIMARY KEY,
  "masterId" integer NOT NULL,
  "blockDate" varchar(10) NOT NULL,
  "startTime" varchar(5) NOT NULL,
  "endTime" varchar(5) NOT NULL,
  "blockType" varchar(30) NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'scheduled',
  "comment" text,
  "createdAt" text NOT NULL
);

GRANT ALL ON "scheduleBlocks" TO appuser;
GRANT USAGE, SELECT ON SEQUENCE "scheduleBlocks_id_seq" TO appuser;
```

- [ ] **Step 3: Commit**

```bash
git add db/schema-postgres.ts
git commit -m "feat: add source to appointments, create scheduleBlocks table"
```

---

### Task 2: Schedule Block API

**Files:**
- Create: `app/api/admin/schedule-block/route.ts`

- [ ] **Step 1: Create the API endpoint**

Create `app/api/admin/schedule-block/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, scheduleBlocks, services, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org/bot";

async function notifyMaster(masterTelegramId: string, text: string) {
  const token = process.env.MASTERS_BOT_TOKEN;
  if (!token || !masterTelegramId) return;
  try {
    await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: masterTelegramId, text }),
    });
  } catch {}
}

// GET — blocks for a date
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const blocks = await db.select().from(scheduleBlocks)
      .where(eq(scheduleBlocks.blockDate, date));

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("schedule-block GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

// POST — create block or direct appointment
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterId, date, startTime, endTime, blockType, clientName, clientPhone, serviceId, comment } = body;

    if (!masterId || !date || !startTime || !endTime || !blockType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Get master info for notification
    const [master] = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
      .from(masters).where(eq(masters.id, masterId));

    if (blockType === "appointment") {
      // Direct appointment — insert into appointments table
      const [newApt] = await db.insert(appointments).values({
        masterId,
        serviceId: serviceId || 0,
        appointmentDate: date,
        startTime,
        endTime,
        clientName: clientName || "Клиент",
        clientPhone: clientPhone || "",
        status: "confirmed",
        source: "admin",
        createdAt: now,
      }).returning();

      // Get service name
      let serviceName = "Услуга";
      if (serviceId) {
        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, serviceId));
        if (svc) serviceName = svc.name;
      }

      // Notify master
      if (master?.telegramId) {
        await notifyMaster(master.telegramId,
          `📋 Новая запись (прямая)\n\n💇 ${serviceName} — ${clientName || "Клиент"}\n⏰ ${startTime}–${endTime}\n📅 ${date}\n📝 Клиент записан напрямую${comment ? `\n💬 ${comment}` : ""}`,
        );
      }

      return NextResponse.json({ type: "appointment", id: newApt.id }, { status: 201 });
    } else {
      // Break or custom block
      const [block] = await db.insert(scheduleBlocks).values({
        masterId,
        blockDate: date,
        startTime,
        endTime,
        blockType,
        status: "scheduled",
        comment: comment || null,
        createdAt: now,
      }).returning();

      // Notify master
      if (master?.telegramId) {
        const icon = blockType === "break" ? "☕" : "📌";
        const label = blockType === "break" ? "Перерыв запланирован" : blockType;
        await notifyMaster(master.telegramId,
          `${icon} ${label}\n\n⏰ ${startTime}–${endTime}\n📅 ${date}${comment ? `\n📝 ${comment}` : ""}`,
        );
      }

      return NextResponse.json({ type: "block", id: block.id }, { status: 201 });
    }
  } catch (error) {
    console.error("schedule-block POST error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// DELETE — remove block
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    const type = searchParams.get("type") || "block";

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (type === "appointment") {
      await db.delete(appointments).where(eq(appointments.id, id));
    } else {
      await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("schedule-block DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/admin/schedule-block/route.ts
git commit -m "feat: add admin schedule-block API (create/get/delete)"
```

---

### Task 3: Admin Add Block Modal

**Files:**
- Create: `components/AdminAddBlockModal.tsx`

- [ ] **Step 1: Create the modal component**

Create `components/AdminAddBlockModal.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masters: { id: number; fullName: string }[];
  services: { id: number; name: string }[];
  prefillMasterId?: number;
  prefillStartTime?: string;
  date: string;
}

export default function AdminAddBlockModal({ isOpen, onClose, masters, services, prefillMasterId, prefillStartTime, date }: Props) {
  const router = useRouter();
  const [masterId, setMasterId] = useState(prefillMasterId || 0);
  const [blockType, setBlockType] = useState("appointment");
  const [customType, setCustomType] = useState("");
  const [startTime, setStartTime] = useState(prefillStartTime || "10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefillMasterId) setMasterId(prefillMasterId);
    if (prefillStartTime) {
      setStartTime(prefillStartTime);
      const [h, m] = prefillStartTime.split(":").map(Number);
      setEndTime(`${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }, [prefillMasterId, prefillStartTime]);

  const handleSubmit = async () => {
    if (!masterId) return;
    setSaving(true);
    try {
      const finalType = blockType === "custom" ? (customType || "Другое") : blockType;
      await fetch("/api/admin/schedule-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId,
          date,
          startTime,
          endTime,
          blockType: finalType,
          clientName: blockType === "appointment" ? clientName : undefined,
          clientPhone: blockType === "appointment" ? clientPhone : undefined,
          serviceId: blockType === "appointment" && serviceId ? serviceId : undefined,
          comment: comment || undefined,
        }),
      });
      router.refresh();
      onClose();
      resetForm();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const resetForm = () => {
    setBlockType("appointment");
    setCustomType("");
    setClientName("");
    setClientPhone("");
    setServiceId(0);
    setComment("");
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0F0F13] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-zinc-100">Добавить в расписание</h2>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Master select */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Мастер</label>
            <select
              value={masterId}
              onChange={(e) => setMasterId(Number(e.target.value))}
              className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
            >
              <option value={0}>Выберите мастера</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </select>
          </div>

          {/* Block type */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Тип</label>
            <div className="flex gap-2">
              {[
                { key: "appointment", label: "📋 Запись" },
                { key: "break", label: "☕ Перерыв" },
                { key: "custom", label: "📌 Другое" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setBlockType(t.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                    blockType === t.key
                      ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                      : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:bg-white/[0.06]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom type name */}
          {blockType === "custom" && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Название</label>
              <input
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Например: Обучение, Инвентаризация..."
                className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          )}

          {/* Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Начало</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Конец</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
              />
            </div>
          </div>

          {/* Appointment fields */}
          {blockType === "appointment" && (
            <>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Имя клиента</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Имя клиента"
                  className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Телефон</label>
                <input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+7 900 123-45-67"
                  className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Услуга</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
                >
                  <option value={0}>Выберите услугу</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Comment */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Комментарий</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Необязательно..."
              rows={2}
              className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07]">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !masterId}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Создаём..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
```

- [ ] **Step 2: Commit**

```bash
git add components/AdminAddBlockModal.tsx
git commit -m "feat: add AdminAddBlockModal for creating schedule blocks"
```

---

### Task 4: Integrate into Admin Page

**Files:**
- Modify: `app/(app)/admin/page.tsx`

- [ ] **Step 1: Add scheduleBlocks to data fetch**

In `app/(app)/admin/page.tsx`, add import for `scheduleBlocks` in the schema import. Then in `getAdminDataForDate`, add a 5th parallel query:

After the existing 4 queries, add `scheduleBlocks` query:

```typescript
import { scheduleBlocks } from "@/db/schema";
```

In the `Promise.all`, add:

```typescript
    db.select().from(scheduleBlocks)
      .where(eq(scheduleBlocks.blockDate, dateStr)),
```

Update the destructuring:

```typescript
  const [appointmentsData, mastersData, servicesData, workSlotsData, blocksData] = await Promise.all([...]);
  return { dateStr, appointmentsData, mastersData, servicesData, workSlotsData, blocksData };
```

- [ ] **Step 2: Add "Добавить" button and modal**

Add import at top:

```typescript
import AdminAddBlockModal from "@/components/AdminAddBlockModal";
```

The admin page is a server component, so wrap the button+modal in a client component. Actually, we need to add `AdminAddBlockModal` as a client component that receives data as props.

Find the sticky subheader section (around line 148-184). After `<AdminRoleCreator />` add:

```tsx
<AdminAddBlockButton
  masters={mastersData.map((m: any) => ({ id: m.id, fullName: m.fullName }))}
  services={servicesData.map((s: any) => ({ id: s.id, name: s.name }))}
  date={dateStr}
/>
```

- [ ] **Step 3: Create AdminAddBlockButton wrapper**

Create `components/AdminAddBlockButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import AdminAddBlockModal from "./AdminAddBlockModal";

interface Props {
  masters: { id: number; fullName: string }[];
  services: { id: number; name: string }[];
  date: string;
  prefillMasterId?: number;
  prefillStartTime?: string;
}

export default function AdminAddBlockButton({ masters, services, date, prefillMasterId, prefillStartTime }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/15 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
        Добавить
      </button>
      <AdminAddBlockModal
        isOpen={open}
        onClose={() => setOpen(false)}
        masters={masters}
        services={services}
        date={date}
        prefillMasterId={prefillMasterId}
        prefillStartTime={prefillStartTime}
      />
    </>
  );
}
```

- [ ] **Step 4: Show blocks on timeline**

In the admin page, within the master column timeline rendering (where appointment cards are placed), add schedule blocks rendering after the appointment cards section. Find the `{/* Appointment cards */}` section and after it add:

```tsx
{/* Schedule blocks (breaks, custom) */}
{(blocksData as any[])
  .filter((b: any) => b.masterId === master.id)
  .map((block: any) => {
    const bStart = timeToMinutes(block.startTime);
    const bEnd = timeToMinutes(block.endTime);
    const top = (bStart - roundedMin) * PX_PER_MIN;
    const height = (bEnd - bStart) * PX_PER_MIN;
    const isBreak = block.blockType === "break";
    return (
      <div
        key={`block-${block.id}`}
        className="absolute left-1 right-1 rounded-lg border overflow-hidden"
        style={{
          top: `${top}px`,
          height: `${height}px`,
          borderColor: isBreak ? "rgba(59,130,246,0.3)" : "rgba(156,163,175,0.3)",
          background: isBreak ? "rgba(59,130,246,0.08)" : "rgba(156,163,175,0.08)",
        }}
      >
        <div className="px-2 py-1 h-full flex flex-col justify-center">
          <div className="text-[10px] font-medium" style={{ color: isBreak ? "#60A5FA" : "#9CA3AF" }}>
            {isBreak ? "☕ Перерыв" : `📌 ${block.blockType}`}
          </div>
          {block.comment && height > 30 && (
            <div className="text-[9px] text-zinc-500 truncate">{block.comment}</div>
          )}
        </div>
      </div>
    );
  })}
```

- [ ] **Step 5: Commit**

```bash
git add app/(app)/admin/page.tsx components/AdminAddBlockButton.tsx
git commit -m "feat: integrate add block button and blocks display in admin timeline"
```

---

### Task 5: Block Available Slots

**Files:**
- Modify: `app/api/available-slots/route.ts`

- [ ] **Step 1: Block schedule blocks in available slots**

In `app/api/available-slots/route.ts`, add import for `scheduleBlocks`:

```typescript
import { scheduleBlocks } from "@/db/schema";
```

After fetching existing appointments (the query that gets confirmed appointments for overlap checking), add a query for schedule blocks:

```typescript
    const blocks = await db.select({
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
    }).from(scheduleBlocks)
      .where(and(
        eq(scheduleBlocks.masterId, masterIdNum),
        eq(scheduleBlocks.blockDate, date),
      ));
```

Then in the overlap checking loop, also check against blocks. Where it checks `timeRangesOverlap` against existing appointments, add a second check:

```typescript
    const blockOverlap = blocks.some((b) =>
      timeRangesOverlap(slotStart, slotEnd, timeToMinutes(b.startTime), timeToMinutes(b.endTime))
    );
    if (blockOverlap) continue;
```

- [ ] **Step 2: Commit**

```bash
git add app/api/available-slots/route.ts
git commit -m "feat: block schedule blocks from available slots"
```

---

### Task 6: Status Tracker for Blocks and Direct Appointments

**Files:**
- Modify: `telegram-bot/client/status-tracker.ts`

- [ ] **Step 1: Add block status transitions and direct appointment handling**

In `telegram-bot/client/status-tracker.ts`, add import for `scheduleBlocks`:

```typescript
import { appointments, services, masters, scheduleBlocks } from "../../db/schema-postgres";
```

At the end of `checkStatusTransitions`, before the final catch, add:

```typescript
    // 4. Schedule blocks: scheduled → active (startTime reached)
    const scheduledBlocks = await db.select({
      id: scheduleBlocks.id,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
      blockType: scheduleBlocks.blockType,
      masterId: scheduleBlocks.masterId,
    }).from(scheduleBlocks)
      .where(and(
        eq(scheduleBlocks.blockDate, today),
        eq(scheduleBlocks.status, "scheduled"),
      ));

    for (const block of scheduledBlocks) {
      if (nowMin >= timeToMin(block.startTime)) {
        await db.update(scheduleBlocks)
          .set({ status: "active" })
          .where(eq(scheduleBlocks.id, block.id));
        console.log(`[status-tracker] block ${block.id} (${block.blockType}) → active`);
      }
    }

    // 5. Schedule blocks: active → finished (endTime reached)
    const activeBlocks = await db.select({
      id: scheduleBlocks.id,
      endTime: scheduleBlocks.endTime,
      blockType: scheduleBlocks.blockType,
    }).from(scheduleBlocks)
      .where(and(
        eq(scheduleBlocks.blockDate, today),
        eq(scheduleBlocks.status, "active"),
      ));

    for (const block of activeBlocks) {
      if (nowMin >= timeToMin(block.endTime)) {
        await db.update(scheduleBlocks)
          .set({ status: "finished" })
          .where(eq(scheduleBlocks.id, block.id));
        console.log(`[status-tracker] block ${block.id} (${block.blockType}) → finished`);
      }
    }
```

Also modify the `in_progress → completed_by_master` auto-transition (step 2 in the function). For direct appointments (`source=admin`), skip client notification and go straight to `completed`:

In the existing step 2 loop, after setting `completed_by_master`, add a check:

Find the line that sends client message in step 2. Wrap it:

```typescript
        // Check if direct appointment (admin source) — skip client, go to completed
        const [aptFull] = await db.select({ source: appointments.source }).from(appointments).where(eq(appointments.id, apt.id));
        if (aptFull?.source === "admin") {
          await db.update(appointments)
            .set({ status: "completed" })
            .where(eq(appointments.id, apt.id));
          console.log(`[status-tracker] apt ${apt.id} → completed (direct, no client confirm)`);
        } else {
          // existing client notification code
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client/status-tracker.ts
git commit -m "feat: status tracker for schedule blocks and direct appointments"
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
git commit -m "feat: admin schedule control — direct appointments, breaks, custom blocks"
git push origin main
```
