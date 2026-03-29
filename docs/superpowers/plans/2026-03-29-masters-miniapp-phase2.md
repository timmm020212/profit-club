# Masters Mini-App Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full functionality to Statistics, Finance, Portfolio, and Clients tabs in the masters mini-app.

**Architecture:** New DB tables (masterPortfolio, masterClientNotes) and field (commissionPercent on masters). Shared stats API endpoint for both Stats and Finance tabs. Supabase Storage for portfolio photos. All UI components follow existing light-theme pattern with wine-red accents.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL (Supabase), Supabase Storage (`@supabase/supabase-js`).

---

## Part A: Schema + Stats + Finance

### Task 1: Schema Changes

**Files:**
- Modify: `db/schema-postgres.ts`

- [ ] **Step 1: Add commissionPercent to masters and new tables**

Add to `db/schema-postgres.ts` after the existing `masters` table definition — add `commissionPercent` field to the masters table, and add two new tables at the end of the file:

In the `masters` table, add after `notificationSettings`:
```typescript
  commissionPercent: integer("commission_percent").default(50).notNull(),
```

At the end of the file, add:
```typescript
export const masterPortfolio = pgTable("masterPortfolio", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  description: varchar("description", { length: 200 }),
  serviceId: integer("serviceId"),
  createdAt: text("createdAt").notNull(),
});

export const masterClientNotes = pgTable("masterClientNotes", {
  id: serial("id").primaryKey(),
  masterId: integer("masterId").notNull(),
  clientIdentifier: varchar("clientIdentifier", { length: 20 }).notNull(),
  note: text("note"),
  updatedAt: text("updatedAt").notNull(),
});
```

- [ ] **Step 2: Push schema to database**

```bash
npm run db:push
```

- [ ] **Step 3: Commit**

```bash
git add db/schema-postgres.ts
git commit -m "feat: add commissionPercent, masterPortfolio, masterClientNotes schema"
```

---

### Task 2: Stats API Endpoint

**Files:**
- Create: `app/api/master/stats/route.ts`

This single endpoint returns all data needed for both Stats and Finance tabs.

- [ ] **Step 1: Create the stats route**

Create `app/api/master/stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, workSlots, masters } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    if (!masterId || !from || !to) {
      return NextResponse.json({ error: "masterId, from, to required" }, { status: 400 });
    }

    // Get master commission
    const [master] = await db
      .select({ commissionPercent: masters.commissionPercent })
      .from(masters)
      .where(eq(masters.id, masterId));

    const commissionPercent = master?.commissionPercent ?? 50;

    // Get all confirmed appointments in range
    const appts = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        serviceId: appointments.serviceId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterId),
          gte(appointments.appointmentDate, from),
          lte(appointments.appointmentDate, to),
          eq(appointments.status, "confirmed")
        )
      );

    // Get work slots in range
    const slots = await db
      .select({
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
      })
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterId),
          gte(workSlots.workDate, from),
          lte(workSlots.workDate, to),
          eq(workSlots.isConfirmed, true)
        )
      );

    // Get all services for price/name lookup
    const allServices = await db
      .select({ id: services.id, name: services.name, price: services.price })
      .from(services);
    const svcMap: Record<number, { name: string; price: number }> = {};
    for (const s of allServices) {
      svcMap[s.id] = { name: s.name, price: parseInt(s.price || "0") || 0 };
    }

    // Calculate stats
    const uniqueClients = new Set(appts.map((a) => a.clientPhone).filter(Boolean));
    const totalAppointments = appts.length;

    // Total appointment hours
    let totalApptMinutes = 0;
    for (const a of appts) {
      totalApptMinutes += timeToMin(a.endTime) - timeToMin(a.startTime);
    }

    // Total work slot hours
    let totalSlotMinutes = 0;
    for (const s of slots) {
      totalSlotMinutes += timeToMin(s.endTime) - timeToMin(s.startTime);
    }

    const utilization = totalSlotMinutes > 0
      ? Math.round((totalApptMinutes / totalSlotMinutes) * 100)
      : 0;

    // Revenue
    let totalRevenue = 0;
    const serviceStats: Record<number, { name: string; count: number; revenue: number }> = {};
    for (const a of appts) {
      const svc = svcMap[a.serviceId];
      const price = svc?.price || 0;
      totalRevenue += price;
      if (!serviceStats[a.serviceId]) {
        serviceStats[a.serviceId] = { name: svc?.name || "Услуга", count: 0, revenue: 0 };
      }
      serviceStats[a.serviceId].count++;
      serviceStats[a.serviceId].revenue += price;
    }

    const avgCheck = totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0;

    // Top services sorted by count
    const topServices = Object.values(serviceStats)
      .sort((a, b) => b.count - a.count);

    // Daily breakdown
    const dailyMap: Record<string, { count: number; revenue: number; appointments: any[] }> = {};
    for (const a of appts) {
      if (!dailyMap[a.appointmentDate]) {
        dailyMap[a.appointmentDate] = { count: 0, revenue: 0, appointments: [] };
      }
      const price = svcMap[a.serviceId]?.price || 0;
      dailyMap[a.appointmentDate].count++;
      dailyMap[a.appointmentDate].revenue += price;
      dailyMap[a.appointmentDate].appointments.push({
        startTime: a.startTime,
        endTime: a.endTime,
        serviceName: svcMap[a.serviceId]?.name || "Услуга",
        clientName: a.clientName,
        price,
      });
    }

    // Sort daily by date descending
    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({ date, ...data }));

    return NextResponse.json({
      commissionPercent,
      stats: {
        uniqueClients: uniqueClients.size,
        totalAppointments,
        utilization,
        avgCheck,
        totalRevenue,
        masterEarnings: Math.round(totalRevenue * commissionPercent / 100),
      },
      topServices,
      daily,
    });
  } catch (error) {
    console.error("Master stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/master/stats/route.ts
git commit -m "feat(master-miniapp): add stats/finance API endpoint"
```

---

### Task 3: MasterPeriodSelector Component

**Files:**
- Create: `components/master/MasterPeriodSelector.tsx`

Shared period toggle used by both Stats and Finance tabs.

- [ ] **Step 1: Create MasterPeriodSelector**

Create `components/master/MasterPeriodSelector.tsx`:

```tsx
"use client";

import { useState } from "react";

type PeriodType = "week" | "month" | "custom";

interface MasterPeriodSelectorProps {
  onPeriodChange: (from: string, to: string) => void;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(monday), to: fmt(sunday) };
}

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(first), to: fmt(last) };
}

export default function MasterPeriodSelector({ onPeriodChange }: MasterPeriodSelectorProps) {
  const [active, setActive] = useState<PeriodType>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const handleSelect = (type: PeriodType) => {
    setActive(type);
    if (type === "week") {
      const r = getWeekRange();
      onPeriodChange(r.from, r.to);
    } else if (type === "month") {
      const r = getMonthRange();
      onPeriodChange(r.from, r.to);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onPeriodChange(customFrom, customTo);
    }
  };

  const tabs: { key: PeriodType; label: string }[] = [
    { key: "week", label: "Неделя" },
    { key: "month", label: "Месяц" },
    { key: "custom", label: "Период" },
  ];

  return (
    <div className="px-5 pt-4">
      <div className="flex bg-white rounded-xl p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSelect(t.key)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: active === t.key ? "#B2223C" : "transparent",
              color: active === t.key ? "#fff" : "#888",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <div className="flex gap-2 mt-3 items-center">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
          />
          <button
            onClick={handleCustomApply}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: "#B2223C" }}
          >
            ОК
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/master/MasterPeriodSelector.tsx
git commit -m "feat(master-miniapp): add MasterPeriodSelector component"
```

---

### Task 4: Statistics Page

**Files:**
- Modify: `app/(master)/master/stats/page.tsx`

- [ ] **Step 1: Replace placeholder with full stats page**

Replace `app/(master)/master/stats/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import MasterTabBar from "@/components/master/MasterTabBar";
import MasterPeriodSelector from "@/components/master/MasterPeriodSelector";

interface StatsData {
  stats: {
    uniqueClients: number;
    totalAppointments: number;
    utilization: number;
    avgCheck: number;
    totalRevenue: number;
  };
  topServices: { name: string; count: number; revenue: number }[];
  daily: { date: string; count: number }[];
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(monday), to: fmt(sunday) };
}

export default function MasterStatsPage() {
  const [masterId, setMasterId] = useState<number | null>(null);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return;
    tg.ready();
    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.valid) setMasterId(d.master.id); });
  }, []);

  const fetchStats = useCallback(async (from: string, to: string) => {
    if (!masterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/master/stats?masterId=${masterId}&from=${from}&to=${to}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [masterId]);

  // Initial load
  useEffect(() => {
    if (masterId) {
      const r = getWeekRange();
      fetchStats(r.from, r.to);
    }
  }, [masterId, fetchStats]);

  const maxCount = data?.topServices?.length
    ? Math.max(...data.topServices.map((s) => s.count))
    : 1;

  const maxDaily = data?.daily?.length
    ? Math.max(...data.daily.map((d) => d.count))
    : 1;

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Статистика</h1>
      </div>

      <MasterPeriodSelector onPeriodChange={fetchStats} />

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Загрузка...</div>
      ) : data ? (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-3 px-5 mt-4">
            {[
              { label: "Клиентов", value: data.stats.uniqueClients },
              { label: "Записей", value: data.stats.totalAppointments },
              { label: "Загруженность", value: `${data.stats.utilization}%` },
              { label: "Средний чек", value: `${data.stats.avgCheck} ₽` },
            ].map((m) => (
              <div key={m.label} className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-[11px] text-gray-400 font-medium">{m.label}</div>
                <div className="text-xl font-bold text-gray-900 mt-1">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Top services */}
          {data.topServices.length > 0 && (
            <div className="px-5 mt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Топ услуг</h2>
              <div className="flex flex-col gap-2">
                {data.topServices.map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-400">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(s.count / maxCount) * 100}%`,
                          background: "#B2223C",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily chart */}
          {data.daily.length > 0 && (
            <div className="px-5 mt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">По дням</h2>
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="flex items-end gap-1" style={{ height: 100 }}>
                  {data.daily
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((d) => (
                      <div key={d.date} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${(d.count / maxDaily) * 80}px`,
                            background: "#B2223C",
                            minHeight: d.count > 0 ? 4 : 0,
                          }}
                        />
                        <div className="text-[8px] text-gray-400 mt-1">
                          {new Date(d.date + "T00:00:00").getDate()}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      <MasterTabBar />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(master)/master/stats/page.tsx
git commit -m "feat(master-miniapp): implement Statistics page"
```

---

### Task 5: Finance Page

**Files:**
- Modify: `app/(master)/master/finance/page.tsx`

- [ ] **Step 1: Replace placeholder with full finance page**

Replace `app/(master)/master/finance/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import MasterTabBar from "@/components/master/MasterTabBar";
import MasterPeriodSelector from "@/components/master/MasterPeriodSelector";

interface FinanceData {
  commissionPercent: number;
  stats: {
    totalRevenue: number;
    masterEarnings: number;
    totalAppointments: number;
  };
  topServices: { name: string; count: number; revenue: number }[];
  daily: {
    date: string;
    count: number;
    revenue: number;
    appointments: { startTime: string; serviceName: string; clientName: string; price: number }[];
  }[];
}

const MONTH_NAMES = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(monday), to: fmt(sunday) };
}

export default function MasterFinancePage() {
  const [masterId, setMasterId] = useState<number | null>(null);
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return;
    tg.ready();
    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.valid) setMasterId(d.master.id); });
  }, []);

  const fetchData = useCallback(async (from: string, to: string) => {
    if (!masterId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/master/stats?masterId=${masterId}&from=${from}&to=${to}`);
      setData(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [masterId]);

  useEffect(() => {
    if (masterId) {
      const r = getWeekRange();
      fetchData(r.from, r.to);
    }
  }, [masterId, fetchData]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Финансы</h1>
      </div>

      <MasterPeriodSelector onPeriodChange={fetchData} />

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Загрузка...</div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="flex gap-3 px-5 mt-4">
            <div className="flex-1 bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="text-[10px] text-gray-400 font-medium">Доход салона</div>
              <div className="text-lg font-bold text-gray-900 mt-1">{data.stats.totalRevenue.toLocaleString()} ₽</div>
            </div>
            <div className="flex-1 bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]" style={{ borderLeft: "3px solid #B2223C" }}>
              <div className="text-[10px] font-medium" style={{ color: "#B2223C" }}>Мой заработок ({data.commissionPercent}%)</div>
              <div className="text-lg font-bold text-gray-900 mt-1">{data.stats.masterEarnings.toLocaleString()} ₽</div>
            </div>
          </div>
          <div className="px-5 mt-3">
            <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] text-center">
              <div className="text-[10px] text-gray-400 font-medium">Записей за период</div>
              <div className="text-lg font-bold text-gray-900 mt-1">{data.stats.totalAppointments}</div>
            </div>
          </div>

          {/* Service breakdown */}
          {data.topServices.length > 0 && (
            <div className="px-5 mt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">По услугам</h2>
              <div className="bg-white rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                {data.topServices.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: i < data.topServices.length - 1 ? "1px solid #f0f0f0" : "none" }}
                  >
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-900">{s.name}</div>
                      <div className="text-[10px] text-gray-400">{s.count} шт.</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-gray-900">{s.revenue.toLocaleString()} ₽</div>
                      <div className="text-[10px]" style={{ color: "#B2223C" }}>
                        {Math.round(s.revenue * (data.commissionPercent / 100)).toLocaleString()} ₽
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily history */}
          {data.daily.length > 0 && (
            <div className="px-5 mt-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">По дням</h2>
              <div className="flex flex-col gap-2">
                {data.daily.map((d) => (
                  <div key={d.date} className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(expandedDay === d.date ? null : d.date)}
                      className="w-full flex items-center justify-between px-4 py-3"
                    >
                      <div className="text-xs font-medium text-gray-900">{formatDate(d.date)}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{d.count} зап.</span>
                        <span className="text-xs font-semibold" style={{ color: "#B2223C" }}>
                          {Math.round(d.revenue * (data.commissionPercent / 100)).toLocaleString()} ₽
                        </span>
                        <span className="text-gray-300 text-xs">{expandedDay === d.date ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expandedDay === d.date && (
                      <div className="border-t border-gray-100 px-4 py-2">
                        {d.appointments.map((a, j) => (
                          <div key={j} className="flex justify-between py-1.5 text-[11px]">
                            <span className="text-gray-500">{a.startTime} · {a.serviceName}</span>
                            <span className="text-gray-700 font-medium">{a.price.toLocaleString()} ₽</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      <MasterTabBar />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(master)/master/finance/page.tsx
git commit -m "feat(master-miniapp): implement Finance page"
```

---

## Part B: Portfolio + Clients

### Task 6: Supabase Storage Helper

**Files:**
- Create: `lib/supabase-storage.ts`

- [ ] **Step 1: Install supabase client**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Create storage helper**

Create `lib/supabase-storage.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function uploadFile(
  bucket: string,
  path: string,
  file: Buffer,
  contentType: string
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });

  if (error) {
    console.error("Supabase upload error:", error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    console.error("Supabase delete error:", error);
    return false;
  }
  return true;
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase-storage.ts package.json package-lock.json
git commit -m "feat: add Supabase Storage helper"
```

---

### Task 7: Portfolio API + Page

**Files:**
- Create: `app/api/master/portfolio/route.ts`
- Create: `app/api/master/portfolio/upload/route.ts`
- Modify: `app/(master)/master/portfolio/page.tsx`

- [ ] **Step 1: Create portfolio GET/DELETE route**

Create `app/api/master/portfolio/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterPortfolio } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { deleteFile } from "@/lib/supabase-storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    if (!masterId) return NextResponse.json({ error: "masterId required" }, { status: 400 });

    const photos = await db
      .select()
      .from(masterPortfolio)
      .where(eq(masterPortfolio.masterId, masterId))
      .orderBy(desc(masterPortfolio.id));

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Portfolio GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    const masterId = parseInt(searchParams.get("masterId") || "0");
    if (!id || !masterId) return NextResponse.json({ error: "id and masterId required" }, { status: 400 });

    const [photo] = await db
      .select()
      .from(masterPortfolio)
      .where(and(eq(masterPortfolio.id, id), eq(masterPortfolio.masterId, masterId)));

    if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Extract path from URL for deletion
    const urlParts = photo.imageUrl.split("/portfolio/");
    if (urlParts[1]) {
      await deleteFile("portfolio", urlParts[1]);
    }

    await db.delete(masterPortfolio).where(eq(masterPortfolio.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Portfolio DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create portfolio upload route**

Create `app/api/master/portfolio/upload/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterPortfolio } from "@/db/schema";
import { uploadFile } from "@/lib/supabase-storage";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const masterId = parseInt(formData.get("masterId") as string || "0");
    const description = (formData.get("description") as string) || "";
    const serviceId = parseInt(formData.get("serviceId") as string || "0") || null;

    if (!file || !masterId) {
      return NextResponse.json({ error: "file and masterId required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${masterId}/${Date.now()}.${ext}`;

    const url = await uploadFile("portfolio", path, buffer, file.type);
    if (!url) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [inserted] = await db.insert(masterPortfolio).values({
      masterId,
      imageUrl: url,
      description: description || null,
      serviceId,
      createdAt,
    }).returning();

    return NextResponse.json({ photo: inserted });
  } catch (error) {
    console.error("Portfolio upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create portfolio page**

Replace `app/(master)/master/portfolio/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import MasterTabBar from "@/components/master/MasterTabBar";

interface Photo {
  id: number;
  imageUrl: string;
  description: string | null;
  createdAt: string;
}

export default function MasterPortfolioPage() {
  const [masterId, setMasterId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return;
    tg.ready();
    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.valid) setMasterId(d.master.id); });
  }, []);

  const fetchPhotos = useCallback(async () => {
    if (!masterId) return;
    const res = await fetch(`/api/master/portfolio?masterId=${masterId}`);
    const d = await res.json();
    setPhotos(d.photos || []);
    setLoading(false);
  }, [masterId]);

  useEffect(() => { if (masterId) fetchPhotos(); }, [masterId, fetchPhotos]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !masterId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("masterId", String(masterId));
    try {
      await fetch("/api/master/portfolio/upload", { method: "POST", body: fd });
      await fetchPhotos();
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDelete = async (photo: Photo) => {
    if (!masterId) return;
    await fetch(`/api/master/portfolio?id=${photo.id}&masterId=${masterId}`, { method: "DELETE" });
    setSelectedPhoto(null);
    fetchPhotos();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="px-5 pt-5 pb-4">
        <h1 className="text-lg font-bold text-gray-900">Портфолио</h1>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />

      <div className="grid grid-cols-2 gap-2 px-5">
        {/* Add button */}
        <button
          onClick={() => fileRef.current?.click()}
          className="aspect-square bg-white rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center"
          disabled={uploading}
        >
          {uploading ? (
            <span className="text-gray-400 text-sm">Загрузка...</span>
          ) : (
            <>
              <span className="text-3xl text-gray-300">+</span>
              <span className="text-[10px] text-gray-400 mt-1">Добавить</span>
            </>
          )}
        </button>

        {loading ? (
          <div className="aspect-square bg-white rounded-xl animate-pulse" />
        ) : (
          photos.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPhoto(p)}
              className="aspect-square rounded-xl overflow-hidden"
            >
              <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))
        )}
      </div>

      {/* Full screen preview */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col">
          <div className="flex justify-between items-center p-4">
            <button onClick={() => setSelectedPhoto(null)} className="text-white text-sm">← Назад</button>
            <button
              onClick={() => { if (confirm("Удалить фото?")) handleDelete(selectedPhoto); }}
              className="text-red-400 text-sm"
            >
              Удалить
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={selectedPhoto.imageUrl} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </div>
          {selectedPhoto.description && (
            <div className="p-4 text-white text-sm text-center">{selectedPhoto.description}</div>
          )}
        </div>
      )}

      <MasterTabBar />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/master/portfolio/route.ts app/api/master/portfolio/upload/route.ts app/(master)/master/portfolio/page.tsx
git commit -m "feat(master-miniapp): implement Portfolio with Supabase Storage"
```

---

### Task 8: Clients API

**Files:**
- Create: `app/api/master/clients/route.ts`
- Create: `app/api/master/clients/detail/route.ts`
- Create: `app/api/master/clients/note/route.ts`

- [ ] **Step 1: Create clients list route**

Create `app/api/master/clients/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    if (!masterId) return NextResponse.json({ error: "masterId required" }, { status: 400 });

    const appts = await db
      .select({
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        clientTelegramId: appointments.clientTelegramId,
        appointmentDate: appointments.appointmentDate,
      })
      .from(appointments)
      .where(eq(appointments.masterId, masterId))
      .orderBy(desc(appointments.id));

    // Aggregate by phone
    const clientMap: Record<string, {
      name: string;
      phone: string;
      telegramId: string | null;
      visitCount: number;
      lastVisit: string;
    }> = {};

    for (const a of appts) {
      const key = a.clientPhone || a.clientName;
      if (!clientMap[key]) {
        clientMap[key] = {
          name: a.clientName,
          phone: a.clientPhone || "",
          telegramId: a.clientTelegramId || null,
          visitCount: 0,
          lastVisit: a.appointmentDate,
        };
      }
      clientMap[key].visitCount++;
      if (a.appointmentDate > clientMap[key].lastVisit) {
        clientMap[key].lastVisit = a.appointmentDate;
      }
    }

    const clients = Object.values(clientMap).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Clients GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create client detail route**

Create `app/api/master/clients/detail/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masterClientNotes } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    const phone = searchParams.get("phone") || "";
    if (!masterId || !phone) return NextResponse.json({ error: "masterId and phone required" }, { status: 400 });

    // Get all appointments for this client
    const appts = await db
      .select({
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        serviceId: appointments.serviceId,
        clientName: appointments.clientName,
        clientTelegramId: appointments.clientTelegramId,
      })
      .from(appointments)
      .where(and(eq(appointments.masterId, masterId), eq(appointments.clientPhone, phone)))
      .orderBy(desc(appointments.id));

    // Get service info
    const allServices = await db.select({ id: services.id, name: services.name, price: services.price }).from(services);
    const svcMap: Record<number, { name: string; price: string }> = {};
    for (const s of allServices) svcMap[s.id] = { name: s.name, price: s.price || "0" };

    const visits = appts.map((a) => ({
      date: a.appointmentDate,
      time: a.startTime,
      serviceName: svcMap[a.serviceId]?.name || "Услуга",
      price: parseInt(svcMap[a.serviceId]?.price || "0") || 0,
    }));

    // Get note
    const [noteRow] = await db
      .select({ note: masterClientNotes.note })
      .from(masterClientNotes)
      .where(and(eq(masterClientNotes.masterId, masterId), eq(masterClientNotes.clientIdentifier, phone)));

    return NextResponse.json({
      name: appts[0]?.clientName || "",
      phone,
      telegramId: appts[0]?.clientTelegramId || null,
      visits,
      note: noteRow?.note || "",
    });
  } catch (error) {
    console.error("Client detail error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create client note route**

Create `app/api/master/clients/note/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { masterClientNotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { masterId, clientIdentifier, note } = await request.json();
    if (!masterId || !clientIdentifier) {
      return NextResponse.json({ error: "masterId and clientIdentifier required" }, { status: 400 });
    }

    const now = new Date().toISOString();

    const existing = await db
      .select({ id: masterClientNotes.id })
      .from(masterClientNotes)
      .where(and(eq(masterClientNotes.masterId, masterId), eq(masterClientNotes.clientIdentifier, clientIdentifier)));

    if (existing.length > 0) {
      await db
        .update(masterClientNotes)
        .set({ note, updatedAt: now })
        .where(eq(masterClientNotes.id, existing[0].id));
    } else {
      await db.insert(masterClientNotes).values({
        masterId,
        clientIdentifier,
        note,
        updatedAt: now,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Client note error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/master/clients/route.ts app/api/master/clients/detail/route.ts app/api/master/clients/note/route.ts
git commit -m "feat(master-miniapp): add clients API endpoints"
```

---

### Task 9: Clients Page

**Files:**
- Modify: `app/(master)/master/clients/page.tsx`

- [ ] **Step 1: Replace placeholder with full clients page**

Replace `app/(master)/master/clients/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import MasterTabBar from "@/components/master/MasterTabBar";

interface Client {
  name: string;
  phone: string;
  telegramId: string | null;
  visitCount: number;
  lastVisit: string;
}

interface ClientDetail {
  name: string;
  phone: string;
  telegramId: string | null;
  visits: { date: string; time: string; serviceName: string; price: number }[];
  note: string;
}

const MONTH_NAMES = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export default function MasterClientsPage() {
  const [masterId, setMasterId] = useState<number | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) return;
    tg.ready();
    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.valid) setMasterId(d.master.id); });
  }, []);

  const fetchClients = useCallback(async () => {
    if (!masterId) return;
    const res = await fetch(`/api/master/clients?masterId=${masterId}`);
    const d = await res.json();
    setClients(d.clients || []);
    setLoading(false);
  }, [masterId]);

  useEffect(() => { if (masterId) fetchClients(); }, [masterId, fetchClients]);

  const openDetail = async (client: Client) => {
    if (!masterId) return;
    setDetailLoading(true);
    setDetail(null);
    const res = await fetch(`/api/master/clients/detail?masterId=${masterId}&phone=${encodeURIComponent(client.phone)}`);
    const d = await res.json();
    setDetail(d);
    setNoteText(d.note || "");
    setDetailLoading(false);
  };

  const saveNote = async () => {
    if (!masterId || !detail) return;
    setNoteSaving(true);
    await fetch("/api/master/clients/note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ masterId, clientIdentifier: detail.phone, note: noteText }),
    });
    setNoteSaving(false);
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  // Detail view
  if (detail || detailLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pb-20">
        <div className="px-5 pt-5 pb-3">
          <button onClick={() => setDetail(null)} className="text-sm" style={{ color: "#B2223C" }}>← Назад</button>
        </div>

        {detailLoading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Загрузка...</div>
        ) : detail ? (
          <>
            {/* Client header */}
            <div className="px-5 mb-4">
              <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="text-base font-bold text-gray-900">{detail.name}</div>
                <div className="text-xs text-gray-500 mt-1">{detail.phone}</div>
                <div className="flex gap-2 mt-3">
                  <a
                    href={`tel:${detail.phone}`}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white text-center"
                    style={{ background: "#B2223C" }}
                  >
                    Позвонить
                  </a>
                  {detail.telegramId && (
                    <a
                      href={`tg://user?id=${detail.telegramId}`}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold text-center border"
                      style={{ color: "#B2223C", borderColor: "#B2223C" }}
                    >
                      Telegram
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="px-5 mb-4">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Заметки</h2>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onBlur={saveNote}
                placeholder="Заметка о клиенте..."
                className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-700 resize-none"
                rows={3}
              />
              {noteSaving && <div className="text-[10px] text-gray-400 mt-1">Сохранение...</div>}
            </div>

            {/* Visit history */}
            <div className="px-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">История визитов ({detail.visits.length})</h2>
              <div className="flex flex-col gap-2">
                {detail.visits.map((v, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-900">{v.serviceName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{formatDate(v.date)} · {v.time}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-700">{v.price.toLocaleString()} ₽</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <MasterTabBar />
      </div>
    );
  }

  // Client list view
  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20">
      <div className="px-5 pt-5 pb-2">
        <h1 className="text-lg font-bold text-gray-900">Клиенты</h1>
      </div>

      {/* Search */}
      <div className="px-5 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-700"
        />
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Клиентов не найдено</div>
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {filtered.map((c, i) => (
            <button
              key={i}
              onClick={() => openDetail(c)}
              className="bg-white rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.04)] flex justify-between items-center text-left w-full"
            >
              <div>
                <div className="text-sm font-medium text-gray-900">{c.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">{c.phone}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold" style={{ color: "#B2223C" }}>{c.visitCount} визитов</div>
                <div className="text-[10px] text-gray-400">{formatDate(c.lastVisit)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <MasterTabBar />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(master)/master/clients/page.tsx
git commit -m "feat(master-miniapp): implement Clients page with notes and contacts"
```

---

### Task 10: Build & Push

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: No errors. All new routes appear in output.

- [ ] **Step 2: Final commit and push**

```bash
git add -A
git commit -m "feat: masters mini-app Phase 2 — stats, finance, portfolio, clients"
git push origin main
```
