"use client";
import { useEffect, useState } from "react";

const crimson = "#B2223C";
const txtDark = "#111111", txtMid = "#666666", txtSoft = "#AAAAAA";
const border = "#E8E5DF";

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
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Аккаунт</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: txtDark, margin: 0, lineHeight: 1.1 }}>Моя страница</h1>
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft, margin: "8px 0 0" }}>Поделитесь ссылкой с клиентами</p>
      </div>

      <div style={{
        background: "#fff", borderRadius: 10, padding: 28,
        border: `1px solid ${border}`,
      }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>
          Ссылка на страницу салона
        </div>

        <div style={{
          background: "#F8F6F2",
          border: `1px solid ${border}`,
          borderRadius: 8, padding: "14px 18px",
          fontFamily: "var(--font-montserrat)", fontSize: 14, color: crimson,
          fontWeight: 600, wordBreak: "break-all", marginBottom: 18,
          letterSpacing: "0.01em",
        }}>
          {url || "Загрузка..."}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={copy}
            disabled={!url}
            style={{
              background: copied ? "#1A7A4A" : (url ? crimson : "#ccc"),
              color: "#fff", border: "none",
              borderRadius: 8, padding: "11px 22px",
              fontSize: 13, fontWeight: 600,
              cursor: url ? "pointer" : "not-allowed",
              fontFamily: "var(--font-montserrat)",
              letterSpacing: "0.03em", transition: "background 0.2s",
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
                border: "1px solid #E0DDD7",
                color: txtMid,
                borderRadius: 8, padding: "11px 22px",
                fontSize: 13, fontWeight: 600,
                fontFamily: "var(--font-montserrat)",
                textDecoration: "none",
                display: "inline-flex", alignItems: "center", gap: 6,
                letterSpacing: "0.03em",
              }}
            >
              Открыть →
            </a>
          )}
        </div>

        <div style={{
          marginTop: 24, paddingTop: 20,
          borderTop: `1px solid ${border}`,
          fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft, lineHeight: 1.6,
        }}>
          Эта ссылка ведёт на публичную страницу вашего салона.
          Клиенты могут просматривать услуги, мастеров и записываться онлайн.
        </div>
      </div>
    </div>
  );
}
