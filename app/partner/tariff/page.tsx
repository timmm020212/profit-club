"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const crimson = "#B2223C";
const txtDark = "#111111", txtMid = "#666666", txtSoft = "#AAAAAA";
const border = "#E8E5DF";

const TARIFFS = [
  { id: "basic",    name: "Базовый",          price: "2 990", features: ["Страница салона", "Онлайн-запись", "Управление услугами и мастерами", "Расписание"] },
  { id: "advanced", name: "Продвинутый",      price: "4 990", features: ["Всё из базового", "Telegram-бот для клиентов", "Уведомления клиентам"] },
  { id: "pro",      name: "Профессиональный", price: "7 990", features: ["Всё из продвинутого", "Бот для мастеров", "Перенос записей", "Аналитика"] },
];

export default function TariffPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("basic");
  const [loading, setLoading] = useState(false);

  async function handleSelect() {
    setLoading(true);
    try {
      const res = await fetch("/api/partner/tariff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tariff: selected }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ошибка при обновлении тарифа");
        setLoading(false);
        return;
      }
      router.push("/partner/dashboard");
    } catch {
      alert("Ошибка соединения");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#F8F6F2",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 980 }}>
        {/* Brand */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 700, color: txtDark, letterSpacing: "0.04em" }}>BeautyBook</div>
          <div style={{ width: 32, height: 2, background: crimson, margin: "12px auto 0" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 32, fontWeight: 700, color: txtDark, margin: "0 0 8px", lineHeight: 1.1 }}>Выберите тариф</h1>
          <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, color: txtSoft, margin: 0 }}>Можно изменить в любой момент</p>
        </div>

        <div className="tariff-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
          {TARIFFS.map(t => {
            const active = selected === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  background: "#fff",
                  border: active ? `2px solid ${crimson}` : `1px solid ${border}`,
                  borderRadius: 12,
                  padding: active ? "27px 23px" : "28px 24px",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                  display: "flex", flexDirection: "column",
                }}
              >
                <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>
                  {t.id === "pro" ? "Лучший" : t.id === "advanced" ? "Популярный" : "Старт"}
                </div>
                <div style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 700, color: txtDark, marginBottom: 8 }}>{t.name}</div>
                <div style={{ marginBottom: 18 }}>
                  <span style={{ fontFamily: "var(--font-playfair)", fontSize: 32, fontWeight: 700, color: active ? crimson : txtDark }}>{t.price}</span>
                  <span style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft, marginLeft: 6 }}>₽/мес</span>
                </div>
                <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8, margin: 0, flex: 1 }}>
                  {t.features.map(f => (
                    <li key={f} style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtMid, display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5 }}>
                      <span style={{ color: crimson, fontWeight: 700, marginTop: 1 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleSelect}
            disabled={loading}
            style={{
              background: loading ? "#ccc" : crimson, color: "#fff",
              border: "none", borderRadius: 8, padding: "13px 36px",
              fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)", letterSpacing: "0.04em",
              transition: "background 0.2s",
            }}
          >
            {loading ? "Сохраняем..." : "Начать работу"}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .tariff-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
