"use client";
import { useEffect, useState } from "react";

const crimson = "#B2223C";
const txtDark = "#111111", txtMid = "#666666", txtSoft = "#AAAAAA";
const border = "#E8E5DF";

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
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Аккаунт</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: txtDark, margin: 0, lineHeight: 1.1 }}>Тарифы</h1>
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft, margin: "8px 0 0" }}>Текущий план и опции</p>
      </div>

      <div style={{
        background: "#fff", borderRadius: 10, padding: "28px 28px",
        border: `${isPro ? "2px" : "1px"} solid ${isPro ? crimson : border}`,
        marginBottom: 16, position: "relative", overflow: "hidden",
      }}>
        {isPro && (
          <div style={{
            display: "inline-block", marginBottom: 14,
            padding: "3px 10px", borderRadius: 20,
            border: `1px solid ${crimson}`,
            fontSize: 9, fontWeight: 700, color: crimson,
            letterSpacing: "0.14em", textTransform: "uppercase",
            fontFamily: "var(--font-montserrat)",
          }}>PRO</div>
        )}
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
          Текущий тариф
        </div>
        <div style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 700, color: txtDark, marginBottom: 6 }}>{info.name}</div>
        <div style={{
          fontFamily: "var(--font-playfair)", fontSize: 32, fontWeight: 700, color: crimson,
          marginBottom: 22,
        }}>{info.price}</div>
        <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, margin: 0 }}>
          {info.features.map(f => (
            <li key={f} style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, color: txtMid, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: crimson, fontSize: 12, fontWeight: 700 }}>✓</span>{f}
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        background: "#fff", borderRadius: 10,
        padding: 18, border: `1px solid ${border}`,
        fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtMid, lineHeight: 1.6,
      }}>
        Для изменения тарифа или вопросов по оплате — свяжитесь с менеджером платформы.
      </div>
    </div>
  );
}
