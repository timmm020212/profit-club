"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ChangeRequestItem {
  id: number;
  workSlotId: number;
  masterId: number;
  masterName: string | null;
  suggestedWorkDate: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  currentWorkDate: string;
  currentStartTime: string;
  currentEndTime: string;
  status: string;
  createdAt: string | null;
  type?: string;
}

function formatDateDisplay(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

function generateDates(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

function timeOptions(fromHour: number, toHour: number): string[] {
  const opts: string[] = [];
  for (let h = fromHour; h <= toHour; h++) opts.push(`${String(h).padStart(2, "0")}:00`);
  return opts;
}

export default function AdminWorkSlotChangeRequests() {
  useSession();
  const router = useRouter();
  const [items, setItems] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  // Re-offer form state
  const [reofferId, setReofferId] = useState<number | null>(null);
  const [reoStep, setReoStep] = useState<"date" | "start" | "end" | null>(null);
  const [reoDate, setReoDate] = useState("");
  const [reoStart, setReoStart] = useState("");
  const [reoSending, setReoSending] = useState(false);

  async function load() {
    try {
      setLoading(true); setError(null);
      const res = await fetch("/api/work-slot-change-requests");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Ошибка загрузки");
      setItems(data || []);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(id: number, action: "accept" | "reject") {
    try {
      setActionId(id); setError(null);
      const res = await fetch(`/api/work-slot-change-requests?id=${id}&action=${action}`, { method: "PATCH" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось обработать запрос");
      setItems((prev) => prev.filter((it) => it.id !== id));
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setActionId(null);
    }
  }

  async function handleReoffer(item: ChangeRequestItem, endTime: string) {
    try {
      setReoSending(true); setError(null);
      // Create new work slot for this master
      const res = await fetch("/api/work-slots-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: item.masterId,
          workDate: reoDate,
          startTime: reoStart,
          endTime,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось создать рабочий день");

      // Close the rejection request
      await fetch(`/api/work-slot-change-requests?id=${item.id}&action=accept`, { method: "PATCH" });
      setItems((prev) => prev.filter((it) => it.id !== item.id));
      setReofferId(null); setReoStep(null); setReoDate(""); setReoStart("");
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setReoSending(false);
    }
  }

  function startReoffer(id: number) {
    setReofferId(id); setReoStep("date"); setReoDate(""); setReoStart("");
  }

  function cancelReoffer() {
    setReofferId(null); setReoStep(null); setReoDate(""); setReoStart("");
  }

  const visibleItems = items.filter((it) => it.type !== "admin_update");

  if (loading && !items.length && !error) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] px-4 py-4">
        <div className="flex items-center gap-2.5 text-zinc-600">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-700 border-t-zinc-500 animate-spin" />
          <span className="text-xs">Загрузка...</span>
        </div>
      </section>
    );
  }

  if (!visibleItems.length) return null;

  return (
    <section className="rounded-2xl border border-amber-500/20 bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3.5 border-b border-amber-500/10 flex items-center gap-2.5">
        <span className="relative flex-shrink-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-amber-400">
              <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.01-1 2.588 0l6.7 11.5c.577 1-.144 2.25-1.294 2.25H1.295C.145 16-.576 14.75 0 13.75l6.7-11.5ZM8 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black">
            {visibleItems.length}
          </span>
        </span>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Запросы мастеров</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Ожидают вашего решения</p>
        </div>
        {error && <span className="ml-auto text-[11px] text-red-400">{error}</span>}
      </div>

      <div className="divide-y divide-white/[0.04]">
        {visibleItems.map((item) => {
          const isCancel = item.type === "cancel" || item.type === "cancel_update";
          const isRejection = item.type === "master_rejection";
          const isProcessing = actionId === item.id;
          const isReoffering = reofferId === item.id;

          // Badge style
          let badgeClass = "bg-amber-500/10 border border-amber-500/20 text-amber-400";
          let badgeText = "Изменение времени";
          if (isCancel) { badgeClass = "bg-red-500/10 border border-red-500/20 text-red-400"; badgeText = "Отмена дня"; }
          if (isRejection) { badgeClass = "bg-red-500/10 border border-red-500/20 text-red-400"; badgeText = "Отклонено мастером"; }

          return (
            <div key={item.id} className="px-4 py-3.5 space-y-3">
              {/* Master info */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 text-[11px] font-bold flex-shrink-0">
                  {(item.masterName || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white block truncate">{item.masterName || "Мастер"}</span>
                  <span className="text-[11px] text-zinc-600">{formatDateDisplay(item.currentWorkDate)}</span>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}>
                  {badgeText}
                </span>
              </div>

              {/* Info */}
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 space-y-1.5">
                {!isRejection && item.currentWorkDate !== item.suggestedWorkDate && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-600 w-10 flex-shrink-0">дата</span>
                    <span className="font-mono text-zinc-400">{item.currentWorkDate}</span>
                    <span className="text-amber-500">→</span>
                    <span className="font-mono text-amber-300 font-semibold">{item.suggestedWorkDate}</span>
                  </div>
                )}
                {isRejection ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-600 w-10 flex-shrink-0">время</span>
                    <span className="font-mono text-zinc-400">{item.currentStartTime}–{item.currentEndTime}</span>
                    <span className="text-red-400 text-[10px] ml-1">отклонено</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-600 w-10 flex-shrink-0">время</span>
                    <span className="font-mono text-zinc-400">{item.currentStartTime}–{item.currentEndTime}</span>
                    <span className="text-amber-500">→</span>
                    <span className="font-mono text-amber-300 font-semibold">{item.suggestedStartTime}–{item.suggestedEndTime}</span>
                  </div>
                )}
              </div>

              {/* Re-offer form */}
              {isReoffering && (
                <div className="rounded-lg bg-violet-500/[0.05] border border-violet-500/15 px-3 py-3 space-y-2.5">
                  <p className="text-[11px] font-semibold text-violet-300">Предложить другое время</p>

                  {reoStep === "date" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-zinc-500">Выберите дату:</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {generateDates(14).map(d => (
                          <button key={d} type="button" onClick={() => { setReoDate(d); setReoStep("start"); }}
                            className="py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[10px] text-zinc-300 hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300 transition-all truncate">
                            {formatDateDisplay(d)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {reoStep === "start" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-zinc-500">{formatDateDisplay(reoDate)} — начало смены:</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {timeOptions(7, 14).map(t => (
                          <button key={t} type="button" onClick={() => { setReoStart(t); setReoStep("end"); }}
                            className="py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[11px] text-zinc-300 hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300 transition-all">
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {reoStep === "end" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-zinc-500">{formatDateDisplay(reoDate)}, {reoStart} — конец смены:</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(() => {
                          const startH = parseInt(reoStart.split(":")[0]);
                          return timeOptions(startH + 4, Math.min(startH + 12, 23)).map(t => (
                            <button key={t} type="button" onClick={() => handleReoffer(item, t)} disabled={reoSending}
                              className="py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] text-[11px] text-zinc-300 hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300 disabled:opacity-50 transition-all">
                              {reoSending ? "..." : t}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  )}

                  <button type="button" onClick={cancelReoffer} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">Отмена</button>
                </div>
              )}

              {/* Actions */}
              {!isReoffering && (
                <>
                  {isRejection ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={isProcessing} onClick={() => handleAction(item.id, "accept")}
                        className="py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.07] disabled:opacity-50 transition-all">
                        {isProcessing ? "..." : "Удалить день"}
                      </button>
                      <button type="button" onClick={() => startReoffer(item.id)}
                        className="py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/20 text-xs font-semibold text-violet-400 transition-all">
                        Предложить другое
                      </button>
                    </div>
                  ) : isCancel ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={isProcessing} onClick={() => handleAction(item.id, "reject")}
                        className="py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.07] disabled:opacity-50 transition-all">
                        {isProcessing ? "..." : "Отклонить"}
                      </button>
                      <button type="button" disabled={isProcessing} onClick={() => handleAction(item.id, "accept")}
                        className="py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 text-xs font-semibold text-red-400 disabled:opacity-50 transition-all">
                        {isProcessing ? "..." : "Подтвердить отмену"}
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={isProcessing} onClick={() => handleAction(item.id, "reject")}
                        className="py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.07] disabled:opacity-50 transition-all">
                        {isProcessing ? "..." : "Отклонить"}
                      </button>
                      <button type="button" disabled={isProcessing} onClick={() => handleAction(item.id, "accept")}
                        className="py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-xs font-semibold text-emerald-400 disabled:opacity-50 transition-all">
                        {isProcessing ? "..." : "Принять"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
