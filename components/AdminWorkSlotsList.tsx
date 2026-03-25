"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { WorkSlot } from "@/db/schema";

export default function AdminWorkSlotsList({ masters, currentDate }: { masters: any[]; currentDate?: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<number[]>([]);
  const [pendingRequests, setPendingRequests] = useState<
    Record<number, { workDate: string; startTime: string; endTime: string }>
  >({});

  useEffect(() => {
    let cancelled = false;
    async function loadRequested() {
      try {
        const res = await fetch("/api/work-slot-change-requests");
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data)) return;
        const adminUpdateRequests = (data as any[]).filter((it) => it.type === "admin_update");
        const ids = adminUpdateRequests.map((it) => it.workSlotId as number);
        const bySlotId: Record<number, { workDate: string; startTime: string; endTime: string }> = {};
        adminUpdateRequests.forEach((it) => {
          bySlotId[it.workSlotId as number] = {
            workDate: it.suggestedWorkDate as string,
            startTime: it.suggestedStartTime as string,
            endTime: it.suggestedEndTime as string,
          };
        });
        if (!cancelled) { setRequestedIds(ids); setPendingRequests(bySlotId); }
      } catch {}
    }
    loadRequested();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/work-slots-admin");
        if (res.ok && !cancelled) setItems(await res.json());
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const mastersMap = new Map(masters.map((m) => [m.id, m.fullName] as const));

  async function handleSendRequest(
    slot: WorkSlot,
    updates: { workDate?: string; startTime?: string; endTime?: string }
  ) {
    try {
      setPending(true); setError(null);
      const res = await fetch("/api/work-slot-change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create_from_admin",
          workSlotId: slot.id,
          masterId: slot.masterId,
          suggestedWorkDate: updates.workDate ?? slot.workDate,
          suggestedStartTime: updates.startTime ?? slot.startTime,
          suggestedEndTime: updates.endTime ?? slot.endTime,
          adminName: session?.user?.name || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось отправить запрос");
      setRequestedIds((prev) => (prev.includes(slot.id) ? prev : [...prev, slot.id]));
      setPendingRequests((prev) => ({
        ...prev,
        [slot.id]: {
          workDate: updates.workDate ?? slot.workDate,
          startTime: updates.startTime ?? slot.startTime,
          endTime: updates.endTime ?? slot.endTime,
        },
      }));
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function handleConfirm(slot: WorkSlot) {
    try {
      setPending(true); setError(null);
      const res = await fetch(`/api/work-slots-admin?id=${slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isConfirmed: true, adminUpdateStatus: "accepted" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось подтвердить");
      setItems((prev) => prev.map((it) => it.id === slot.id ? { ...it, isConfirmed: true, adminUpdateStatus: "accepted" } : it));
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(slot: WorkSlot) {
    if (!confirm("Удалить этот рабочий день?")) return;
    try {
      setPending(true); setError(null);
      const res = await fetch(`/api/work-slots?id=${slot.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось удалить");
      setItems((prev) => prev.filter((it) => it.id !== slot.id));
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setPending(false);
    }
  }

  const filtered = currentDate ? items.filter((s) => s.workDate === currentDate) : items;

  if (!filtered.length) return null;

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0F0F13] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Рабочие дни мастеров</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {filtered.length} {filtered.length === 1 ? "запись" : filtered.length < 5 ? "записи" : "записей"}
          </p>
        </div>
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
            {error}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">Мастер</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">Дата</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">Время</th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-zinc-500">Статус</th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-zinc-500">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((slot) => {
              const isEditing = editingId === slot.id;
              const isRequestedLocal = requestedIds.includes(slot.id);
              const adminUpdateStatus = (slot as any).adminUpdateStatus as "pending" | "accepted" | "rejected" | undefined;
              const pendingRequest = pendingRequests[slot.id];
              const masterName = mastersMap.get(slot.masterId) || "Мастер";

              let displayStatus = '';
              if (adminUpdateStatus === 'accepted') displayStatus = 'accepted';
              else if (adminUpdateStatus === 'pending' || isRequestedLocal) displayStatus = 'pending';
              else if (adminUpdateStatus === 'rejected') displayStatus = 'rejected';
              else if ((slot as any).isConfirmed) displayStatus = 'confirmed';
              else displayStatus = 'unconfirmed';

              if (isEditing) {
                let localDate = slot.workDate;
                let localStart = slot.startTime;
                let localEnd = slot.endTime;

                return (
                  <tr key={slot.id} className="border-t border-white/[0.04] bg-violet-500/[0.03]">
                    <td className="px-5 py-3 text-zinc-100 font-medium">{masterName}</td>
                    <td className="px-5 py-3">
                      <input
                        type="date"
                        defaultValue={slot.workDate}
                        onChange={(e) => { localDate = e.target.value; }}
                        className="rounded-lg bg-[#1C1C22] border border-white/[0.1] px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          defaultValue={slot.startTime}
                          onChange={(e) => { localStart = e.target.value; }}
                          className="rounded-lg bg-[#1C1C22] border border-white/[0.1] px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 w-28"
                        />
                        <span className="text-zinc-600">—</span>
                        <input
                          type="time"
                          defaultValue={slot.endTime}
                          onChange={(e) => { localEnd = e.target.value; }}
                          className="rounded-lg bg-[#1C1C22] border border-white/[0.1] px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 w-28"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
                        Редактирование
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-50 transition-all"
                        >
                          Отмена
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleSendRequest(slot, { workDate: localDate, startTime: localStart, endTime: localEnd })}
                          className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white disabled:opacity-50 transition-all"
                        >
                          Отправить мастеру
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={slot.id} className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors group">
                  <td className="px-5 py-3 text-zinc-100 font-medium">{masterName}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-xs text-zinc-300 font-mono">
                      {slot.workDate}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-sm">
                    {pendingRequest && isRequestedLocal ? (
                      <span className="text-amber-300">
                        {pendingRequest.startTime} — {pendingRequest.endTime}
                      </span>
                    ) : (
                      <span className="text-zinc-300">{slot.startTime} — {slot.endTime}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {displayStatus === 'confirmed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Подтверждено
                        </span>
                      )}
                      {displayStatus === 'accepted' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Принято
                        </span>
                      )}
                      {(displayStatus === 'pending' || displayStatus === 'unconfirmed') && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          {displayStatus === 'pending' ? "Ожидает" : "Не подтверждено"}
                        </span>
                      )}
                      {displayStatus === 'rejected' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          Отклонено
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(displayStatus === 'pending' || displayStatus === 'unconfirmed') && (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleConfirm(slot)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/20 text-xs font-medium text-emerald-400 disabled:opacity-50 transition-all"
                        >
                          Подтвердить
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => { setEditingId(slot.id); setError(null); }}
                        className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-50 transition-all"
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDelete(slot)}
                        className="px-3 py-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 text-xs font-medium text-red-400 disabled:opacity-50 transition-all"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
