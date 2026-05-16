"use client";
import { useEffect, useState } from "react";

const card = "#111120", border = "rgba(255,255,255,0.07)";
const gold = "#C8A96E";
const txtPri = "#EDE8DF", txtSec = "#8888A0", txtMut = "#4A4A60";

const TARIFF_INFO: Record<string, { name: string; price: string; features: string[] }> = {
  basic:    { name: "Базовый",          price: "2 990 ₽/мес", features: ["Страница салона", "Онлайн-запись", "Услуги и мастера"] },
  advanced: { name: "Продвинутый",      price: "4 990 ₽/мес", features: ["Всё из базового", "Telegram-бот для клиентов"] },
  pro:      { name: "Профессиональный", price: "7 990 ₽/мес", features: ["Всё из продвинутого", "Бот для мастеров", "Аналитика"] },
};

export default function BillingPage() {
  const [tariff, setTariff] = useState("basic");

  useEffect(() => {
    fetch("/api/partner/profile")
      .then(r => r.json())
      .then(d => { if (d.tariff) setTariff(d.tariff); });
  }, []);

  const info = TARIFF_INFO[tariff] || TARIFF_INFO.basic;
  const isPro = tariff === "pro";

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 8 }}>Аккаунт</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: txtPri, margin: 0 }}>Тарифы</h1>
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSec, marginTop: 6 }}>Текущий план и опции</p>
      </div>

      <div style={{
        background: card, borderRadius: 16, padding: "28px 28px",
        border: `1px solid ${isPro ? "rgba(200,169,110,0.35)" : border}`,
        marginBottom: 16, position: "relative", overflow: "hidden",
      }}>
        {isPro && (
          <div style={{
            position: "absolute", top: 0, right: 0,
            background: "rgba(200,169,110,0.12)",
            borderBottomLeftRadius: 12,
            padding: "5px 12px",
            fontSize: 9, fontWeight: 700, color: gold,
            letterSpacing: "0.14em", textTransform: "uppercase",
            fontFamily: "var(--font-montserrat)",
          }}>PRO</div>
        )}
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 12 }}>
          Текущий тариф
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-playfair)", color: txtPri, marginBottom: 6 }}>{info.name}</div>
        <div style={{
          fontSize: 32, fontWeight: 700, fontFamily: "var(--font-playfair)",
          backgroundImage: "linear-gradient(135deg, #C8A96E, #E8D4A0)",
          backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent",
          marginBottom: 20,
        }}>{info.price}</div>
        <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, margin: 0 }}>
          {info.features.map(f => (
            <li key={f} style={{ fontSize: 13, color: txtSec, fontFamily: "var(--font-montserrat)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: gold, fontSize: 12 }}>✓</span>{f}
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        background: "rgba(255,255,255,0.02)", borderRadius: 14,
        padding: 18, border: `1px solid ${border}`,
        fontSize: 12, color: txtMut, fontFamily: "var(--font-montserrat)", lineHeight: 1.6,
      }}>
        Для изменения тарифа или вопросов по оплате — свяжитесь с менеджером платформы.
      </div>
    </div>
  );
}
