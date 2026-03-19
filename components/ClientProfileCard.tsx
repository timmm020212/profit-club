"use client";

import { useState, useEffect } from "react";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

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
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex items-center gap-5">
        {/* Avatar circle with initials */}
        <div
          className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #B2223C, #e8556e)",
            fontFamily: FONT,
          }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setEditing(false);
                }}
                autoFocus
                className="flex-1 min-w-0 rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-2 text-sm text-white outline-none focus:border-[#B2223C]/50 transition-colors"
                style={{ fontFamily: FONT, fontSize: 16 }}
                placeholder="Ваше имя"
              />
              <button
                onClick={handleSave}
                className="flex-shrink-0 rounded-lg bg-[#B2223C] px-3 py-2 text-xs font-medium text-white hover:bg-[#c9294a] transition-colors"
                style={{ fontFamily: FONT }}
              >
                OK
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-shrink-0 rounded-lg bg-white/[0.06] px-3 py-2 text-xs text-white/50 hover:text-white/80 transition-colors"
                style={{ fontFamily: FONT }}
              >
                Отмена
              </button>
            </div>
          ) : (
            <>
              <h2
                className="text-lg font-semibold text-white truncate"
                style={{ fontFamily: FONT_HEADING }}
              >
                {name || "Пользователь"}
              </h2>
              {phone && (
                <p
                  className="text-sm text-white/40 mt-0.5"
                  style={{ fontFamily: FONT }}
                >
                  {phone}
                </p>
              )}
            </>
          )}

          <div className="flex items-center gap-3 mt-2">
            {/* Telegram status badge */}
            {telegramId ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                style={{ fontFamily: FONT }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Telegram привязан
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white/[0.04] text-white/30 border border-white/[0.06]"
                style={{ fontFamily: FONT }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                Telegram не привязан
              </span>
            )}

            {!editing && (
              <button
                onClick={() => {
                  setEditName(name);
                  setEditing(true);
                }}
                className="text-[11px] text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
                style={{ fontFamily: FONT }}
              >
                Редактировать
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
