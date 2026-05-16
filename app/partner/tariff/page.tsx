"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const card = "#111120", border = "rgba(255,255,255,0.07)";
const gold = "#C8A96E";
const crimGrd = "linear-gradient(135deg, #B2223C, #E8556E)";
const txtPri = "#EDE8DF", txtSec = "#8888A0", txtMut = "#4A4A60";

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
      minHeight: "100vh", background: "#08080D",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ position: "fixed", width: 700, height: 700, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(200,169,110,0.05) 0%, transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

      <div style={{
        width: "100%", maxWidth: 500, position: "relative",
        background: card, borderRadius: 20,
        border: `1px solid ${border}`,
        padding: "36px 32px", boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 12, letterSpacing: "0.22em", color: gold, textTransform: "uppercase", marginBottom: 18 }}>BeautyBook</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 26, fontWeight: 700, color: txtPri, margin: 0, lineHeight: 1.2 }}>Выберите тариф</h1>
          <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSec, margin: "8px 0 0" }}>Можно изменить в любой момент</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {TARIFFS.map(t => {
            const active = selected === t.id;
            const isPro = t.id === "pro";
            return (
              <div
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  border: active
                    ? "1px solid rgba(200,169,110,0.5)"
                    : isPro
                      ? "1px solid rgba(200,169,110,0.25)"
                      : `1px solid ${border}`,
                  borderRadius: 14,
                  padding: "16px 18px",
                  cursor: "pointer",
                  background: active ? "rgba(200,169,110,0.08)" : "rgba(255,255,255,0.02)",
                  transition: "all 0.15s",
                  position: "relative",
                }}
              >
                {isPro && (
                  <span style={{
                    position: "absolute", top: -8, right: 14,
                    background: "linear-gradient(135deg, #C8A96E, #E8D4A0)",
                    color: "#08080D", fontSize: 9, fontWeight: 700,
                    padding: "3px 10px", borderRadius: 10,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "var(--font-montserrat)",
                  }}>Лучший</span>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{
                    fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 16,
                    color: active ? gold : txtPri,
                  }}>{t.name}</span>
                  <span style={{
                    fontFamily: "var(--font-playfair)", fontWeight: 700, fontSize: 20,
                    backgroundImage: active ? "linear-gradient(135deg, #C8A96E, #E8D4A0)" : "none",
                    backgroundClip: active ? "text" : "unset",
                    WebkitBackgroundClip: active ? "text" : "unset",
                    color: active ? "transparent" : txtPri,
                  }}>
                    {t.price}
                    <span style={{
                      fontSize: 11, fontWeight: 400, color: txtMut,
                      fontFamily: "var(--font-montserrat)", marginLeft: 4,
                      backgroundImage: "none", WebkitBackgroundClip: "unset",
                    }}>₽/мес</span>
                  </span>
                </div>
                <div style={{ fontSize: 11, color: txtSec, fontFamily: "var(--font-montserrat)", lineHeight: 1.6 }}>
                  {t.features.join(" · ")}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSelect}
          disabled={loading}
          style={{
            width: "100%", background: crimGrd, color: "#fff",
            border: "none", borderRadius: 10, padding: 13,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)", letterSpacing: "0.04em",
            opacity: loading ? 0.65 : 1, transition: "opacity 0.2s",
          }}
        >
          {loading ? "Сохраняем..." : "Начать работу →"}
        </button>
      </div>
    </div>
  );
}
