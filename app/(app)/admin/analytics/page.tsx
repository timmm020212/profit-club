"use client";

import { useEffect, useState, useCallback } from "react";
import AdminHeader from "@/components/AdminHeader";
import type { Master } from "@/db/schema";

interface AnalyticsData {
  period: number;
  summary: {
    total: number;
    confirmed: number;
    cancelled: number;
    pending: number;
    totalRevenue: number;
    cancelledRate: number;
  };
  revenueByDay: Record<string, number>;
  topServices: { name: string; count: number; revenue: number }[];
  masterWorkload: { name: string; count: number; minutes: number }[];
}

const PERIODS = [
  { label: "7 дней", value: 7 },
  { label: "30 дней", value: 30 },
  { label: "90 дней", value: 90 },
];

function formatRevenue(n: number): string {
  return n.toLocaleString("ru-RU") + " ₽";
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function RevenueChart({ data, period }: { data: Record<string, number>; period: number }) {
  const days: string[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }

  const values = days.map((d) => data[d] || 0);
  const max = Math.max(...values, 1);

  const SHOW_LABELS = period <= 30 ? period : Math.ceil(period / 7);
  const step = Math.ceil(days.length / SHOW_LABELS);

  return (
    <div className="flex items-end gap-0.5 h-32 w-full">
      {values.map((val, i) => {
        const height = Math.max((val / max) * 100, val > 0 ? 4 : 0);
        const date = days[i];
        const showLabel = i % step === 0 || i === days.length - 1;
        const dayNum = parseInt(date.split("-")[2]);
        return (
          <div key={date} className="flex flex-col items-center flex-1 min-w-0 h-full justify-end group relative">
            <div
              className="w-full rounded-t-sm transition-all duration-300"
              style={{
                height: `${height}%`,
                background: val > 0
                  ? "linear-gradient(to top, #7c3aed, #a78bfa)"
                  : "rgba(255,255,255,0.05)",
              }}
            />
            {showLabel && (
              <span className="text-[9px] text-zinc-600 mt-1 leading-none">{dayNum}</span>
            )}
            {val > 0 && (
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {formatRevenue(val)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<Master[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, mastersRes] = await Promise.all([
        fetch(`/api/admin/analytics?period=${period}`),
        fetch("/api/masters"),
      ]);
      const analytics = await analyticsRes.json();
      const mastersData = await mastersRes.json();
      setData(analytics);
      setMasters(mastersData);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxServiceCount = data ? Math.max(...data.topServices.map((s) => s.count), 1) : 1;
  const maxMasterCount = data ? Math.max(...data.masterWorkload.map((m) => m.count), 1) : 1;

  return (
    <div className="min-h-screen bg-[#0D0D11] text-white">
      <AdminHeader masters={masters} />

      <div className="max-w-screen-xl mx-auto px-4 lg:px-6 py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-white">Аналитика</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Данные по записям и выручке</p>
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/[0.07]">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  period === p.value
                    ? "bg-violet-600 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-violet-600/30 border-t-violet-600 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Выручка"
                value={formatRevenue(data.summary.totalRevenue)}
                sub={`за ${period} дней`}
                color="violet"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Записей"
                value={String(data.summary.confirmed)}
                sub="подтверждённых"
                color="emerald"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Ожидают"
                value={String(data.summary.pending)}
                sub="в обработке"
                color="amber"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Отменено"
                value={`${data.summary.cancelledRate}%`}
                sub={`${data.summary.cancelled} записей`}
                color="red"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* Revenue chart */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
              <h2 className="text-sm font-medium text-zinc-400 mb-4">Выручка по дням</h2>
              <RevenueChart data={data.revenueByDay} period={period} />
            </div>

            {/* Bottom two columns */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Top services */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">ТОП услуг</h2>
                {data.topServices.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Нет данных</p>
                ) : (
                  <div className="space-y-3">
                    {data.topServices.map((svc, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-zinc-200 truncate mr-2">{svc.name}</span>
                          <span className="text-sm text-zinc-400 flex-shrink-0">
                            {svc.count} зап.
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                            style={{ width: `${(svc.count / maxServiceCount) * 100}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{formatRevenue(svc.revenue)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Master workload */}
              <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-6">
                <h2 className="text-sm font-medium text-zinc-400 mb-4">Загруженность мастеров</h2>
                {data.masterWorkload.length === 0 ? (
                  <p className="text-zinc-600 text-sm">Нет данных</p>
                ) : (
                  <div className="space-y-3">
                    {data.masterWorkload.map((m, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-zinc-200 truncate mr-2">{m.name}</span>
                          <span className="text-sm text-zinc-400 flex-shrink-0">
                            {m.count} зап.
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-500"
                            style={{ width: `${(m.count / maxMasterCount) * 100}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-zinc-600 mt-0.5">{formatHours(m.minutes)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-zinc-500 text-center py-24">Не удалось загрузить данные</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  color: "violet" | "emerald" | "amber" | "red";
  icon: React.ReactNode;
}) {
  const colors = {
    violet: "bg-violet-600/10 text-violet-400 border-violet-500/20",
    emerald: "bg-emerald-600/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-600/10 text-amber-400 border-amber-500/20",
    red: "bg-red-600/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
      <div className={`inline-flex p-2 rounded-lg border ${colors[color]} mb-3`}>{icon}</div>
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      <p className="text-xs text-zinc-600 mt-1">{sub}</p>
    </div>
  );
}
