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
