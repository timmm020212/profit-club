"use client";

import { useState, useEffect } from "react";

const AVATAR_GRADS = [
  "linear-gradient(135deg, #C8A96E 0%, #8B6914 100%)",
  "linear-gradient(135deg, #B2223C 0%, #7a1228 100%)",
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
  "linear-gradient(135deg, #C8A96E 0%, #a08545 100%)",
  "linear-gradient(135deg, #e8556e 0%, #B2223C 100%)",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

interface Master {
  id: number;
  fullName: string;
  specialization: string | null;
  photoUrl: string | null;
}

interface AppointmentRow {
  masterId: number;
}

export default function ClientFavoriteMasters() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  const clientId =
    typeof window !== "undefined"
      ? localStorage.getItem("profit_club_client_id")
      : null;

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        // Fetch all client appointments to extract unique master IDs
        const apptRes = await fetch(
          `/api/clients/appointments?clientId=${clientId}&status=all`
        );
        if (!apptRes.ok) {
          setLoading(false);
          return;
        }
        const apptData: AppointmentRow[] = await apptRes.json();

        const uniqueMasterIds = [...new Set(apptData.map((a) => a.masterId))];
        if (uniqueMasterIds.length === 0) {
          setLoading(false);
          return;
        }

        // Fetch all active masters and filter
        const mastersRes = await fetch("/api/masters");
        if (!mastersRes.ok) {
          setLoading(false);
          return;
        }
        const allMasters: Master[] = await mastersRes.json();

        const filtered = allMasters.filter((m) =>
          uniqueMasterIds.includes(m.id)
        );
        setMasters(filtered);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [clientId]);

  /* ── Section header ── */
  const SectionHeader = () => (
    <div className="mb-8 pc-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-px bg-gradient-to-r from-[#C8A96E] to-transparent" />
        <span
          className="text-[11px] tracking-[0.2em] uppercase text-[#C8A96E]/80"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Команда
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
          мастера
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

  if (masters.length === 0) return null;

  return (
    <section>
      <SectionHeader />

      {/* Horizontal scroll carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1">
        {masters.map((master, idx) => (
          <div
            key={master.id}
            className="pc-slide-up flex-shrink-0 w-56 rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-5 transition-all duration-300 hover:border-white/[0.12] group relative overflow-hidden"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            {/* Subtle radial gradient at bottom */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-24 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(200,169,110,0.06) 0%, transparent 70%)",
              }}
            />

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Photo / initials circle */}
              {master.photoUrl ? (
                <img
                  src={master.photoUrl}
                  alt={master.fullName}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0 border-2 border-white/[0.06] mb-4"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mb-4 border-2 border-white/[0.06]"
                  style={{ background: AVATAR_GRADS[idx % AVATAR_GRADS.length] }}
                >
                  {getInitials(master.fullName)}
                </div>
              )}

              {/* Name */}
              <p
                className="text-sm font-medium text-white truncate w-full"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                {master.fullName}
              </p>

              {/* Specialization */}
              {master.specialization && (
                <p
                  className="text-[11px] text-[#C8A96E]/70 truncate w-full mt-1"
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {master.specialization}
                </p>
              )}

              {/* Book button */}
              <a
                href="/booking"
                className="mt-4 w-full block text-center rounded-full py-2 text-xs font-medium text-white/80 hover:text-white transition-all duration-200"
                style={{
                  fontFamily: "var(--font-montserrat)",
                  background:
                    "linear-gradient(135deg, rgba(178,34,60,0.15) 0%, rgba(232,85,110,0.08) 100%)",
                  border: "1px solid rgba(178,34,60,0.2)",
                }}
              >
                Записаться
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
