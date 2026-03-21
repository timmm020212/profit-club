"use client";

import { useState, useEffect, useRef } from "react";

interface OptEntry {
  id: number;
  masterId: number;
  masterName: string;
  workDate: string;
  status: string;
  createdAt: string;
  movesCount: number;
}

export default function AdminAutoOptimizeDelay() {
  const [minutes, setMinutes] = useState("5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<OptEntry[]>([]);
  const [countdowns, setCountdowns] = useState<Record<number, number>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load settings
  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        if (data.autoOptimizeDelayMinutes) setMinutes(data.autoOptimizeDelayMinutes);
      })
      .catch(() => {});
  }, []);

  // Poll for active optimizations
  useEffect(() => {
    const check = async () => {
      try {
        const [draftRes, sentRes] = await Promise.all([
          fetch("/api/admin/optimize-schedule?status=draft"),
          fetch("/api/admin/optimize-schedule?status=sent"),
        ]);
        const drafts = draftRes.ok ? await draftRes.json() : [];
        const sents = sentRes.ok ? await sentRes.json() : [];
        const all = [...(Array.isArray(drafts) ? drafts : []), ...(Array.isArray(sents) ? sents : [])];

        const mapped: OptEntry[] = all
          .filter((o: any) => o.moves && o.moves.length > 0)
          .map((o: any) => ({
            id: o.id,
            masterId: o.masterId,
            masterName: o.masterName || "Мастер",
            workDate: o.workDate,
            status: o.status,
            createdAt: o.createdAt,
            movesCount: o.moves?.length || 0,
          }));

        setEntries(mapped);

        // Calculate countdowns for drafts
        const delayMs = parseInt(minutes) * 60 * 1000;
        const newCountdowns: Record<number, number> = {};
        for (const e of mapped) {
          if (e.status === "draft") {
            const created = new Date(e.createdAt).getTime();
            const remaining = Math.max(0, Math.ceil((created + delayMs - Date.now()) / 1000));
            newCountdowns[e.id] = remaining;
          }
        }
        setCountdowns(prev => ({ ...prev, ...newCountdowns }));
      } catch {}
    };

    check();
    pollRef.current = setInterval(check, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [minutes]);

  // Tick countdowns
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setCountdowns(prev => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          const id = Number(k);
          if (next[id] > 0) next[id] -= 1;
        }
        return next;
      });
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
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

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" });
    } catch { return d; }
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
        </svg>
        <h3 className="text-xs font-semibold text-zinc-300">Авто-оптимизация</h3>
        {entries.length > 0 && (
          <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-violet-500/20 border border-violet-500/25 px-1 text-[9px] font-bold text-violet-300">
            {entries.length}
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Active optimizations per date */}
        {entries.length > 0 && (
          <div className="space-y-2">
            {entries.map(e => {
              const cd = countdowns[e.id];
              const isDraft = e.status === "draft";
              const isSent = e.status === "sent";

              return (
                <div
                  key={e.id}
                  className={`rounded-lg px-3 py-2 space-y-0.5 ${
                    isDraft
                      ? "bg-violet-500/[0.06] border border-violet-500/15"
                      : "bg-amber-500/[0.04] border border-amber-500/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-[11px] font-medium truncate ${isDraft ? "text-violet-300" : "text-amber-300"}`}>
                        {e.masterName}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {fmtDate(e.workDate)} · {e.movesCount} {e.movesCount === 1 ? "перенос" : "переноса"}
                      </p>
                    </div>
                    {isDraft && cd !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold tabular-nums bg-violet-500/15 border border-violet-500/25 text-violet-300 animate-pulse flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        {cd > 0 ? fmt(cd) : "..."}
                      </span>
                    )}
                    {isSent && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 border border-amber-500/15 text-amber-400 flex-shrink-0">
                        🕐 Ожидает ответов
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-600">
                    {isDraft && cd !== undefined && cd > 0 && `Отправка через ${fmt(cd)}`}
                    {isDraft && cd !== undefined && cd <= 0 && "⏳ Отправка..."}
                    {isSent && "Предложения отправлены клиентам"}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Delay setting */}
        <p className="text-[11px] text-zinc-500">
          Задержка перед отправкой
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["3", "5", "10", "15", "30"].map(v => (
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
