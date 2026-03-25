"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Master, WorkSlot } from "@/db/schema";
import AdminSelect from "@/components/ui/AdminSelect";

function toDativeFullName(fullName: string): string {
  const parts = fullName.split(" ").filter(Boolean);
  if (!parts.length) return fullName;
  const inflectWord = (w: string) => {
    const lower = w.toLowerCase();
    if (lower.endsWith("ова")) return w.slice(0, -3) + "овой";
    if (lower.endsWith("ева")) return w.slice(0, -3) + "евой";
    if (lower.endsWith("ина")) return w.slice(0, -3) + "иной";
    if (lower.endsWith("ая")) return w.slice(0, -2) + "ой";
    if (lower.endsWith("а")) return w.slice(0, -1) + "е";
    if (lower.endsWith("я")) return w.slice(0, -1) + "е";
    return w;
  };
  return parts.map(inflectWord).join(" ");
}

interface Props {
  masters: Master[];
  currentDate: string;
}

export default function AdminWorkSlotsCreator({ masters, currentDate }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const [masterId, setMasterId] = useState<number | "">("");
  const [date, setDate] = useState(currentDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mastersMap = useMemo(() => new Map(masters.map((m) => [m.id, m.fullName] as const)), [masters]);
  const selectedMasterName = masterId ? mastersMap.get(Number(masterId)) : undefined;

  useEffect(() => { setDate(currentDate); }, [currentDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!masterId || !date || !startTime || !endTime) { setError("Заполните все поля"); return; }
    try {
      setLoading(true);
      try {
        const checkRes = await fetch(`/api/work-slots?masterId=${Number(masterId)}&date=${encodeURIComponent(date)}`);
        if (checkRes.ok) {
          const existing: WorkSlot[] = (await checkRes.json().catch(() => [])) || [];
          if (existing.length > 0) {
            setError(`У ${selectedMasterName || "мастера"} уже есть рабочий день`);
            setLoading(false);
            return;
          }
        }
      } catch {}

      const res = await fetch("/api/work-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterId: Number(masterId), workDate: date, startTime, endTime, adminName: session?.user?.name || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось создать рабочий день");

      const name = selectedMasterName ? toDativeFullName(selectedMasterName) : "мастеру";
      setSuccess(`Запрос отправлен ${name}`);
      setMasterId(""); setStartTime(""); setEndTime("");
      router.refresh();
      setTimeout(() => setSuccess(null), 4000);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/40 transition-all";

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3.5 border-b border-white/[0.05] flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600/15 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-violet-400">
            <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Новый рабочий день</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">Запрос уйдёт мастеру в Telegram</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/15 px-3 py-2 text-xs text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 mt-px">
              <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-10a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        {success && !error && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15 px-3 py-2 text-xs text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
              <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.844-9.031a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Мастер</label>
          <AdminSelect
            value={masterId}
            onChange={(v) => setMasterId(v === "" ? "" : Number(v))}
            options={masters.map((m) => ({ value: m.id, label: m.fullName || "" }))}
            placeholder="Выберите мастера"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Дата</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Начало</label>
            <input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Конец</label>
            <input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-all shadow-lg shadow-violet-900/20 mt-1"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Отправляем...
            </span>
          ) : "Отправить запрос"}
        </button>
      </form>
    </section>
  );
}
