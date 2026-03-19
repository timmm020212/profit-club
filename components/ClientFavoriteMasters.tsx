"use client";

import { useState, useEffect } from "react";

const FONT = "var(--font-montserrat)";
const FONT_HEADING = "var(--font-playfair)";

const AVATAR_GRADS = [
  "from-violet-600 to-purple-800",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-700",
  "from-teal-500 to-cyan-700",
  "from-indigo-500 to-blue-700",
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
        if (!apptRes.ok) { setLoading(false); return; }
        const apptData: AppointmentRow[] = await apptRes.json();

        const uniqueMasterIds = [...new Set(apptData.map((a) => a.masterId))];
        if (uniqueMasterIds.length === 0) { setLoading(false); return; }

        // Fetch all active masters and filter
        const mastersRes = await fetch("/api/masters");
        if (!mastersRes.ok) { setLoading(false); return; }
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

  if (loading) {
    return (
      <section>
        <h2
          className="text-xl font-semibold text-white mb-4"
          style={{ fontFamily: FONT_HEADING }}
        >
          Мои мастера
        </h2>
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 rounded-full border-2 border-[#B2223C]/30 border-t-[#B2223C] animate-spin" />
        </div>
      </section>
    );
  }

  if (masters.length === 0) return null;

  return (
    <section>
      <h2
        className="text-xl font-semibold text-white mb-4"
        style={{ fontFamily: FONT_HEADING }}
      >
        Мои мастера
      </h2>

      {/* Horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-x-visible scrollbar-hide">
        {masters.map((master, idx) => (
          <div
            key={master.id}
            className="flex-shrink-0 w-52 sm:w-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              {master.photoUrl ? (
                <img
                  src={master.photoUrl}
                  alt={master.fullName}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${AVATAR_GRADS[idx % AVATAR_GRADS.length]} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
                >
                  {getInitials(master.fullName)}
                </div>
              )}
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold text-white truncate"
                  style={{ fontFamily: FONT }}
                >
                  {master.fullName}
                </p>
                {master.specialization && (
                  <p
                    className="text-[11px] text-white/35 truncate mt-0.5"
                    style={{ fontFamily: FONT }}
                  >
                    {master.specialization}
                  </p>
                )}
              </div>
            </div>
            <a
              href="/booking"
              className="block w-full text-center rounded-full border border-[#B2223C]/20 bg-[#B2223C]/10 py-2 text-[11px] text-[#e8556e] hover:bg-[#B2223C]/20 transition-all"
              style={{ fontFamily: FONT }}
            >
              Записаться
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
