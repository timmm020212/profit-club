"use client";
import { useEffect, useState } from "react";

const crimson = "#B2223C";
const txtDark = "#111111", txtMid = "#666666", txtSoft = "#AAAAAA";
const border = "#E8E5DF";

const STATUS: Record<string, { label: string; color: string }> = {
  pending:   { label: "Ожидает",      color: "#B08800" },
  confirmed: { label: "Подтверждено", color: "#1A7A4A" },
  cancelled: { label: "Отменено",     color: "#B2223C" },
  completed: { label: "Завершено",    color: "#666666" },
};

interface Booking {
  id: number;
  clientName: string;
  clientPhone: string | null;
  appointmentDate: string;
  startTime: string;
  status: string;
  serviceId: number;
}

type Filter = "all" | "today" | "upcoming" | "completed";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/partner/bookings")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setBookings(d);
        else setError(d.error || "Ошибка");
        setLoading(false);
      })
      .catch(() => { setError("Ошибка загрузки"); setLoading(false); });
  }, []);

  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();

  const filtered = bookings.filter(b => {
    if (filter === "today")    return b.appointmentDate === todayStr;
    if (filter === "upcoming") return b.appointmentDate >= todayStr && b.status !== "cancelled" && b.status !== "completed";
    if (filter === "completed") return b.status === "completed" || b.status === "cancelled";
    return true;
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: "Все" },
    { key: "today", label: "Сегодня" },
    { key: "upcoming", label: "Предстоящие" },
    { key: "completed", label: "Завершённые" },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Управление</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: txtDark, margin: 0, lineHeight: 1.1 }}>Записи</h1>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {tabs.map(t => {
          const active = filter === t.key;
          return (
            <button key={t.key} onClick={() => setFilter(t.key)} style={{
              padding: "7px 16px", borderRadius: 20,
              border: `1px solid ${active ? crimson : "#E0DDD7"}`,
              background: active ? crimson : "transparent",
              color: active ? "#fff" : txtMid,
              fontSize: 12, fontFamily: "var(--font-montserrat)", fontWeight: active ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s",
              letterSpacing: "0.02em",
            }}>{t.label}</button>
          );
        })}
      </div>

      {error && (
        <div style={{ border: `1px solid ${crimson}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: crimson, fontFamily: "var(--font-montserrat)" }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtSoft, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${border}`, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 18, color: txtDark, marginBottom: 6 }}>Записей нет</div>
          <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft }}>Здесь появятся записи ваших клиентов</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${border}`, overflow: "hidden" }}>
          {filtered.map((b, i) => {
            const s = STATUS[b.status] || STATUS.pending;
            return (
              <div key={b.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
                padding: "16px 20px",
                borderBottom: i < filtered.length - 1 ? `1px solid #F5F3EF` : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 600, color: txtDark, marginBottom: 3 }}>{b.clientName}</div>
                  <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtMid }}>
                    {b.appointmentDate} · {b.startTime}
                  </div>
                  {b.clientPhone && <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, color: txtSoft, marginTop: 2 }}>{b.clientPhone}</div>}
                </div>
                <span style={{
                  fontFamily: "var(--font-montserrat)", fontSize: 11, color: s.color, fontWeight: 500, flexShrink: 0,
                }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
