"use client";
import { useEffect, useState } from "react";

const card = "#111120", border = "rgba(255,255,255,0.07)";
const gold = "#C8A96E";
const crimGrd = "linear-gradient(135deg, #B2223C, #E8556E)";
const txtPri = "#EDE8DF", txtSec = "#8888A0", txtMut = "#4A4A60";

export default function MyPagePage() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/partner/profile")
      .then(r => r.json())
      .then(data => {
        if (data.slug) setUrl(`${window.location.origin}/salon/${data.slug}`);
      });
  }, []);

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 8 }}>Аккаунт</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: txtPri, margin: 0 }}>Моя страница</h1>
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSec, marginTop: 6 }}>Поделитесь ссылкой с клиентами</p>
      </div>

      <div style={{
        background: card, borderRadius: 16, padding: 28,
        border: `1px solid ${border}`,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 14 }}>
          Ссылка на страницу салона
        </div>

        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(200,169,110,0.25)",
          borderRadius: 12, padding: "14px 18px",
          fontSize: 14, color: gold, fontFamily: "var(--font-montserrat)",
          fontWeight: 600, wordBreak: "break-all", marginBottom: 16,
          letterSpacing: "0.01em",
        }}>
          {url || "Загрузка..."}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={copy}
            disabled={!url}
            style={{
              background: copied ? "rgba(74,222,128,0.2)" : crimGrd,
              color: copied ? "#4ADE80" : "#fff",
              border: copied ? "1px solid rgba(74,222,128,0.4)" : "none",
              borderRadius: 10, padding: "11px 22px",
              fontSize: 13, fontWeight: 700,
              cursor: url ? "pointer" : "not-allowed",
              fontFamily: "var(--font-montserrat)",
              opacity: url ? 1 : 0.5, transition: "all 0.2s",
            }}
          >
            {copied ? "✓ Скопировано" : "Скопировать"}
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "transparent",
                border: `1px solid ${border}`,
                color: txtSec,
                borderRadius: 10, padding: "11px 22px",
                fontSize: 13, fontWeight: 600,
                fontFamily: "var(--font-montserrat)",
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
                transition: "border-color 0.15s, color 0.15s",
              }}
            >
              Открыть →
            </a>
          )}
        </div>

        <div style={{
          marginTop: 24, paddingTop: 20,
          borderTop: `1px solid ${border}`,
          fontSize: 12, color: txtMut, fontFamily: "var(--font-montserrat)", lineHeight: 1.6,
        }}>
          Эта ссылка ведёт на публичную страницу вашего салона.
          Клиенты могут просматривать услуги, мастеров и записываться онлайн.
        </div>
      </div>
    </div>
  );
}
