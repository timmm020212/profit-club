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
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface BookingService {
  id: number;
  name: string;
  description?: string | null;
  price?: string | null;
  duration?: number | string | null;
  executorRole?: string | null;
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export default function ClientHistory() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [bookingService, setBookingService] = useState<BookingService | null>(null);

  const clientId =
    typeof window !== "undefined"
      ? localStorage.getItem("profit_club_client_id")
      : null;

  const fetchHistory = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    try {
      const res = await fetch(
        `/api/clients/appointments?clientId=${clientId}&status=all&future=false`
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
    fetchHistory();
  }, [fetchHistory]);

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
          История записей
        </h2>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-[#B2223C]/30 border-t-[#B2223C] animate-spin" />
        </div>
      </section>
    );
  }

  if (appointments.length === 0) return null;

  const visibleAppointments = showAll ? appointments : appointments.slice(0, 5);

  return (
    <section>
      <h2
        className="text-xl font-semibold text-white mb-4"
        style={{ fontFamily: FONT_HEADING }}
      >
        История записей
      </h2>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
        {visibleAppointments.map((appt) => (
          <div
            key={appt.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* Date */}
            <span
              className="flex-shrink-0 w-16 text-xs text-white/40"
              style={{ fontFamily: FONT }}
            >
              {formatShortDate(appt.appointmentDate)}
            </span>

            {/* Service + Master */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm text-white/80 truncate"
                style={{ fontFamily: FONT }}
              >
                {appt.serviceName || "Услуга"}
              </p>
              <p
                className="text-[11px] text-white/30 truncate"
                style={{ fontFamily: FONT }}
              >
                {appt.masterName || "Мастер"}
              </p>
            </div>

            {/* Status badge */}
            <span
              className={`flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full ${
                appt.status === "confirmed"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : appt.status === "cancelled"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-white/[0.04] text-white/30 border border-white/[0.06]"
              }`}
              style={{ fontFamily: FONT }}
            >
              {appt.status === "confirmed" ? "Выполнена" : appt.status === "cancelled" ? "Отменена" : appt.status}
            </span>

            {/* Rebook button */}
            <button
              onClick={() => openRebook(appt)}
              className="flex-shrink-0 rounded-full border border-[#B2223C]/20 bg-[#B2223C]/10 px-3 py-1.5 text-[10px] text-[#e8556e] hover:bg-[#B2223C]/20 transition-all"
              style={{ fontFamily: FONT }}
            >
              Снова
            </button>
          </div>
        ))}
      </div>

      {appointments.length > 5 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-3 w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors py-2"
          style={{ fontFamily: FONT }}
        >
          Показать все ({appointments.length})
        </button>
      )}

      {showAll && appointments.length > 5 && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-3 w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors py-2"
          style={{ fontFamily: FONT }}
        >
          Свернуть
        </button>
      )}

      {/* BookingModal */}
      {bookingService && (
        <BookingModal
          service={bookingService}
          onClose={() => {
            setBookingService(null);
          }}
        />
      )}
    </section>
  );
}
