"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Props {
  masterId: number;
  workDate: string;
  masterName: string;
}

export default function AdminAutoOptimizeDelay({ masterId, workDate, masterName }: Props) {
  const [minutes, setMinutes] = useState("5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [nextSendIn, setNextSendIn] = useState<number | null>(null);
  const [optStatus, setOptStatus] = useState<string | null>(null); // draft, sent, null
  const [movesInfo, setMovesInfo] = useState<{ total: number; accepted: number; pending: number }>({ total: 0, accepted: 0, pending: 0 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load global delay setting
  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => { if (data.autoOptimizeDelayMinutes) setMinutes(data.autoOptimizeDelayMinutes); })
      .catch(() => {});
  }, []);

  // Poll for this master+date optimization
  const checkOpt = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/optimize-schedule?masterId=${masterId}&workDate=${workDate}`);
      if (!res.ok) return;
      const data = await res.json();
      const active = Array.isArray(data) ? data.find((o: any) => o.status !== "completed") : null;

      if (active) {
        setOptStatus(active.status);
        const moves = active.moves || [];
        setMovesInfo({
          total: moves.length,
          accepted: moves.filter((m: any) => m.status === "accepted" || m.clientResponse === "accepted").length,
          pending: moves.filter((m: any) => m.status === "sent" || m.status === "pending" || m.clientResponse === "pending").length,
        });

        if (active.status === "draft") {
          const createdMs = new Date(active.createdAt).getTime();
          const delayMs = parseInt(minutes) * 60 * 1000;
          const remaining = Math.max(0, Math.ceil((createdMs + delayMs - Date.now()) / 1000));
          setNextSendIn(remaining);
        } else {
          setNextSendIn(null);
        }
      } else {
        setOptStatus(null);
        setNextSendIn(null);
        setMovesInfo({ total: 0, accepted: 0, pending: 0 });
      }
    } catch {}
  }, [masterId, workDate, minutes]);

  useEffect(() => {
    checkOpt();
    pollRef.current = setInterval(checkOpt, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkOpt]);

  // Tick countdown
  useEffect(() => {
    if (nextSendIn === null || nextSendIn <= 0) return;
    tickRef.current = setInterval(() => {
      setNextSendIn(prev => prev !== null && prev > 0 ? prev - 1 : prev);
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

  const initials = masterName.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase();

  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center gap-2.5 border-b border-white/[0.04]">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600/30 to-violet-800/20 border border-violet-500/20 text-[9px] font-bold text-violet-300 flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-medium text-zinc-200 truncate">{masterName}</p>
        </div>

        {/* Status indicator */}
        {nextSendIn !== null && nextSendIn > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold tabular-nums bg-violet-500/15 border border-violet-500/25 text-violet-300 animate-pulse flex-shrink-0">
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            {fmt(nextSendIn)}
          </span>
        )}
        {nextSendIn === 0 && optStatus === "draft" && (
          <span className="text-[9px] text-violet-300 animate-pulse flex-shrink-0">⏳</span>
        )}
        {optStatus === "sent" && movesInfo.accepted > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 flex-shrink-0">
            ✅ {movesInfo.accepted}
          </span>
        )}
        {optStatus === "sent" && movesInfo.pending > 0 && movesInfo.accepted === 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium bg-amber-500/10 border border-amber-500/15 text-amber-400 flex-shrink-0">
            🕐 {movesInfo.pending}
          </span>
        )}
        {!optStatus && (
          <span className="text-[9px] text-zinc-600 flex-shrink-0">—</span>
        )}
      </div>

      {/* Status text */}
      {optStatus && (
        <div className="px-3 py-2 text-[10px] text-zinc-500">
          {optStatus === "draft" && nextSendIn !== null && nextSendIn > 0 && (
            <span className="text-violet-400">Отправка через {fmt(nextSendIn)}</span>
          )}
          {optStatus === "draft" && (nextSendIn === null || nextSendIn <= 0) && (
            <span className="text-violet-400 animate-pulse">⏳ Отправка...</span>
          )}
          {optStatus === "sent" && movesInfo.pending > 0 && (
            <span className="text-amber-400">Ожидает ответов: {movesInfo.pending}</span>
          )}
          {optStatus === "sent" && movesInfo.pending === 0 && movesInfo.accepted > 0 && (
            <span className="text-emerald-400">Все ответили — нажмите ⚡ Применить</span>
          )}
        </div>
      )}
    </div>
  );
}

// Separate component for global delay setting
export function AdminOptimizeDelaySettings() {
  const [minutes, setMinutes] = useState("5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => { if (data.autoOptimizeDelayMinutes) setMinutes(data.autoOptimizeDelayMinutes); })
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
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Задержка отправки</p>
      <div className="flex items-center gap-1 flex-wrap">
        {["1", "3", "5", "10", "15", "30"].map(v => (
          <button key={v} type="button" onClick={() => handleSave(v)} disabled={saving}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              minutes === v ? "bg-violet-600/20 border-violet-500/30 text-violet-300" : "bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:text-zinc-400"
            }`}>
            {v}м
          </button>
        ))}
      </div>
      {saved && <p className="text-[9px] text-emerald-400">✓ Сохранено</p>}
    </div>
  );
}
