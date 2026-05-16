"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TARIFFS = [
  { id: "basic", name: "Базовый", price: "2 990", features: ["Страница салона", "Онлайн-запись", "Управление услугами и мастерами", "Расписание"] },
  { id: "advanced", name: "Продвинутый", price: "4 990", features: ["Всё из базового", "Telegram-бот для клиентов", "Уведомления клиентам"] },
  { id: "pro", name: "Профессиональный", price: "7 990", features: ["Всё из продвинутого", "Бот для мастеров", "Перенос записей", "Аналитика"] },
];

export default function TariffPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("basic");
  const [loading, setLoading] = useState(false);

  async function handleSelect() {
    setLoading(true);
    await fetch("/api/partner/tariff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tariff: selected }),
    });
    router.push("/partner/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #ececf0" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.15em", color: "#1a1a2e", marginBottom: 24 }}>BEAUTYBOOK</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Выберите тариф</h1>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Можно изменить в любой момент</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {TARIFFS.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                border: selected === t.id ? "2px solid #1a1a2e" : "1.5px solid #ececf0",
                borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                background: selected === t.id ? "#f5f5f8" : "#fafafa",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: selected === t.id ? "#1a1a2e" : "#333" }}>{t.name}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>{t.price} <span style={{ fontSize: 11, fontWeight: 400, color: "#aaa" }}>₽/мес</span></span>
              </div>
              <div style={{ fontSize: 11, color: "#999", lineHeight: 1.6 }}>{t.features.join(" · ")}</div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSelect}
          disabled={loading}
          style={{ width: "100%", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Сохраняем..." : "Начать работу →"}
        </button>
      </div>
    </div>
  );
}
