"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PreliminaryAppointment {
  id: number;
  masterId: number;
  serviceId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string | null;
  masterName?: string;
  serviceName?: string;
  hasWorkSlot?: boolean;
  fitsInSlot?: boolean;
}

interface Props {
  appointments: PreliminaryAppointment[];
}

const MONTH_NAMES = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

export default function AdminPreliminaryBookings({ appointments }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);

  if (appointments.length === 0) return null;

  const canConfirm = (apt: PreliminaryAppointment) => apt.hasWorkSlot && apt.fitsInSlot !== false;

  const toggleSelect = (id: number) => {
    const apt = appointments.find((a) => a.id === id);
    if (apt && !canConfirm(apt)) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const confirmableAppointments = appointments.filter(canConfirm);

  const selectAll = () => {
    if (selected.size === confirmableAppointments.length) setSelected(new Set());
    else setSelected(new Set(confirmableAppointments.map((a) => a.id)));
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setConfirming(true);
    try {
      await fetch("/api/admin/preliminary-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      setSelected(new Set());
      router.refresh();
    } catch (e) { console.error(e); }
    setConfirming(false);
  };

  return (
    <section className="rounded-2xl border border-violet-500/[0.15] bg-[#0D0D10] overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-violet-400">
              <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5v-3.5Z" clipRule="evenodd" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-violet-300">Предварительные записи</span>
          <span className="inline-flex items-center rounded-full bg-violet-500/15 border border-violet-500/20 px-2 py-0.5 text-xs font-bold text-violet-400">
            {appointments.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={selectAll} className="text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors">
            {selected.size === confirmableAppointments.length ? "Снять все" : "Выбрать все"}
          </button>
          {selected.size > 0 && (
            <button onClick={handleConfirm} disabled={confirming}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white disabled:opacity-50 transition-all">
              {confirming ? "..." : `✅ Подтвердить (${selected.size})`}
            </button>
          )}
        </div>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {appointments.map((apt) => {
          const isSelected = selected.has(apt.id);
          const isDisabled = !canConfirm(apt);
          const borderColor = apt.fitsInSlot === false ? "border-l-red-500/50" : apt.hasWorkSlot ? "border-l-emerald-500/50" : "border-l-zinc-500/30";
          return (
            <div key={apt.id} onClick={() => toggleSelect(apt.id)}
              className={`flex items-center gap-3 px-4 py-2.5 transition-colors border-l-2 ${borderColor} ${isDisabled ? "opacity-60" : "cursor-pointer hover:bg-white/[0.02]"}`}>
              {!isDisabled && (
                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                  isSelected ? "bg-violet-600 border-violet-500" : "border-zinc-600 bg-transparent"}`}>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-white">
                      <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200">{apt.serviceName || "Услуга"}</span>
                  <span className="text-[10px] text-zinc-500">{apt.clientName}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-violet-400 font-mono">{formatDate(apt.appointmentDate)} {apt.startTime}–{apt.endTime}</span>
                  <span className="text-[10px] text-zinc-600">• {apt.masterName || "Мастер"}</span>
                </div>
              </div>
              {apt.fitsInSlot === false && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex-shrink-0">Вне графика</span>
              )}
              {!apt.hasWorkSlot && apt.fitsInSlot !== false && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-500/10 text-zinc-500 border border-zinc-500/20 flex-shrink-0">Нет раб. дня</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
