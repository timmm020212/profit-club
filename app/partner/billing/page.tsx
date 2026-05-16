"use client";
import { useEffect, useState } from "react";

const TARIFF_INFO: Record<string, { name: string; price: string; features: string[] }> = {
  basic: { name: "Базовый", price: "2 990 ₽/мес", features: ["Страница салона", "Онлайн-запись", "Услуги и мастера"] },
  advanced: { name: "Продвинутый", price: "4 990 ₽/мес", features: ["Всё из базового", "Telegram-бот для клиентов"] },
  pro: { name: "Профессиональный", price: "7 990 ₽/мес", features: ["Всё из продвинутого", "Бот для мастеров", "Аналитика"] },
};

export default function BillingPage() {
  const [tariff, setTariff] = useState("basic");

  useEffect(() => {
    fetch("/api/partner/profile")
      .then(r => r.json())
      .then(d => { if (d.tariff) setTariff(d.tariff); });
  }, []);

  const info = TARIFF_INFO[tariff] || TARIFF_INFO.basic;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 20 }}>Тариф и оплата</h1>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Текущий тариф</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 4 }}>{info.name}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>{info.price}</div>
        <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {info.features.map(f => (
            <li key={f} style={{ fontSize: 13, color: "#555", display: "flex", gap: 8 }}>
              <span style={{ color: "#1a7a4a" }}>✓</span>{f}
            </li>
          ))}
        </ul>
      </div>
      <div style={{ background: "#f7f7fa", borderRadius: 14, padding: 20, border: "1px solid #ececf0", fontSize: 13, color: "#999" }}>
        Для изменения тарифа или вопросов по оплате — свяжитесь с менеджером платформы.
      </div>
    </div>
  );
}
