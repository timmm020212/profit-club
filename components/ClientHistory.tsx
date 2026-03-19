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
  const [bookingService, setBookingService] = useState<BookingService | null>(
    null
  );

  const clientId =
    typeof window !== "undefined"
      ? localStorage.getItem("profit_club_client_id")
      : null;

  const fetchHistory = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
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

  /* ── Section header ── */
  const SectionHeader = () => (
    <div className="mb-8 pc-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-px bg-gradient-to-r from-[#C8A96E] to-transparent" />
        <span
          className="text-[11px] tracking-[0.2em] uppercase text-[#C8A96E]/80"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          История
        </span>
      </div>
      <h2
        className="text-2xl sm:text-3xl font-semibold text-white"
        style={{ fontFamily: "var(--font-playfair)" }}
      >
        Прошлые{" "}
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

  if (appointments.length === 0) return null;

  const visibleAppointments = showAll ? appointments : appointments.slice(0, 5);

  return (
    <section>
      <SectionHeader />

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden">
        {visibleAppointments.map((appt, i) => (
          <div
            key={appt.id}
            className={`pc-slide-up flex items-center gap-3 sm:gap-4 px-5 py-4 transition-colors duration-200 hover:bg-white/[0.02] ${
              i !== visibleAppointments.length - 1
                ? "border-b border-white/[0.04]"
                : ""
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {/* Date */}
            <span
              className="flex-shrink-0 w-16 text-xs font-medium text-[#C8A96E]/70"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {formatShortDate(appt.appointmentDate)}
            </span>

            {/* Service + Master */}
            <div className="flex-1 min-w-0">
              <p
                className="text-sm text-white/80 truncate"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                {appt.serviceName || "Услуга"}
              </p>
              <p
                className="text-[11px] text-white/30 truncate mt-0.5"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                {appt.masterName || "Мастер"}
              </p>
            </div>

            {/* Status badge */}
            <span
              className={`flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full font-medium ${
                appt.status === "confirmed"
                  ? "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20"
                  : appt.status === "cancelled"
                  ? "bg-red-500/10 text-red-400/80 border border-red-500/20"
                  : "bg-white/[0.04] text-white/30 border border-white/[0.06]"
              }`}
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              {appt.status === "confirmed"
                ? "\u2713"
                : appt.status === "cancelled"
                ? "\u2715"
                : appt.status}
            </span>

            {/* Rebook button */}
            <button
              onClick={() => openRebook(appt)}
              className="flex-shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200"
              style={{ fontFamily: "var(--font-montserrat)" }}
            >
              Снова
            </button>
          </div>
        ))}
      </div>

      {/* Show all / collapse */}
      {appointments.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full text-center py-2.5 text-xs transition-colors duration-200 group"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          <span className="text-[#C8A96E]/50 group-hover:text-[#C8A96E]/80 transition-colors">
            {showAll
              ? "Свернуть"
              : `Показать все (${appointments.length})`}
          </span>
          <span className="inline-block ml-1.5 text-[#C8A96E]/30 group-hover:text-[#C8A96E]/60 transition-all">
            {showAll ? "\u2191" : "\u2193"}
          </span>
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
