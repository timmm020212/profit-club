"use client";

import { useState, useEffect, useRef } from "react";

export default function AdminAutoOptimizeDelay() {
  const [minutes, setMinutes] = useState("5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Timer state
  const [countdown, setCountdown] = useState<number | null>(null); // seconds left
  const [timerTarget, setTimerTarget] = useState<string | null>(null); // master+date being optimized
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(data => {
        if (data.autoOptimizeDelayMinutes) setMinutes(data.autoOptimizeDelayMinutes);
      })
      .catch(() => {});
  }, []);

  // Poll for pending optimizations (draft with sentAt = null)
  useEffect(() => {
    const check = async () => {
      try {
        // Check all recent optimizations
        const res = await fetch("/api/admin/optimize-schedule?status=draft");
        if (!res.ok) return;
        const data = await res.json();
        const drafts = Array.isArray(data) ? data.filter((o: any) => o.status === "draft" || o.status === "sent") : [];

        if (drafts.length > 0 && countdown === null) {
          // New draft found — start countdown
          const opt = drafts[0];
          const createdAt = new Date(opt.createdAt).getTime();
          const delayMs = parseInt(minutes) * 60 * 1000;
          const targetMs = createdAt + delayMs;
          const remainingMs = targetMs - Date.now();

          if (remainingMs > 0) {
            setTimerTarget(`${opt.masterName || "Мастер"} · ${opt.workDate}`);
            setCountdown(Math.ceil(remainingMs / 1000));
          } else if (opt.status === "draft") {
            // Timer passed but still draft — show "sending soon"
            setTimerTarget(`${opt.masterName || "Мастер"} · ${opt.workDate}`);
            setCountdown(0);
          } else {
            setCountdown(null);
            setTimerTarget(null);
          }
        } else if (drafts.length === 0) {
          setCountdown(null);
          setTimerTarget(null);
        }
      } catch {}
    };

    check();
    pollRef.current = setInterval(check, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [minutes, countdown]);

  // Countdown tick
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) return 0; // stay at 0, don't go null
        return prev - 1;
      });
    }, 1000);

    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [countdown]);

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
    } catch {} finally {
      setSaving(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
        </svg>
        <h3 className="text-xs font-semibold text-zinc-300">Авто-оптимизация</h3>
        {countdown !== null && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono font-bold tabular-nums bg-violet-500/15 border border-violet-500/25 text-violet-300 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            {countdown > 0 ? formatCountdown(countdown) : "..."}
          </span>
        )}
      </div>
      <div className="px-4 py-3 space-y-2.5">
        {countdown !== null && countdown >= 0 && timerTarget && (
          <div className="rounded-lg bg-violet-500/[0.06] border border-violet-500/15 px-3 py-2 space-y-1">
            <p className="text-[11px] text-violet-300 font-medium">
              {countdown > 0
                ? `Предложения отправятся через ${formatCountdown(countdown)}`
                : "⏳ Отправка предложений..."
              }
            </p>
            <p className="text-[10px] text-violet-400/50">{timerTarget}</p>
          </div>
        )}

        <p className="text-[11px] text-zinc-500">
          Задержка перед отправкой предложений
        </p>
        <div className="flex items-center gap-2">
          {["3", "5", "10", "15", "30"].map(v => (
            <button
              key={v}
              type="button"
              onClick={() => handleSave(v)}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
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
