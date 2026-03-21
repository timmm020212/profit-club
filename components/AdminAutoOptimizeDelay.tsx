"use client";

import { useState, useEffect } from "react";

export default function AdminAutoOptimizeDelay() {
  const [minutes, setMinutes] = useState("5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        if (data.autoOptimizeDelayMinutes) setMinutes(data.autoOptimizeDelayMinutes);
      })
      .catch(() => {});
  }, []);

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

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
        </svg>
        <h3 className="text-xs font-semibold text-zinc-300">Авто-оптимизация</h3>
      </div>
      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[11px] text-zinc-500">
          Через сколько минут после записи отправлять предложения клиентам
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["1", "3", "5", "10", "15", "30"].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => handleSave(v)}
              disabled={saving}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                minutes === v
                  ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                  : "bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]"
              }`}
            >
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
