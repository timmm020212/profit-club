"use client";
import { useEffect, useState } from "react";

const gold = "#C8A96E";
const card = "#111120", border = "rgba(255,255,255,0.07)";
const txtPri = "#EDE8DF", txtSec = "#8888A0", txtMut = "#4A4A60";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Ожидает",     color: "#C8A96E",  bg: "rgba(200,169,110,0.10)" },
  confirmed: { label: "Подтверждено", color: "#4ADE80", bg: "rgba(74,222,128,0.10)" },
  cancelled: { label: "Отменено",    color: "#E8556E",  bg: "rgba(232,85,110,0.10)" },
  completed: { label: "Завершено",   color: txtSec,     bg: "rgba(255,255,255,0.05)" },
};

interface Stats { todayTotal: number; confirmed: number; cancelled: number; date: string; }
interface Booking { id: number; clientName: string; startTime: string; status: string; }

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      background: card, borderRadius: 16, padding: "22px 24px",
      border: `1px solid ${accent ? "rgba(200,169,110,0.25)" : border}`,
      flex: 1, minWidth: 0,
    }}>
      <div style={{
        fontSize: 42, fontWeight: 700, fontFamily: "var(--font-playfair)",
        backgroundImage: accent ? "linear-gradient(135deg, #C8A96E, #E8D4A0)" : "none",
        backgroundClip: accent ? "text" : "unset",
        WebkitBackgroundClip: accent ? "text" : "unset",
        color: accent ? "transparent" : txtPri,
        lineHeight: 1, marginBottom: 8,
      }}>{value}</div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-montserrat)", color: txtSec, letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/partner/dashboard")
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setStats(data); });
    fetch("/api/partner/bookings?limit=5")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBookings(data.slice(0, 5)); });
  }, []);

  const dayNames = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
  const today = new Date();
  const todayStr = `${today.getDate()} ${["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][today.getMonth()]}`;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 8 }}>
          Обзор
        </div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: txtPri, margin: 0 }}>Главная</h1>
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSec, marginTop: 6 }}>
          {dayNames[today.getDay()]}, {todayStr}
        </p>
      </div>

      {error && (
        <div style={{ background: "rgba(178,34,60,0.10)", border: "1px solid rgba(178,34,60,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 24, fontSize: 13, color: "#E8556E", fontFamily: "var(--font-montserrat)" }}>{error}</div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 32, flexWrap: "wrap" }}>
          <StatCard label="Записей сегодня" value={stats.todayTotal} accent />
          <StatCard label="Подтверждено" value={stats.confirmed} />
          <StatCard label="Отменено" value={stats.cancelled} />
        </div>
      )}

      {/* Recent bookings */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 14 }}>
          Последние записи
        </div>
        {bookings.length === 0 ? (
          <div style={{
            background: card, borderRadius: 16, padding: "36px 24px",
            border: `1px solid ${border}`, textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: txtPri, fontFamily: "var(--font-playfair)", marginBottom: 4 }}>Записей пока нет</div>
            <div style={{ fontSize: 12, color: txtMut, fontFamily: "var(--font-montserrat)" }}>Добавьте услуги и мастеров, чтобы начать принимать записи</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {bookings.map(b => {
              const s = STATUS[b.status] || STATUS.pending;
              return (
                <div key={b.id} style={{
                  background: card, borderRadius: 12, padding: "14px 18px",
                  border: `1px solid ${border}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: txtPri, fontFamily: "var(--font-montserrat)", marginBottom: 2 }}>{b.clientName}</div>
                    <div style={{ fontSize: 11, color: txtMut, fontFamily: "var(--font-montserrat)" }}>{b.startTime}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, borderRadius: 8, padding: "3px 10px", fontFamily: "var(--font-montserrat)" }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
