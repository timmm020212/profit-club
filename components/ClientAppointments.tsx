"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const BookingModal = dynamic(() => import("./BookingModal"), { ssr: false });

const FONT = "var(--font-montserrat)";
const FONT_HEADING = "var(--font-playfair)";

interface Appointment {
  id: number;
  serviceId: number;
  serviceName: string | null;
  servicePrice: string | null;
  serviceDuration: number | null;
  masterId: number;
  masterName: string | null;
  masterSpecialization: string | null;
  masterPhotoUrl: string | null;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  clientName: string;
}

interface BookingService {
  id: number;
  name: string;
  description?: string | null;
  price?: string | null;
  duration?: number | string | null;
  executorRole?: string | null;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("ru-RU", { weekday: "short" });
  const day = date.getDate();
  const month = date.toLocaleDateString("ru-RU", { month: "long" });
  return `${weekday}, ${day} ${month}`;
}

function canModify(dateStr: string, timeStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const apptTime = new Date(y, m - 1, d, h, min);
  const now = new Date();
  return apptTime.getTime() - now.getTime() >= 2 * 60 * 60 * 1000;
}

export default function ClientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [bookingService, setBookingService] = useState<BookingService | null>(null);

  const clientId = typeof window !== "undefined"
    ? localStorage.getItem("profit_club_client_id")
    : null;

  const fetchAppointments = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    try {
      const res = await fetch(
        `/api/clients/appointments?clientId=${clientId}&status=confirmed&future=true`
      );
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    setCancelError("");
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.error || "Ошибка при отмене");
        return;
      }
      setConfirmCancelId(null);
      await fetchAppointments();
    } catch {
      setCancelError("Ошибка сети");
    } finally {
      setCancellingId(null);
    }
  };

  const openRebook = (appt: Appointment) => {
    setBookingService({
      id: appt.serviceId,
      name: appt.serviceName || "Услуга",
      price: appt.servicePrice,
      duration: appt.serviceDuration,
      executorRole: appt.masterSpecialization,
    });
  };

  if (loading) {
    return (
      <section>
        <h2
          className="text-xl font-semibold text-white mb-4"
          style={{ fontFamily: FONT_HEADING }}
        >
          Предстоящие записи
        </h2>
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 rounded-full border-2 border-[#B2223C]/30 border-t-[#B2223C] animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2
        className="text-xl font-semibold text-white mb-4"
        style={{ fontFamily: FONT_HEADING }}
      >
        Предстоящие записи
      </h2>

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-white/30 text-sm mb-3" style={{ fontFamily: FONT }}>
            Нет предстоящих записей
          </p>
          <a
            href="/booking"
            className="inline-block rounded-full bg-[#B2223C] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#c9294a] transition-colors"
            style={{ fontFamily: FONT }}
          >
            Записаться
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const modifiable = canModify(appt.appointmentDate, appt.startTime);
            return (
              <div
                key={appt.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-sm font-semibold text-white truncate"
                        style={{ fontFamily: FONT }}
                      >
                        {appt.serviceName || "Услуга"}
                      </p>
                      <span
                        className="text-xs text-white/40 flex-shrink-0 capitalize"
                        style={{ fontFamily: FONT }}
                      >
                        {formatDisplayDate(appt.appointmentDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className="text-xs text-white/50 truncate"
                        style={{ fontFamily: FONT }}
                      >
                        {appt.masterName || "Мастер"}
                      </p>
                      <span
                        className="text-xs text-white/50 flex-shrink-0"
                        style={{ fontFamily: FONT }}
                      >
                        {appt.startTime}–{appt.endTime}
                      </span>
                    </div>
                    {appt.servicePrice && (
                      <p
                        className="text-xs text-white/35"
                        style={{ fontFamily: FONT }}
                      >
                        {appt.servicePrice}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                  {modifiable && (
                    <>
                      <button
                        onClick={() => {
                          setCancelError("");
                          setConfirmCancelId(
                            confirmCancelId === appt.id ? null : appt.id
                          );
                        }}
                        className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                        style={{ fontFamily: FONT }}
                      >
                        Отменить
                      </button>
                      <button
                        onClick={() => openRebook(appt)}
                        className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                        style={{ fontFamily: FONT }}
                      >
                        Перенести
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => openRebook(appt)}
                    className="rounded-full border border-[#B2223C]/20 bg-[#B2223C]/10 px-3.5 py-1.5 text-[11px] text-[#e8556e] hover:bg-[#B2223C]/20 transition-all"
                    style={{ fontFamily: FONT }}
                  >
                    Записаться снова
                  </button>
                </div>

                {/* Inline cancel confirmation */}
                {confirmCancelId === appt.id && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-300 mb-2" style={{ fontFamily: FONT }}>
                      Вы уверены, что хотите отменить запись?
                    </p>
                    {cancelError && (
                      <p className="text-xs text-red-400 mb-2" style={{ fontFamily: FONT }}>
                        {cancelError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                        style={{ fontFamily: FONT }}
                      >
                        {cancellingId === appt.id ? "Отменяем..." : "Да, отменить"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmCancelId(null);
                          setCancelError("");
                        }}
                        className="rounded-full bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-[11px] text-white/50 hover:text-white/80 transition-all"
                        style={{ fontFamily: FONT }}
                      >
                        Нет
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* BookingModal */}
      {bookingService && (
        <BookingModal
          service={bookingService}
          onClose={() => {
            setBookingService(null);
            fetchAppointments();
          }}
        />
      )}
    </section>
  );
}
