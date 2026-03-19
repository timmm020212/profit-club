"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const FONT = "var(--font-montserrat)";
const FONT_HEADING = "var(--font-playfair)";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}

export default function ClientProfileCard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [stats, setStats] = useState({ appointments: 0, masters: 0 });

  useEffect(() => {
    const syncStorage = () => {
      setName(localStorage.getItem("profit_club_user_name") || "");
      setPhone(localStorage.getItem("profit_club_client_phone") || "");
      setTelegramId(localStorage.getItem("profit_club_telegram_id") || "");
    };
    syncStorage();
    window.addEventListener("profit_club_auth_changed", syncStorage);
    return () => window.removeEventListener("profit_club_auth_changed", syncStorage);
  }, []);

  useEffect(() => {
    const clientId = localStorage.getItem("profit_club_client_id");
    if (!clientId) return;
    fetch(`/api/clients/appointments?clientId=${clientId}&status=all`)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        const masterIds = new Set(arr.map((a: { masterId?: number }) => a.masterId));
        setStats({ appointments: arr.length, masters: masterIds.size });
      })
      .catch(() => {});
  }, []);

  const handleSave = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    localStorage.setItem("profit_club_user_name", trimmed);
    setName(trimmed);
    setEditing(false);
    window.dispatchEvent(new Event("profit_club_auth_changed"));
  };

  const initials = getInitials(name || "U");

  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] relative overflow-hidden"
      style={{
        boxShadow: "0 0 80px rgba(200,169,110,0.03), 0 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      {/* Gold top border gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(200,169,110,0.3) 30%, rgba(200,169,110,0.5) 50%, rgba(200,169,110,0.3) 70%, transparent 95%)",
        }}
      />

      {/* Inner top glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-24 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(200,169,110,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative p-6 md:p-8">
        {/* Main layout: horizontal on desktop, stacked on mobile */}
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0 relative self-center md:self-start">
            {/* Animated gradient ring */}
            <div
              className="w-20 h-20 rounded-full p-[2px]"
              style={{
                background:
                  "conic-gradient(from 0deg, #C8A96E, #B2223C, #e8556e, #C8A96E, rgba(200,169,110,0.3), #C8A96E)",
                animation: "spin 8s linear infinite",
              }}
            >
              <div
                className="w-full h-full rounded-full flex items-center justify-center text-xl font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #B2223C 0%, #C8A96E 100%)",
                  fontFamily: FONT,
                  fontSize: 22,
                  letterSpacing: "0.05em",
                }}
              >
                {initials}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 text-center md:text-left">
            {editing ? (
              <div className="flex items-center gap-2 max-w-md mx-auto md:mx-0">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  autoFocus
                  className="flex-1 min-w-0 rounded-xl border border-[#C8A96E]/20 bg-white/[0.04] px-4 py-2.5 text-base text-white outline-none focus:border-[#C8A96E]/40 transition-colors"
                  style={{ fontFamily: FONT, fontSize: 16 }}
                  placeholder="Ваше имя"
                />
                <button
                  onClick={handleSave}
                  className="flex-shrink-0 rounded-xl px-4 py-2.5 text-xs font-medium text-white transition-all duration-200 hover:brightness-110"
                  style={{
                    fontFamily: FONT,
                    background: "linear-gradient(135deg, #C8A96E, #a88b54)",
                  }}
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-shrink-0 rounded-xl bg-white/[0.06] px-4 py-2.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                  style={{ fontFamily: FONT }}
                >
                  Отмена
                </button>
              </div>
            ) : (
              <>
                <h2
                  className="text-2xl md:text-3xl text-white mb-1"
                  style={{
                    fontFamily: FONT_HEADING,
                    fontWeight: 700,
                    lineHeight: 1.1,
                  }}
                >
                  {name || "Пользователь"}
                </h2>
              </>
            )}

            {/* Phone */}
            {phone && !editing && (
              <div
                className="flex items-center gap-2 mt-2 justify-center md:justify-start"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(200,169,110,0.4)"
                  strokeWidth="1.5"
                  className="flex-shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.72 11.72 0 003.66.58 1 1 0 011 1v3.56a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.56a1 1 0 011 1 11.72 11.72 0 00.58 3.66 1 1 0 01-.24 1.01l-2.28 2.12z"
                  />
                </svg>
                <span
                  className="text-sm text-white/35"
                  style={{ fontFamily: FONT, letterSpacing: "0.03em" }}
                >
                  {phone}
                </span>
              </div>
            )}

            {/* Badges row */}
            {!editing && (
              <div className="flex items-center gap-3 mt-4 flex-wrap justify-center md:justify-start">
                {/* Telegram badge */}
                {telegramId ? (
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium"
                    style={{
                      fontFamily: FONT,
                      background:
                        "linear-gradient(135deg, rgba(200,169,110,0.1), rgba(200,169,110,0.05))",
                      border: "1px solid rgba(200,169,110,0.15)",
                      color: "#C8A96E",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.97 9.293c-.146.658-.537.818-1.084.508l-3-2.211-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.13.833.929z" />
                    </svg>
                    Привязан
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium bg-white/[0.03] text-white/25 border border-white/[0.06]"
                    style={{ fontFamily: FONT }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.97 9.293c-.146.658-.537.818-1.084.508l-3-2.211-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.13.833.929z" />
                    </svg>
                    Не привязан
                  </span>
                )}

                {/* Edit button */}
                <button
                  onClick={() => {
                    setEditName(name);
                    setEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-[11px] text-white/25 hover:text-[#C8A96E] transition-colors duration-300"
                  style={{ fontFamily: FONT }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l2.65 2.65M19.5 7.125L8.505 18.12a2.25 2.25 0 01-.988.586l-3.517.938.938-3.517a2.25 2.25 0 01.586-.988L16.524 4.12a1.875 1.875 0 012.976 0v0z"
                    />
                  </svg>
                  Редактировать
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats divider */}
        <div
          className="h-px my-6"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
          }}
        />

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center"
          >
            <div
              className="text-2xl font-bold text-white mb-1 pc-stat-num"
              style={{ fontFamily: FONT_HEADING }}
            >
              {stats.appointments}
            </div>
            <div
              className="text-[11px] text-white/30 uppercase tracking-widest"
              style={{ fontFamily: FONT, fontWeight: 400 }}
            >
              Записей
            </div>
          </div>
          <div
            className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 text-center"
          >
            <div
              className="text-2xl font-bold text-white mb-1 pc-stat-num"
              style={{ fontFamily: FONT_HEADING }}
            >
              {stats.masters}
            </div>
            <div
              className="text-[11px] text-white/30 uppercase tracking-widest"
              style={{ fontFamily: FONT, fontWeight: 400 }}
            >
              Мастеров
            </div>
          </div>
        </div>

        {/* Logout */}
        <div
          className="h-px mt-6 mb-4"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)" }}
        />
        <div className="flex justify-center md:justify-end">
          <button
            onClick={() => {
              localStorage.removeItem("profit_club_client_id");
              localStorage.removeItem("profit_club_user_name");
              localStorage.removeItem("profit_club_client_phone");
              localStorage.removeItem("profit_club_telegram_id");
              localStorage.removeItem("profit_club_user_registered");
              window.dispatchEvent(new Event("profit_club_auth_changed"));
              router.push("/");
            }}
            className="inline-flex items-center gap-2 text-[11px] text-white/20 hover:text-red-400/70 transition-colors duration-300 group"
            style={{ fontFamily: FONT, letterSpacing: "0.05em" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="transition-transform group-hover:translate-x-0.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* CSS for avatar ring spin */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
