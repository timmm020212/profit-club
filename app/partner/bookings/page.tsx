"use client";
import { useEffect, useState } from "react";

const card = "#111120", border = "rgba(255,255,255,0.07)", gold = "#C8A96E";
const txtPri = "#EDE8DF", txtSec = "#8888A0", txtMut = "#4A4A60";

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Ожидает",     color: "#C8A96E",  bg: "rgba(200,169,110,0.12)" },
  confirmed: { label: "Подтверждено", color: "#4ADE80", bg: "rgba(74,222,128,0.10)" },
  cancelled: { label: "Отменено",    color: "#E8556E",  bg: "rgba(232,85,110,0.10)" },
  completed: { label: "Завершено",   color: txtSec,     bg: "rgba(255,255,255,0.05)" },
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
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 8 }}>Управление</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: txtPri, margin: 0 }}>Записи</h1>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{
            padding: "7px 16px", borderRadius: 20, border: `1px solid ${filter === t.key ? gold : border}`,
            background: filter === t.key ? "rgba(200,169,110,0.12)" : "transparent",
            color: filter === t.key ? gold : txtSec,
            fontSize: 12, fontFamily: "var(--font-montserrat)", fontWeight: filter === t.key ? 600 : 400,
            cursor: "pointer", transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {error && <div style={{ background: "rgba(178,34,60,0.10)", border: "1px solid rgba(178,34,60,0.25)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 12, color: "#E8556E", fontFamily: "var(--font-montserrat)" }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtMut, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: card, borderRadius: 16, padding: "40px 24px", border: `1px solid ${border}`, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-playfair)", color: txtPri, marginBottom: 4 }}>Записей нет</div>
          <div style={{ fontSize: 12, color: txtMut, fontFamily: "var(--font-montserrat)" }}>Здесь появятся записи ваших клиентов</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(b => {
            const s = STATUS[b.status] || STATUS.pending;
            return (
              <div key={b.id} style={{
                background: card, borderRadius: 14, padding: "16px 20px",
                border: `1px solid ${border}`,
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: txtPri, fontFamily: "var(--font-montserrat)", marginBottom: 4 }}>{b.clientName}</div>
                  <div style={{ fontSize: 12, color: txtSec, fontFamily: "var(--font-montserrat)" }}>
                    {b.appointmentDate} · {b.startTime}
                  </div>
                  {b.clientPhone && <div style={{ fontSize: 11, color: txtMut, fontFamily: "var(--font-montserrat)", marginTop: 2 }}>{b.clientPhone}</div>}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
                  borderRadius: 8, padding: "4px 10px", flexShrink: 0,
                  fontFamily: "var(--font-montserrat)",
                }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
