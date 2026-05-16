"use client";
import { useEffect, useState } from "react";

const card = "#111120", border = "rgba(255,255,255,0.07)";
const gold = "#C8A96E";
const crimGrd = "linear-gradient(135deg, #B2223C, #E8556E)";
const txtPri = "#EDE8DF", txtSec = "#8888A0", txtMut = "#4A4A60";

const inputSt: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
  padding: "10px 14px", fontSize: 13, color: txtPri, outline: "none",
  fontFamily: "var(--font-montserrat)", boxSizing: "border-box",
};
const labelSt: React.CSSProperties = {
  display: "block", fontSize: 9, fontWeight: 700, color: gold,
  letterSpacing: "0.14em", textTransform: "uppercase",
  fontFamily: "var(--font-montserrat)", marginBottom: 6,
};

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/partner/profile")
      .then(r => r.json())
      .then(d => {
        setForm({
          name: d.name || "",
          city: d.city || "",
          address: d.address || "",
          phone: d.phone || "",
          description: d.description || "",
        });
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/partner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { key: "name", label: "Название салона *", placeholder: "Студия красоты" },
    { key: "city", label: "Город", placeholder: "Москва" },
    { key: "address", label: "Адрес", placeholder: "ул. Пример, д. 1" },
    { key: "phone", label: "Телефон", placeholder: "+7 (___) ___-__-__" },
    { key: "description", label: "Описание", placeholder: "Расскажите о вашем салоне" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 8 }}>Аккаунт</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: txtPri, margin: 0 }}>Профиль</h1>
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSec, marginTop: 6 }}>Информация о вашем салоне</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtMut, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : (
        <form onSubmit={save} style={{
          background: card, borderRadius: 16, padding: 24,
          border: `1px solid ${border}`,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={labelSt}>{f.label}</label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                required={f.key === "name"}
                style={inputSt}
              />
            </div>
          ))}
          <button type="submit" disabled={saving} style={{
            background: saved ? "rgba(74,222,128,0.2)" : crimGrd,
            color: saved ? "#4ADE80" : "#fff",
            border: saved ? "1px solid rgba(74,222,128,0.4)" : "none",
            borderRadius: 10, padding: "13px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "var(--font-montserrat)",
            opacity: saving ? 0.65 : 1, marginTop: 6, transition: "all 0.2s",
          }}>
            {saved ? "✓ Сохранено" : saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </form>
      )}
    </div>
  );
}
