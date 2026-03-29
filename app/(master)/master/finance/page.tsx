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
