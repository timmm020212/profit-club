"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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

export default function AdminWorkSlotChangeRequests() {
  useSession();
  const [items, setItems] = useState<ChangeRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

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
      const res = await fetch(`/api/work-slot-change-requests?id=${id}&action=${action}`, {
        method: "PATCH",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось обработать запрос");
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setActionId(null);
    }
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
          const isCancelUpdate = item.type === "cancel_update";
          const isProcessing = actionId === item.id;

          return (
            <div key={item.id} className="px-4 py-3.5 space-y-3">
              {/* Master info */}
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-zinc-300 text-[11px] font-bold flex-shrink-0">
                  {(item.masterName || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-white block truncate">{item.masterName || "Мастер"}</span>
                </div>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isCancelUpdate
                    ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                    : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                }`}>
                  {isCancelUpdate ? "Отмена" : "Изменение"}
                </span>
              </div>

              {/* Time change visual */}
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2.5 space-y-1.5">
                {item.currentWorkDate !== item.suggestedWorkDate && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-600 w-10 flex-shrink-0">дата</span>
                    <span className="font-mono text-zinc-400">{item.currentWorkDate}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-amber-500 flex-shrink-0">
                      <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                    </svg>
                    <span className="font-mono text-amber-300 font-semibold">{item.suggestedWorkDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-600 w-10 flex-shrink-0">время</span>
                  <span className="font-mono text-zinc-400">{item.currentStartTime}–{item.currentEndTime}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-amber-500 flex-shrink-0">
                    <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                  </svg>
                  <span className="font-mono text-amber-300 font-semibold">{item.suggestedStartTime}–{item.suggestedEndTime}</span>
                </div>
              </div>

              {/* Actions */}
              {isCancelUpdate ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleAction(item.id, "accept")}
                  className="w-full py-2 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/20 text-xs font-semibold text-sky-400 disabled:opacity-50 transition-all"
                >
                  {isProcessing ? <span className="animate-pulse">Обработка...</span> : "Отменить изменение"}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction(item.id, "reject")}
                    className="py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.07] disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? "..." : "Отклонить"}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleAction(item.id, "accept")}
                    className="py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-xs font-semibold text-emerald-400 disabled:opacity-50 transition-all"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="h-3 w-3 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
                        Принято
                      </span>
                    ) : "Принять"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
