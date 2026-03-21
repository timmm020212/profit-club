"use client";

import { useEffect, useState } from "react";
import type { Appointment, Master, Service } from "@/db/schema";

interface AppointmentWithRelations extends Appointment {
  masterName?: string;
  serviceName?: string;
}

export default function EditAppointmentPage({
  searchParams,
}: {
  searchParams: { appointmentId?: string };
}) {
  const appointmentId = searchParams?.appointmentId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<AppointmentWithRelations | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedMasterId, setSelectedMasterId] = useState<number | null>(null);
  const [newDate, setNewDate] = useState<string>("");
  const [newStartTime, setNewStartTime] = useState<string>("");

  useEffect(() => {
    if (!appointmentId) {
      setError("Не передан ID записи");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/appointments/${appointmentId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Не удалось загрузить данные записи");
        }
        const data = await res.json();
        setAppointment(data.appointment);
        setMasters(data.masters || []);
        setServices(data.services || []);
        setSelectedMasterId(data.appointment.masterId || null);
        setNewDate(data.appointment.appointmentDate || "");
        setNewStartTime(data.appointment.startTime || "");
      } catch (e: any) {
        setError(e?.message || "Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [appointmentId]);

  if (!appointmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Ошибка</h1>
          <p className="text-sm text-slate-300">Не передан идентификатор записи.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 max-w-md w-full text-center">
          <p className="text-sm text-slate-300">Загрузка записи...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Ошибка</h1>
          <p className="text-sm text-slate-300">{error || "Запись не найдена"}</p>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appointmentId) return;
    setError(null);
    setSuccess(null);

    if (!selectedMasterId || !newDate || !newStartTime) {
      setError("Заполните мастера, дату и время");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          masterId: selectedMasterId,
          appointmentDate: newDate,
          startTime: newStartTime,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Не удалось сохранить изменения");
      }

      setSuccess("Запись успешно обновлена");
      setAppointment((prev) =>
        prev
          ? {
              ...prev,
              masterId: selectedMasterId,
              appointmentDate: newDate,
              startTime: data.appointment?.startTime || newStartTime,
              endTime: data.appointment?.endTime || prev.endTime,
              masterName: data.appointment?.masterName || prev.masterName,
            }
          : prev
      );

      try {
        // Пытаемся закрыть WebApp внутри Telegram, если доступен объект Telegram
        // @ts-ignore
        if (window && (window as any).Telegram && (window as any).Telegram.WebApp) {
          // @ts-ignore
          (window as any).Telegram.WebApp.close();
        }
      } catch {
        // игнорируем ошибки, если не в Telegram
      }
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения изменений");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl p-5 space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Редактирование записи</h1>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          {success && !error && (
            <p className="text-xs text-emerald-400">{success}</p>
          )}
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Услуга</span>
            <span className="font-medium">{appointment.serviceName || "Услуга"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Мастер</span>
            <span className="font-medium">{appointment.masterName || "Мастер"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Дата</span>
            <span className="font-medium">{appointment.appointmentDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Время</span>
            <span className="font-medium">
              {appointment.startTime}–{appointment.endTime}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs mt-1">
          <div className="space-y-1">
            <label className="block text-slate-300">Мастер</label>
            <select
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
              value={selectedMasterId ?? ""}
              onChange={(e) => setSelectedMasterId(Number(e.target.value) || null)}
            >
              <option value="">Выберите мастера</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300">Дата (ГГГГ-ММ-ДД)</label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              placeholder="2024-12-25"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-300">Время начала (ЧЧ:ММ)</label>
            <input
              type="text"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              placeholder="10:00"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed active:bg-slate-500 transition-colors text-sm font-medium py-2.5 mt-2"
          >
            {submitting ? "Сохранение..." : "Сохранить изменения"}
          </button>
        </form>
      </div>
    </div>
  );
}
