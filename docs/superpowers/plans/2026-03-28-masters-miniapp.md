# Masters Mini-App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Telegram WebApp mini-application for masters with a weekly schedule view, authenticated via Telegram initData.

**Architecture:** New route group `app/(master)/master/` with a dedicated light-theme layout. Auth endpoint validates Telegram initData against `MASTERS_BOT_TOKEN` and looks up master by `telegramId`. Schedule API returns weekly appointments and work slots for the authenticated master.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL (Supabase), Telegram WebApp SDK, Telegraf.

---

## File Structure

```
app/(master)/
  master/
    layout.tsx              — light theme layout, Telegram WebApp SDK, viewport config
    page.tsx                — schedule page (server component wrapper)
components/master/
  MasterApp.tsx             — client component: auth + schedule orchestration
  MasterTabBar.tsx          — bottom tab navigation (5 tabs, SVG icons)
  MasterHeader.tsx          — logo + master avatar
  MasterWeekView.tsx        — week selector + day pills with appointment dots
  MasterDaySchedule.tsx     — appointment cards list for selected day
app/api/master/
  auth/route.ts             — POST: validate Telegram initData, return master profile
  schedule/route.ts         — GET: return week's appointments + work slots for master
telegram-bot/
  masters-bot-full.ts       — MODIFY: add WebApp menu button for mini-app
```

---

### Task 1: Master Auth API

**Files:**
- Create: `app/api/master/auth/route.ts`

This endpoint validates Telegram `initData` using `MASTERS_BOT_TOKEN` (not the client bot token), extracts the user's telegramId, and looks up the master in the database.

- [ ] **Step 1: Create the auth route**

Create `app/api/master/auth/route.ts`:

```typescript
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { masters } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const botToken = process.env.MASTERS_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return NextResponse.json({ valid: false, error: "No hash" }, { status: 401 });
    }

    const entries: string[] = [];
    params.forEach((value, key) => {
      if (key !== "hash") entries.push(`${key}=${value}`);
    });
    entries.sort();
    const dataCheckString = entries.join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (computedHash !== hash) {
      return NextResponse.json({ valid: false, error: "Invalid hash" }, { status: 401 });
    }

    const authDate = parseInt(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return NextResponse.json({ valid: false, error: "Data expired" }, { status: 401 });
    }

    const userJson = params.get("user");
    if (!userJson) {
      return NextResponse.json({ valid: false, error: "No user data" }, { status: 401 });
    }
    const user = JSON.parse(userJson);
    const telegramId = String(user.id);

    const rows = await db
      .select({
        id: masters.id,
        fullName: masters.fullName,
        specialization: masters.specialization,
        photoUrl: masters.photoUrl,
      })
      .from(masters)
      .where(eq(masters.telegramId, telegramId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ valid: false, error: "Not a master" }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      master: rows[0],
    });
  } catch (error) {
    console.error("Master auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/master/auth/route.ts
git commit -m "feat(master-miniapp): add master auth API endpoint"
```

---

### Task 2: Master Schedule API

**Files:**
- Create: `app/api/master/schedule/route.ts`

Returns all appointments and work slots for a given week for the authenticated master. Authentication is done by passing `masterId` as query param (the client calls auth first, then uses the returned master ID).

- [ ] **Step 1: Create the schedule route**

Create `app/api/master/schedule/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, workSlots, services } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getWeekDates(dateStr: string): { start: string; end: string; dates: string[] } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const curr = new Date(monday);
    curr.setDate(monday.getDate() + i);
    dates.push(
      `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`
    );
  }
  return { start: dates[0], end: dates[6], dates };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    const date = searchParams.get("date") || "";

    if (!masterId || !date) {
      return NextResponse.json({ error: "masterId and date required" }, { status: 400 });
    }

    const week = getWeekDates(date);

    const weekAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        serviceId: appointments.serviceId,
        status: appointments.status,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterId),
          gte(appointments.appointmentDate, week.start),
          lte(appointments.appointmentDate, week.end),
          eq(appointments.status, "confirmed")
        )
      );

    const weekSlots = await db
      .select({
        id: workSlots.id,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        isConfirmed: workSlots.isConfirmed,
      })
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterId),
          gte(workSlots.workDate, week.start),
          lte(workSlots.workDate, week.end)
        )
      );

    // Get service names for all appointments
    const serviceIds = [...new Set(weekAppointments.map((a) => a.serviceId))];
    const serviceMap: Record<number, string> = {};
    for (const sid of serviceIds) {
      const [svc] = await db
        .select({ name: services.name })
        .from(services)
        .where(eq(services.id, sid));
      if (svc) serviceMap[sid] = svc.name;
    }

    return NextResponse.json({
      week: week.dates,
      appointments: weekAppointments.map((a) => ({
        ...a,
        serviceName: serviceMap[a.serviceId] || "Услуга",
      })),
      workSlots: weekSlots,
    });
  } catch (error) {
    console.error("Master schedule error:", error);
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/master/schedule/route.ts
git commit -m "feat(master-miniapp): add master schedule API endpoint"
```

---

### Task 3: Master Layout

**Files:**
- Create: `app/(master)/master/layout.tsx`

Light-theme layout with Telegram WebApp SDK injection, viewport config, and Montserrat/Inter fonts.

- [ ] **Step 1: Create the layout**

Create `app/(master)/master/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Profit Club — Мастер",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script src="https://telegram.org/js/telegram-web-app.js" />
      <div className="min-h-screen bg-[#FAFAFA] font-[var(--font-montserrat)]">
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(master)/master/layout.tsx
git commit -m "feat(master-miniapp): add master layout with light theme"
```

---

### Task 4: MasterTabBar Component

**Files:**
- Create: `components/master/MasterTabBar.tsx`

Bottom navigation with 5 SVG line-icon tabs. Active tab is wine-red, others gray.

- [ ] **Step 1: Create MasterTabBar**

Create `components/master/MasterTabBar.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const tabs = [
  {
    label: "Расписание",
    href: "/master",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="9" y1="2" x2="9" y2="6" />
        <line x1="15" y1="2" x2="15" y2="6" />
      </svg>
    ),
  },
  {
    label: "Статистика",
    href: "/master/stats",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    label: "Финансы",
    href: "/master/finance",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9 9.5c0-1 1.5-2 3-2s3 1 3 2-1.5 1.5-3 2-3 1-3 2 1.5 2 3 2 3-1 3-2" />
      </svg>
    ),
  },
  {
    label: "Портфолио",
    href: "/master/portfolio",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    label: "Клиенты",
    href: "/master/clients",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#B2223C" : "#AAAAAA"} strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export default function MasterTabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50"
         style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)" }}>
      {tabs.map((tab) => {
        const active = tab.href === "/master"
          ? pathname === "/master"
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center pt-1.5 pb-1"
          >
            {tab.icon(active)}
            <span
              className="text-[9px] mt-0.5 tracking-wide"
              style={{
                color: active ? "#B2223C" : "#999",
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/master/MasterTabBar.tsx
git commit -m "feat(master-miniapp): add MasterTabBar with SVG icons"
```

---

### Task 5: MasterHeader Component

**Files:**
- Create: `components/master/MasterHeader.tsx`

Logo on the left, master avatar (initials in gradient circle) on the right. Below: master name card with pink gradient.

- [ ] **Step 1: Create MasterHeader**

Create `components/master/MasterHeader.tsx`:

```tsx
"use client";

import Image from "next/image";

interface MasterHeaderProps {
  fullName: string;
  specialization: string;
  photoUrl?: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function MasterHeader({ fullName, specialization, photoUrl }: MasterHeaderProps) {
  return (
    <>
      {/* Top bar: logo + avatar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100">
        <Image
          src="/logo/logo1.png"
          alt="Profit Club"
          width={140}
          height={48}
          className="h-7 w-auto object-contain"
          priority
        />
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={fullName}
            className="w-9 h-9 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg, #B2223C, #e8556e)" }}
          >
            {getInitials(fullName)}
          </div>
        )}
      </div>

      {/* Master name card */}
      <div
        className="px-5 py-3 border-b"
        style={{
          background: "linear-gradient(135deg, #fdf2f4, #fff5f6)",
          borderColor: "#fce4e8",
        }}
      >
        <div className="text-[16px] font-bold text-gray-900 tracking-wide">
          {fullName}
        </div>
        <div
          className="text-[10px] font-medium uppercase tracking-[1.5px] mt-0.5"
          style={{ color: "#B2223C" }}
        >
          {specialization}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/master/MasterHeader.tsx
git commit -m "feat(master-miniapp): add MasterHeader with logo and avatar"
```

---

### Task 6: MasterWeekView Component

**Files:**
- Create: `components/master/MasterWeekView.tsx`

Week selector with ‹/› navigation and 7 day pills. Selected day has wine-red background. Dots indicate appointment presence.

- [ ] **Step 1: Create MasterWeekView**

Create `components/master/MasterWeekView.tsx`:

```tsx
"use client";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

interface MasterWeekViewProps {
  weekDates: string[];
  selectedDate: string;
  appointmentCounts: Record<string, number>;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

function formatWeekLabel(dates: string[]): string {
  if (dates.length < 7) return "";
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[6] + "T00:00:00");
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} — ${last.getDate()} ${MONTH_NAMES[first.getMonth()]}`;
  }
  return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} — ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("ru-RU", { weekday: "long" });
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month}`;
}

export { formatDayLabel };

export default function MasterWeekView({
  weekDates,
  selectedDate,
  appointmentCounts,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}: MasterWeekViewProps) {
  return (
    <div className="px-5 pt-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3.5">
        <button
          onClick={onPrevWeek}
          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-sm"
        >
          ‹
        </button>
        <span className="text-[13px] font-semibold text-gray-900 tracking-wide">
          {formatWeekLabel(weekDates)}
        </span>
        <button
          onClick={onNextWeek}
          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-sm"
        >
          ›
        </button>
      </div>

      {/* Day pills */}
      <div className="flex gap-1 mb-4">
        {weekDates.map((date, i) => {
          const d = new Date(date + "T00:00:00");
          const dayNum = d.getDate();
          const isSelected = date === selectedDate;
          const hasAppointments = (appointmentCounts[date] || 0) > 0;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`flex-1 text-center py-2 rounded-[10px] transition-colors ${
                isSelected
                  ? "text-white"
                  : "bg-white border border-gray-200"
              }`}
              style={isSelected ? { background: "#B2223C" } : undefined}
            >
              <div
                className="text-[10px] font-medium"
                style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "#888" }}
              >
                {DAY_NAMES[i]}
              </div>
              <div
                className="text-[15px] font-semibold"
                style={{ color: isSelected ? "#fff" : "#1A1A1A" }}
              >
                {dayNum}
              </div>
              <div
                className="w-[5px] h-[5px] rounded-full mx-auto mt-1"
                style={{
                  background: isSelected
                    ? "rgba(255,255,255,0.5)"
                    : hasAppointments
                    ? "#B2223C"
                    : "#ddd",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/master/MasterWeekView.tsx
git commit -m "feat(master-miniapp): add MasterWeekView with day pills"
```

---

### Task 7: MasterDaySchedule Component

**Files:**
- Create: `components/master/MasterDaySchedule.tsx`

Renders appointment cards for the selected day. Each card shows time range, service name, client name. Free slots shown in muted style.

- [ ] **Step 1: Create MasterDaySchedule**

Create `components/master/MasterDaySchedule.tsx`:

```tsx
"use client";

interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
}

interface WorkSlot {
  startTime: string;
  endTime: string;
}

interface MasterDayScheduleProps {
  dayLabel: string;
  appointments: Appointment[];
  workSlot: WorkSlot | null;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

interface ScheduleItem {
  type: "appointment" | "free";
  startTime: string;
  endTime: string;
  appointment?: Appointment;
}

function buildScheduleItems(appointments: Appointment[], workSlot: WorkSlot | null): ScheduleItem[] {
  if (!workSlot) {
    return appointments.map((a) => ({
      type: "appointment",
      startTime: a.startTime,
      endTime: a.endTime,
      appointment: a,
    }));
  }

  const sorted = [...appointments].sort(
    (a, b) => timeToMin(a.startTime) - timeToMin(b.startTime)
  );
  const items: ScheduleItem[] = [];
  let cursor = timeToMin(workSlot.startTime);
  const slotEnd = timeToMin(workSlot.endTime);

  for (const apt of sorted) {
    const aptStart = timeToMin(apt.startTime);
    if (aptStart > cursor && aptStart - cursor >= 30) {
      items.push({
        type: "free",
        startTime: minToTime(cursor),
        endTime: minToTime(aptStart),
      });
    }
    items.push({
      type: "appointment",
      startTime: apt.startTime,
      endTime: apt.endTime,
      appointment: apt,
    });
    cursor = Math.max(cursor, timeToMin(apt.endTime));
  }

  if (slotEnd > cursor && slotEnd - cursor >= 30) {
    items.push({
      type: "free",
      startTime: minToTime(cursor),
      endTime: minToTime(slotEnd),
    });
  }

  return items;
}

export default function MasterDaySchedule({ dayLabel, appointments, workSlot }: MasterDayScheduleProps) {
  const items = buildScheduleItems(appointments, workSlot);

  return (
    <div className="px-5 pb-24">
      <div className="text-[12px] font-semibold text-gray-900 mb-2.5 tracking-wide">
        {dayLabel}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Нет записей на этот день
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          if (item.type === "free") {
            return (
              <div
                key={`free-${i}`}
                className="flex bg-gray-50 rounded-xl p-3.5"
                style={{ borderLeft: "3px solid #E8E8E8" }}
              >
                <div className="min-w-[48px]">
                  <div className="text-sm font-bold text-gray-300">{item.startTime}</div>
                  <div className="text-[10px] text-gray-300">{item.endTime}</div>
                </div>
                <div className="flex-1 pl-1">
                  <div className="text-xs text-gray-400">Свободное окно</div>
                </div>
              </div>
            );
          }

          const apt = item.appointment!;
          return (
            <div
              key={apt.id}
              className="flex bg-white rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              style={{ borderLeft: "3px solid #B2223C" }}
            >
              <div className="min-w-[48px]">
                <div className="text-sm font-bold text-gray-900">{apt.startTime}</div>
                <div className="text-[10px] text-gray-400">{apt.endTime}</div>
              </div>
              <div className="flex-1 pl-1">
                <div className="text-[13px] font-semibold text-gray-900">{apt.serviceName}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{apt.clientName}</div>
              </div>
              <div className="flex items-center text-gray-300 text-sm">›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/master/MasterDaySchedule.tsx
git commit -m "feat(master-miniapp): add MasterDaySchedule with free slot gaps"
```

---

### Task 8: MasterApp Orchestrator Component

**Files:**
- Create: `components/master/MasterApp.tsx`

Main client component that handles Telegram auth, fetches schedule data, and wires together header, week view, day schedule, and tab bar.

- [ ] **Step 1: Create MasterApp**

Create `components/master/MasterApp.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import MasterHeader from "./MasterHeader";
import MasterWeekView, { formatDayLabel } from "./MasterWeekView";
import MasterDaySchedule from "./MasterDaySchedule";
import MasterTabBar from "./MasterTabBar";

interface Master {
  id: number;
  fullName: string;
  specialization: string;
  photoUrl: string | null;
}

interface Appointment {
  id: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
}

interface WorkSlot {
  workDate: string;
  startTime: string;
  endTime: string;
  isConfirmed: boolean;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftWeek(dateStr: string, offset: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + offset * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MasterApp() {
  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workSlots, setWorkSlots] = useState<WorkSlot[]>([]);

  // Auth
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) {
      setError("Откройте через Telegram");
      setLoading(false);
      return;
    }
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#FFFFFF"); } catch {}
    try { tg.setBackgroundColor("#FAFAFA"); } catch {}

    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid && data.master) {
          setMaster(data.master);
        } else {
          setError(data.error || "Вы не зарегистрированы как мастер");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка авторизации");
        setLoading(false);
      });
  }, []);

  // Fetch schedule
  const fetchSchedule = useCallback(
    async (date: string) => {
      if (!master) return;
      try {
        const res = await fetch(
          `/api/master/schedule?masterId=${master.id}&date=${date}`
        );
        const data = await res.json();
        if (data.week) setWeekDates(data.week);
        if (data.appointments) setAppointments(data.appointments);
        if (data.workSlots) setWorkSlots(data.workSlots);
      } catch (e) {
        console.error("Schedule fetch error:", e);
      }
    },
    [master]
  );

  useEffect(() => {
    if (master) fetchSchedule(selectedDate);
  }, [master, selectedDate, fetchSchedule]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-8">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">🔒</div>
          <div className="text-gray-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!master) return null;

  // Build appointment counts per day
  const appointmentCounts: Record<string, number> = {};
  for (const apt of appointments) {
    appointmentCounts[apt.appointmentDate] =
      (appointmentCounts[apt.appointmentDate] || 0) + 1;
  }

  // Get today's appointments and work slot
  const dayAppointments = appointments.filter(
    (a) => a.appointmentDate === selectedDate
  );
  const daySlot = workSlots.find(
    (s) => s.workDate === selectedDate && s.isConfirmed
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <MasterHeader
        fullName={master.fullName}
        specialization={master.specialization}
        photoUrl={master.photoUrl}
      />
      <MasterWeekView
        weekDates={weekDates}
        selectedDate={selectedDate}
        appointmentCounts={appointmentCounts}
        onSelectDate={setSelectedDate}
        onPrevWeek={() => setSelectedDate(shiftWeek(selectedDate, -1))}
        onNextWeek={() => setSelectedDate(shiftWeek(selectedDate, 1))}
      />
      <MasterDaySchedule
        dayLabel={formatDayLabel(selectedDate)}
        appointments={dayAppointments}
        workSlot={daySlot ? { startTime: daySlot.startTime, endTime: daySlot.endTime } : null}
      />
      <MasterTabBar />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/master/MasterApp.tsx
git commit -m "feat(master-miniapp): add MasterApp orchestrator component"
```

---

### Task 9: Master Schedule Page

**Files:**
- Create: `app/(master)/master/page.tsx`

Simple server component that renders MasterApp.

- [ ] **Step 1: Create the page**

Create `app/(master)/master/page.tsx`:

```tsx
import MasterApp from "@/components/master/MasterApp";

export default function MasterSchedulePage() {
  return <MasterApp />;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(master)/master/page.tsx
git commit -m "feat(master-miniapp): add master schedule page"
```

---

### Task 10: Phase 2 Placeholder Pages

**Files:**
- Create: `app/(master)/master/stats/page.tsx`
- Create: `app/(master)/master/finance/page.tsx`
- Create: `app/(master)/master/portfolio/page.tsx`
- Create: `app/(master)/master/clients/page.tsx`

Minimal placeholder pages for the 4 remaining tabs so navigation works.

- [ ] **Step 1: Create placeholder pages**

Create `app/(master)/master/stats/page.tsx`:

```tsx
import MasterTabBar from "@/components/master/MasterTabBar";

export default function MasterStatsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="flex items-center justify-center pt-32 text-gray-400 text-sm">
        Статистика — скоро
      </div>
      <MasterTabBar />
    </div>
  );
}
```

Create `app/(master)/master/finance/page.tsx`:

```tsx
import MasterTabBar from "@/components/master/MasterTabBar";

export default function MasterFinancePage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="flex items-center justify-center pt-32 text-gray-400 text-sm">
        Финансы — скоро
      </div>
      <MasterTabBar />
    </div>
  );
}
```

Create `app/(master)/master/portfolio/page.tsx`:

```tsx
import MasterTabBar from "@/components/master/MasterTabBar";

export default function MasterPortfolioPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="flex items-center justify-center pt-32 text-gray-400 text-sm">
        Портфолио — скоро
      </div>
      <MasterTabBar />
    </div>
  );
}
```

Create `app/(master)/master/clients/page.tsx`:

```tsx
import MasterTabBar from "@/components/master/MasterTabBar";

export default function MasterClientsPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="flex items-center justify-center pt-32 text-gray-400 text-sm">
        Клиенты — скоро
      </div>
      <MasterTabBar />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(master)/master/stats/page.tsx app/(master)/master/finance/page.tsx app/(master)/master/portfolio/page.tsx app/(master)/master/clients/page.tsx
git commit -m "feat(master-miniapp): add placeholder pages for Phase 2 tabs"
```

---

### Task 11: Add WebApp Button to Masters Bot

**Files:**
- Modify: `telegram-bot/masters-bot-full.ts`

Add a WebApp menu button so masters can open the mini-app from the bot. Add a persistent menu button like the client bot does.

- [ ] **Step 1: Add SITE_URL and WebApp button**

At the top of `telegram-bot/masters-bot-full.ts`, after the existing imports, add the SITE_URL constant:

```typescript
const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
```

Find the `buildMasterMenu` function's fallback inline keyboard (the hardcoded one used when no DB flow exists). Add a WebApp button row at the top of the keyboard. The existing fallback keyboard looks like this:

```typescript
Markup.inlineKeyboard([
  [Markup.button.callback('📅 Расписание', 'sched_show')],
  [Markup.button.callback('🔄 Изменить рабочий день', 'chday_start')],
  [Markup.button.callback('⚙️ Настройки', 'settings')],
])
```

Change it to:

```typescript
Markup.inlineKeyboard([
  ...(SITE_URL.startsWith('https://') ? [[Markup.button.webApp('📱 Мини-приложение', `${SITE_URL}/master`)]] : []),
  [Markup.button.callback('📅 Расписание', 'sched_show')],
  [Markup.button.callback('🔄 Изменить рабочий день', 'chday_start')],
  [Markup.button.callback('⚙️ Настройки', 'settings')],
])
```

After the bot launch (`bot.launch()`), add the persistent menu button setter. Find the section that calls `bot.launch()` and after it add:

```typescript
// Set persistent menu button for masters who message the bot
bot.use(async (ctx, next) => {
  if (ctx.from && SITE_URL.startsWith('https://')) {
    bot.telegram.setChatMenuButton({
      chatId: ctx.from.id,
      menuButton: {
        type: 'web_app',
        text: '📱 Мини-апп',
        web_app: { url: `${SITE_URL}/master` },
      },
    }).catch(() => {});
  }
  return next();
});
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/masters-bot-full.ts
git commit -m "feat(master-miniapp): add WebApp button to masters bot"
```

---

### Task 12: Build & Verify

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: Build completes with no errors. The new routes should appear:
- `/master` (dynamic)
- `/master/stats` (static)
- `/master/finance` (static)
- `/master/portfolio` (static)
- `/master/clients` (static)

- [ ] **Step 2: Test locally**

Open `http://localhost:3000/master` in a browser. It should show the error state "Откройте через Telegram" since there's no Telegram WebApp context. This confirms the page loads and auth guard works.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(master-miniapp): Phase 1 complete — schedule mini-app for masters"
```
