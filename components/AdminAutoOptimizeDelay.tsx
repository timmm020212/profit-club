"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export default function AdminAutoOptimizeDelay() {
  const [minutes, setMinutes] = useState("5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nextSendIn, setNextSendIn] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => { if (data.autoOptimizeDelayMinutes) setMinutes(data.autoOptimizeDelayMinutes); })
      .catch(() => {});
  }, []);

  // Poll for draft optimizations to show timer
  const checkDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/optimize-schedule?status=draft");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const draft = data[0];
        const createdMs = new Date(draft.createdAt).getTime();
        const delayMs = parseInt(minutes) * 60 * 1000;
        const remaining = Math.max(0, Math.ceil((createdMs + delayMs - Date.now()) / 1000));
        setNextSendIn(remaining);
      } else {
        setNextSendIn(null);
      }
    } catch {}
  }, [minutes]);

  useEffect(() => {
    checkDrafts();
    pollRef.current = setInterval(checkDrafts, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkDrafts]);

  // Tick countdown
  useEffect(() => {
    if (nextSendIn === null || nextSendIn <= 0) return;
    tickRef.current = setInterval(() => {
      setNextSendIn(prev => prev !== null && prev > 0 ? prev - 1 : null);
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [nextSendIn]);

  const handleSave = async (val: string) => {
    setMinutes(val);
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "autoOptimizeDelayMinutes", value: val }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {} finally { setSaving(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
        </svg>
        <h3 className="text-xs font-semibold text-zinc-300">Авто-оптимизация</h3>
        {nextSendIn !== null && nextSendIn > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono font-bold tabular-nums bg-violet-500/15 border border-violet-500/25 text-violet-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            {fmt(nextSendIn)}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {nextSendIn !== null && nextSendIn > 0 && (
          <p className="text-[11px] text-violet-300">
            Предложения отправятся через {fmt(nextSendIn)}
          </p>
        )}
        {nextSendIn === 0 && (
          <p className="text-[11px] text-violet-300 animate-pulse">
            ⏳ Отправка предложений...
          </p>
        )}
        <p className="text-[11px] text-zinc-500">Задержка перед отправкой</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["1", "3", "5", "10", "15", "30"].map(v => (
            <button key={v} type="button" onClick={() => handleSave(v)} disabled={saving}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                minutes === v ? "bg-violet-600/20 border-violet-500/30 text-violet-300" : "bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
              }`}>
              {v} мин
            </button>
          ))}
        </div>
        {saved && (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
            </svg>
            Сохранено
          </p>
        )}
      </div>
    </div>
  );
}
