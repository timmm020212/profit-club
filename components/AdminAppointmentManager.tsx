"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Appointment, Master, Service } from "@/db/schema";
import AdminSelect from "@/components/ui/AdminSelect";

interface Props {
  appointment: Appointment;
  masters: Master[];
  services: Service[];
  cardHeight?: number;
}

const STATUS_COLORS: Record<string, { border: string; badge: string; label: string }> = {
  confirmed: { border: "rgba(156,163,175,0.5)", badge: "bg-gray-500/20 text-gray-400", label: "Подтверждена" },
  in_progress: { border: "rgba(59,130,246,0.6)", badge: "bg-blue-500/20 text-blue-400", label: "В процессе" },
  completed_by_master: { border: "rgba(245,158,11,0.6)", badge: "bg-amber-500/20 text-amber-400", label: "Ожидает" },
  completed: { border: "rgba(34,197,94,0.6)", badge: "bg-green-500/20 text-green-400", label: "Завершена" },
  disputed: { border: "rgba(239,68,68,0.6)", badge: "bg-red-500/20 text-red-400", label: "Оспорена" },
};

export default function AdminAppointmentManager({ appointment, masters, services, cardHeight }: Props) {
  const router = useRouter();
  const statusCfg = STATUS_COLORS[appointment.status] || STATUS_COLORS.confirmed;

  const [isOpen, setIsOpen] = useState(false);
  const [masterId, setMasterId] = useState<number>(appointment.masterId);
  const [serviceId, setServiceId] = useState<number>(appointment.serviceId);
  const [appointmentDate, setAppointmentDate] = useState<string>(appointment.appointmentDate);
  const [startTime, setStartTime] = useState<string>(appointment.startTime);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId]
  );

  const computedEndTime = useMemo(() => {
    if (!currentService) return null;
    const m = String(startTime || "").match(/^(\d{2}):(\d{2})$/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
    const startMinutes = h * 60 + min;
    const endMinutes = startMinutes + Number(currentService.duration);
    if (!Number.isFinite(endMinutes) || endMinutes > 24 * 60) return "__invalid__";
    const eh = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const em = (endMinutes % 60).toString().padStart(2, "0");
    return `${eh}:${em}`;
  }, [currentService, startTime]);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(appointmentDate + "T00:00:00");
      return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", weekday: "short" });
    } catch {
      return appointmentDate;
    }
  }, [appointmentDate]);

  const masterOptions = useMemo(
    () => masters.slice().sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "")),
    [masters]
  );

  const serviceOptions = useMemo(
    () => services.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [services]
  );

  const handleOpen = () => { setIsOpen(true); setError(null); setSuccess(null); };
  const handleClose = () => { if (saving || deleting) return; setIsOpen(false); };

  async function handleSave() {
    try {
      setSaving(true); setError(null); setSuccess(null);
      if (computedEndTime === "__invalid__") throw new Error("Время окончания выходит за пределы дня");
      const res = await fetch("/api/appointments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id, masterId, serviceId, appointmentDate, startTime }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось обновить запись");
      setSuccess("Запись обновлена");
      router.refresh();
      setTimeout(() => setIsOpen(false), 500);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true); setError(null);
      const res = await fetch(`/api/appointments?id=${appointment.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось удалить запись");
      router.refresh();
      setTimeout(() => setIsOpen(false), 300);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setDeleting(false);
    }
  }

  const isTiny = (cardHeight ?? 999) < 38;
  const isCompact = (cardHeight ?? 999) < 72;

  const card = (
    <button
      type="button"
      onClick={handleOpen}
      className="group w-full h-full text-left rounded-lg border border-white/[0.08] bg-[#16161B] hover:border-violet-500/40 hover:bg-violet-500/5 transition-all duration-200 overflow-hidden"
      style={{ borderLeft: `2px solid ${statusCfg.border}` }}
    >
      {isTiny ? (
        /* Ultra-compact: одна строка — время + имя + статус */
        <div className="flex items-center h-full px-2 gap-2">
          <span className="text-[10px] font-bold tabular-nums whitespace-nowrap flex-shrink-0" style={{ color: statusCfg.border }}>
            {appointment.startTime}
          </span>
          <span className="text-[10px] text-zinc-300 truncate">
            {appointment.clientName}
          </span>
          <span className={`text-[7px] font-semibold px-1 py-0.5 rounded-full flex-shrink-0 ${statusCfg.badge}`}>
            {statusCfg.label}
          </span>
        </div>
      ) : isCompact ? (
        /* Компактный: время + услуга + клиент + статус */
        <div className="flex flex-col justify-between h-full px-2 py-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold tabular-nums" style={{ color: statusCfg.border }}>
              {appointment.startTime}–{appointment.endTime}
            </span>
            <span className={`text-[7px] font-semibold px-1 py-0.5 rounded-full ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-zinc-100 truncate leading-tight">
            {currentService ? currentService.name : "Услуга"}
          </div>
          <div className="text-[10px] text-zinc-400 truncate">{appointment.clientName}</div>
        </div>
      ) : (
        /* Полный вид */
        <div className="px-2.5 py-2">
          <div className="flex items-start justify-between gap-1.5 mb-1">
            <span className="text-[11px] font-bold text-violet-400 tabular-nums">
              {appointment.startTime}–{appointment.endTime}
            </span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-white/[0.05] text-zinc-600 flex-shrink-0">
              #{appointment.id}
            </span>
          </div>
          <div className="text-xs font-semibold text-zinc-100 leading-snug mb-1 truncate">
            {currentService ? currentService.name : "Услуга"}
          </div>
          <div className="text-[11px] text-zinc-400 truncate">{appointment.clientName}</div>
          <div className={`text-[8px] font-semibold mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full ${statusCfg.badge}`}>
            {statusCfg.label}{(appointment as any).autoCompleted ? " (авто)" : ""}
          </div>
          {appointment.clientPhone && (cardHeight ?? 999) >= 110 && (
            <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{appointment.clientPhone}</div>
          )}
          <div className="mt-1.5 h-px bg-gradient-to-r from-violet-500/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </button>
  );

  return (
    <>
      {card}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0F0F13] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-violet-400 mb-1">
                  Управление записью
                </p>
                <h2 className="text-base font-semibold text-white">
                  {appointment.clientName}
                  <span className="ml-2 text-xs font-normal text-zinc-500">#{appointment.id}</span>
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {formattedDate} · {appointment.startTime}–{appointment.endTime}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.1] transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Alerts */}
            {(error || success) && (
              <div className="px-5 pt-3">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}
                {success && !error && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    {success}
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <div className="px-5 py-4 grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-400">Мастер</label>
                <AdminSelect
                  value={masterId}
                  onChange={(v) => setMasterId(Number(v))}
                  options={masterOptions.map((m) => ({ value: m.id, label: m.fullName || "" }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-400">Услуга</label>
                <AdminSelect
                  value={serviceId}
                  onChange={(v) => setServiceId(Number(v))}
                  options={serviceOptions.map((s) => ({ value: s.id, label: s.name }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-400">Дата визита</label>
                <input
                  type="date"
                  className="rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-400">
                  Время начала
                  {computedEndTime && computedEndTime !== "__invalid__" && (
                    <span className="ml-2 font-normal text-zinc-500">→ {computedEndTime}</span>
                  )}
                  {currentService && (
                    <span className="ml-2 font-normal text-zinc-600">({currentService.duration} мин)</span>
                  )}
                </label>
                <input
                  type="time"
                  className="rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-white/[0.06] bg-black/20">
              <button
                type="button"
                disabled={deleting || saving}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600/15 hover:bg-red-600/25 border border-red-500/20 text-sm font-medium text-red-400 transition-all disabled:opacity-50"
              >
                {deleting ? (
                  <span className="animate-pulse">Удаляем...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
                    </svg>
                    Удалить
                  </>
                )}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={saving || deleting}
                  className="px-4 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07] transition-all disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={saving || deleting}
                  onClick={handleSave}
                  className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-violet-900/30"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Сохраняем...
                    </span>
                  ) : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
