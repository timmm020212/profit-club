"use client";
import { useEffect, useState } from "react";

const crimson = "#B2223C";
const txtDark = "#111111", txtMid = "#666666", txtSoft = "#AAAAAA";
const border = "#E8E5DF";

const inputSt: React.CSSProperties = {
  width: "100%", background: "#fff", border: "1px solid #E0DDD7",
  borderRadius: 8, padding: "10px 14px", fontSize: 13, color: txtDark,
  fontFamily: "var(--font-montserrat)", outline: "none",
  boxSizing: "border-box",
};
const labelSt: React.CSSProperties = {
  display: "block", fontSize: 9, color: txtSoft,
  letterSpacing: "0.18em", textTransform: "uppercase",
  fontFamily: "var(--font-montserrat)", marginBottom: 7,
};

interface Service { id: number; name: string; price: string | null; duration: number; description?: string | null; }

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", price: "", duration: "", description: "" });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch("/api/partner/services")
      .then(r => r.json())
      .then(d => { setServices(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/partner/services", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setServices(p => [data, ...p]);
        setForm({ name: "", price: "", duration: "", description: "" });
        setShowForm(false);
      }
    } finally { setAdding(false); }
  }

  const fields = [
    { key: "name", label: "Название *", placeholder: "Стрижка женская", required: true },
    { key: "price", label: "Цена (₽)", placeholder: "3500", required: false },
    { key: "duration", label: "Длительность (мин)", placeholder: "60", required: false },
    { key: "description", label: "Описание", placeholder: "Опишите услугу", required: false },
  ];

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Управление</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: txtDark, margin: 0, lineHeight: 1.1 }}>Услуги</h1>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          style={{
            background: showForm ? "transparent" : crimson,
            color: showForm ? txtMid : "#fff",
            border: showForm ? "1px solid #E0DDD7" : "none",
            borderRadius: 8, padding: "11px 22px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-montserrat)",
            letterSpacing: "0.03em", flexShrink: 0,
            transition: "background 0.2s",
          }}
        >{showForm ? "Отмена" : "+ Добавить"}</button>
      </div>

      {showForm && (
        <form onSubmit={addService} style={{
          background: "#fff", borderRadius: 10,
          border: "1px solid rgba(178,34,60,0.2)",
          padding: 24, marginBottom: 20,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 16, fontWeight: 700, color: txtDark, marginBottom: 4 }}>Новая услуга</div>
          {fields.map(f => (
            <div key={f.key}>
              <label style={labelSt}>{f.label}</label>
              <input value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder} required={f.required} style={inputSt} />
            </div>
          ))}
          <button type="submit" disabled={adding} style={{
            background: adding ? "#ccc" : crimson, color: "#fff", border: "none",
            borderRadius: 8, padding: "12px 22px", fontSize: 13, fontWeight: 600,
            cursor: adding ? "not-allowed" : "pointer", fontFamily: "var(--font-montserrat)",
            letterSpacing: "0.03em", marginTop: 4,
          }}>{adding ? "Сохраняем..." : "Сохранить услугу"}</button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtSoft, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : services.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${border}`, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 18, color: txtDark, marginBottom: 6 }}>Добавьте первую услугу</div>
          <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft }}>Нажмите «+ Добавить» чтобы создать услугу</div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${border}`, overflow: "hidden" }}>
          {services.map((s, i) => (
            <div key={s.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              padding: "16px 20px",
              borderBottom: i < services.length - 1 ? `1px solid #F5F3EF` : "none",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 600, color: txtDark, marginBottom: 3 }}>{s.name}</div>
                <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, color: txtSoft }}>
                  {s.duration ? `${s.duration} мин` : ""}{s.duration && s.description ? " · " : ""}{s.description || ""}
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 700, color: crimson, flexShrink: 0 }}>
                {s.price ? `${s.price} ₽` : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
