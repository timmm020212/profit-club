"use client";
import { useEffect, useState } from "react";

const crimson = "#B2223C";
const txtDark = "#111111", txtSoft = "#AAAAAA";
const border = "#E8E5DF";

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Ожидает",      color: "#B08800" },
  confirmed: { label: "Подтверждено", color: "#1A7A4A" },
  cancelled: { label: "Отменено",     color: "#B2223C" },
  completed: { label: "Завершено",    color: "#666666" },
};

interface Stats { todayTotal: number; confirmed: number; cancelled: number; date: string; }
interface Booking { id: number; clientName: string; startTime: string; status: string; appointmentDate: string; }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/partner/dashboard")
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setStats(d); });
    fetch("/api/partner/bookings")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBookings(d.slice(0, 6)); });
  }, []);

  const today = new Date();
  const months = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
  const days = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
          {days[today.getDay()]}, {today.getDate()} {months[today.getMonth()]}
        </div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: txtDark, margin: 0, lineHeight: 1.1 }}>Главная</h1>
      </div>

      {error && (
        <div style={{ border: `1px solid ${crimson}`, borderRadius: 8, padding: "10px 14px", marginBottom: 24, fontSize: 12, color: crimson, fontFamily: "var(--font-montserrat)" }}>{error}</div>
      )}

      {/* Stats row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: border, border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden", marginBottom: 36 }}>
          {[
            { label: "Записей сегодня", value: stats.todayTotal },
            { label: "Подтверждено",    value: stats.confirmed  },
            { label: "Отменено",        value: stats.cancelled  },
          ].map((s, i) => (
            <div key={i} style={{ background: "#fff", padding: "24px 20px" }}>
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: 40, fontWeight: 700, color: i === 0 ? crimson : txtDark, lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
              <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, color: txtSoft, letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent bookings */}
      <div>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>
          Последние записи
        </div>
        {bookings.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${border}`, padding: "32px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-playfair)", fontSize: 18, color: txtDark, marginBottom: 6 }}>Записей пока нет</div>
            <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft }}>Добавьте услуги и мастеров</div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${border}`, overflow: "hidden" }}>
            {bookings.map((b, i) => {
              const s = STATUS[b.status] || STATUS.pending;
              return (
                <div key={b.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: i < bookings.length - 1 ? `1px solid #F5F3EF` : "none",
                }}>
                  <div>
                    <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 600, color: txtDark, marginBottom: 2 }}>{b.clientName}</div>
                    <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, color: txtSoft }}>{b.appointmentDate} · {b.startTime}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, color: s.color, fontWeight: 500 }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
