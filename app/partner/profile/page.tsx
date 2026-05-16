"use client";
import { useEffect, useState } from "react";

const crimson = "#B2223C";
const txtDark = "#111111", txtSoft = "#AAAAAA";
const border = "#E8E5DF";

const inputSt = (focused: boolean): React.CSSProperties => ({
  width: "100%", background: "#fff",
  border: `1px solid ${focused ? crimson : "#E0DDD7"}`,
  borderRadius: 8, padding: "10px 14px", fontSize: 13, color: txtDark,
  fontFamily: "var(--font-montserrat)", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s",
});
const labelSt: React.CSSProperties = {
  display: "block", fontSize: 9, color: txtSoft,
  letterSpacing: "0.18em", textTransform: "uppercase",
  fontFamily: "var(--font-montserrat)", marginBottom: 7,
};

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

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
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Аккаунт</div>
        <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: txtDark, margin: 0, lineHeight: 1.1 }}>Профиль</h1>
        <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft, margin: "8px 0 0" }}>Информация о вашем салоне</p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtSoft, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : (
        <form onSubmit={save} style={{
          background: "#fff", borderRadius: 10, padding: 24,
          border: `1px solid ${border}`,
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={labelSt}>{f.label}</label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                placeholder={f.placeholder}
                required={f.key === "name"}
                style={inputSt(focused === f.key)}
              />
            </div>
          ))}
          <button type="submit" disabled={saving} style={{
            background: saved ? "#1A7A4A" : (saving ? "#ccc" : crimson),
            color: "#fff", border: "none",
            borderRadius: 8, padding: "12px 22px", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", fontFamily: "var(--font-montserrat)",
            letterSpacing: "0.03em", marginTop: 6, transition: "background 0.2s",
          }}>
            {saved ? "✓ Сохранено" : saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </form>
      )}
    </div>
  );
}
