"use client";

import { useEffect, useState } from "react";

export default function AdminOptimizeSettings() {
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [hours, setHours] = useState(24);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("pc_auto_optimize");
      if (saved === "true") setAutoOptimize(true);
      const savedH = localStorage.getItem("pc_auto_optimize_hours");
      if (savedH) {
        const parsed = parseInt(savedH, 10);
        if (!isNaN(parsed) && parsed > 0) setHours(parsed);
      }
    } catch {}
  }, []);

  const toggleAuto = () => {
    const next = !autoOptimize;
    setAutoOptimize(next);
    try { localStorage.setItem("pc_auto_optimize", String(next)); } catch {}
  };

  const changeHours = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      setHours(n);
      try { localStorage.setItem("pc_auto_optimize_hours", String(n)); } catch {}
    }
  };

  if (!mounted) return null;

  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 space-y-3">
      <div className="flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-violet-400 flex-shrink-0">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
        </svg>
        <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">Авто-оптимизация</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-400">Авто-оптимизация</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">Автоматически предлагать перенос записей</p>
        </div>
        <button
          type="button"
          onClick={toggleAuto}
          className={`relative flex-shrink-0 w-10 h-[22px] rounded-full transition-colors duration-200 ${autoOptimize ? "bg-violet-600" : "bg-white/[0.08]"}`}
        >
          <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${autoOptimize ? "left-[22px]" : "left-[3px]"}`} />
        </button>
      </div>

      {autoOptimize && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-400">Часов до записи</p>
          <input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => changeHours(e.target.value)}
            className="w-16 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2 py-1 text-xs text-zinc-100 text-center focus:outline-none focus:border-violet-500/40 transition-all"
          />
        </div>
      )}
    </div>
  );
}
