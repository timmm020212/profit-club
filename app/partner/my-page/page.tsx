"use client";
import { useEffect, useState } from "react";

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
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Моя страница</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Поделитесь ссылкой с клиентами</p>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
          Ссылка на страницу салона
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{
            flex: 1, background: "#f7f7fa", borderRadius: 10, padding: "10px 14px",
            fontSize: 13, color: "#333", wordBreak: "break-all", border: "1px solid #ececf0",
          }}>
            {url || "Загрузка..."}
          </div>
          <button
            onClick={copy}
            disabled={!url}
            style={{
              background: copied ? "#1a7a4a" : "#1a1a2e", color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", flexShrink: 0, transition: "background 0.2s",
            }}
          >
            {copied ? "✓ Скопировано" : "Скопировать"}
          </button>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 14, fontSize: 12, color: "#1a1a2e", fontWeight: 600, textDecoration: "underline" }}
          >
            Открыть страницу →
          </a>
        )}
      </div>
    </div>
  );
}
