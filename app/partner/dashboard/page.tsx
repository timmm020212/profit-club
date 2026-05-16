"use client";
import { useEffect, useState } from "react";

interface Stats { todayTotal: number; confirmed: number; cancelled: number; date: string; }

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #ececf0", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/partner/dashboard")
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => setError("Ошибка загрузки"));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Главная</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
        {stats ? `Сегодня, ${stats.date}` : error ? "" : "Загрузка..."}
      </p>
      {error && <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>{error}</div>}
      {stats && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Записей сегодня" value={stats.todayTotal} />
            <StatCard label="Подтверждено" value={stats.confirmed} />
            <StatCard label="Отменено" value={stats.cancelled} />
          </div>
          {stats.todayTotal === 0 && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 4 }}>Записей на сегодня нет</div>
              <div style={{ fontSize: 12, color: "#aaa" }}>Начните с добавления услуг и мастеров</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
