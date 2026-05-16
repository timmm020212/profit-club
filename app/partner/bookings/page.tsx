"use client";
import { useEffect, useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Ожидает", color: "#b08800", bg: "#fffbe6" },
  confirmed: { label: "Подтверждено", color: "#1a7a4a", bg: "#edfaf3" },
  cancelled: { label: "Отменено", color: "#c0392b", bg: "#fff0f2" },
  completed: { label: "Завершено", color: "#555", bg: "#f5f5f5" },
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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/partner/bookings")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBookings(data);
        else setError(data.error || "Ошибка");
        setLoading(false);
      })
      .catch(() => { setError("Ошибка загрузки"); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 20 }}>Записи</h1>
      {error && <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>{error}</div>}
      {bookings.length === 0 && !error ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <div style={{ fontSize: 14, color: "#666" }}>Записей пока нет</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bookings.map(b => {
            const s = STATUS_LABELS[b.status] || STATUS_LABELS.pending;
            return (
              <div key={b.id} style={{
                background: "#fff", borderRadius: 14, padding: "16px 18px",
                border: "1px solid #ececf0", display: "flex",
                justifyContent: "space-between", alignItems: "flex-start", gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111", marginBottom: 2 }}>{b.clientName}</div>
                  <div style={{ fontSize: 12, color: "#999" }}>{b.appointmentDate} · {b.startTime}</div>
                  {b.clientPhone && <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{b.clientPhone}</div>}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, background: s.bg, color: s.color,
                  borderRadius: 8, padding: "3px 8px", flexShrink: 0,
                }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
