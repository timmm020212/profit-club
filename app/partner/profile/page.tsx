"use client";
import { useEffect, useState } from "react";

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

  if (loading) return <div style={{ color: "#aaa", padding: 20 }}>Загрузка...</div>;

  const fields = [
    { key: "name", label: "Название салона *", placeholder: "Студия красоты" },
    { key: "city", label: "Город", placeholder: "Москва" },
    { key: "address", label: "Адрес", placeholder: "ул. Пример, д. 1" },
    { key: "phone", label: "Телефон", placeholder: "+7 (___) ___-__-__" },
    { key: "description", label: "Описание", placeholder: "Расскажите о вашем салоне" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 20 }}>Профиль салона</h1>
      <form onSubmit={save} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0", display: "flex", flexDirection: "column", gap: 12 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{f.label}</label>
            <input
              value={form[f.key as keyof typeof form]}
              onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              required={f.key === "name"}
              style={{ width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none" }}
            />
          </div>
        ))}
        <button type="submit" disabled={saving} style={{ background: saved ? "#1a7a4a" : "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}>
          {saved ? "✓ Сохранено" : saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
