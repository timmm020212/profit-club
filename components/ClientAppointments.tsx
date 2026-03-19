"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const BookingModal = dynamic(() => import("./BookingModal"), { ssr: false });

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

  const clientId =
    typeof window !== "undefined"
      ? localStorage.getItem("profit_club_client_id")
      : null;

  const fetchAppointments = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
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

  /* ── Section header ── */
  const SectionHeader = () => (
    <div className="mb-8 pc-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-px bg-gradient-to-r from-[#C8A96E] to-transparent" />
        <span
          className="text-[11px] tracking-[0.2em] uppercase text-[#C8A96E]/80"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Предстоящие
        </span>
      </div>
      <h2
        className="text-2xl sm:text-3xl font-semibold text-white"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        Мои{" "}
        <span
          className="text-transparent"
          style={{
            WebkitTextStroke: "1px rgba(255,255,255,0.5)",
          }}
        >
          записи
        </span>
      </h2>
    </div>
  );

  if (loading) {
    return (
      <section>
        <SectionHeader />
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 rounded-full border-2 border-[#C8A96E]/20 border-t-[#C8A96E] animate-spin" />
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader />

      {appointments.length === 0 ? (
        <div className="pc-slide-up rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-5 h-5 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
          <p
            className="text-white/30 text-sm mb-5"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Нет предстоящих записей
          </p>
          <a
            href="/booking"
            className="inline-block rounded-full px-7 py-3 text-sm font-medium text-white transition-all duration-300 hover:scale-[1.02]"
            style={{
              fontFamily: "var(--font-montserrat)",
              background: "linear-gradient(135deg, #B2223C 0%, #e8556e 100%)",
              boxShadow: "0 0 24px rgba(178,34,60,0.25)",
            }}
          >
            Записаться
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt, i) => {
            const modifiable = canModify(appt.appointmentDate, appt.startTime);
            const isConfirmingCancel = confirmCancelId === appt.id;

            return (
              <div
                key={appt.id}
                className="pc-slide-up rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden transition-all duration-300 hover:border-white/[0.1]"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Cancel confirmation overlay */}
                {isConfirmingCancel ? (
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p
                          className="text-sm text-white font-medium"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                          Отменить запись?
                        </p>
                        <p
                          className="text-xs text-white/40 mt-0.5"
                          style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                          {appt.serviceName} — {formatDisplayDate(appt.appointmentDate)}
                        </p>
                      </div>
                    </div>
                    {cancelError && (
                      <p
                        className="text-xs text-red-400 mb-3 pl-[52px]"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {cancelError}
                      </p>
                    )}
                    <div className="flex gap-3 pl-[52px]">
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={cancellingId === appt.id}
                        className="rounded-full bg-red-500/15 border border-red-500/25 px-5 py-2 text-xs text-red-300 hover:bg-red-500/25 transition-all disabled:opacity-50"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        {cancellingId === appt.id ? "Отменяем..." : "Да, отменить"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmCancelId(null);
                          setCancelError("");
                        }}
                        className="rounded-full bg-white/[0.04] border border-white/[0.08] px-5 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                      >
                        Нет, оставить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex">
                    {/* Left gold accent line */}
                    <div
                      className="w-[3px] flex-shrink-0 rounded-l-2xl"
                      style={{
                        background:
                          "linear-gradient(180deg, #C8A96E 0%, rgba(200,169,110,0.2) 100%)",
                      }}
                    />

                    <div className="flex-1 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Left: service info */}
                        <div className="flex-1 min-w-0">
                          <h3
                            className="text-base sm:text-lg text-white font-medium leading-tight"
                            style={{ fontFamily: "var(--font-playfair)" }}
                          >
                            {appt.serviceName || "Услуга"}
                          </h3>
                          <p
                            className="text-xs text-white/40 mt-1"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            {appt.masterName || "Мастер"}
                          </p>

                          {appt.servicePrice && (
                            <span
                              className="inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-medium bg-[#C8A96E]/10 text-[#C8A96E] border border-[#C8A96E]/15"
                              style={{ fontFamily: "var(--font-montserrat)" }}
                            >
                              {appt.servicePrice}
                            </span>
                          )}
                        </div>

                        {/* Right: date/time */}
                        <div className="flex-shrink-0 text-right sm:text-right">
                          <p
                            className="text-sm text-white/70 capitalize"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            {formatDisplayDate(appt.appointmentDate)}
                          </p>
                          <p
                            className="text-lg text-white font-medium mt-0.5"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            {appt.startTime}
                            <span className="text-white/30 mx-1">—</span>
                            {appt.endTime}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2.5 mt-5 pt-4 border-t border-white/[0.04]">
                        {modifiable && (
                          <button
                            onClick={() => openRebook(appt)}
                            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            Перенести
                          </button>
                        )}
                        {modifiable && (
                          <button
                            onClick={() => {
                              setCancelError("");
                              setConfirmCancelId(appt.id);
                            }}
                            className="rounded-full border border-red-500/15 bg-red-500/[0.06] px-4 py-2 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25 transition-all duration-200"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                          >
                            Отменить
                          </button>
                        )}
                        <button
                          onClick={() => openRebook(appt)}
                          className="rounded-full px-4 py-2 text-xs font-medium text-white/90 hover:text-white transition-all duration-200"
                          style={{
                            fontFamily: "var(--font-montserrat)",
                            background:
                              "linear-gradient(135deg, rgba(200,169,110,0.15) 0%, rgba(200,169,110,0.05) 100%)",
                            border: "1px solid rgba(200,169,110,0.2)",
                          }}
                        >
                          Записаться снова
                        </button>
                      </div>
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
