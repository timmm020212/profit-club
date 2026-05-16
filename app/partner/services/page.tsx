"use client";
import { useEffect, useState } from "react";

const card = "#111120";
const border = "rgba(255,255,255,0.07)";
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 8 }}>Управление</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: txtPri, margin: 0 }}>Услуги</h1>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          style={{
            background: showForm ? "rgba(255,255,255,0.06)" : crimGrd,
            color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 18px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "var(--font-montserrat)",
            marginTop: 20, flexShrink: 0,
          }}
        >{showForm ? "✕ Отмена" : "+ Добавить"}</button>
      </div>

      {showForm && (
        <form onSubmit={addService} style={{
          background: card, borderRadius: 16, padding: "24px",
          border: `1px solid rgba(200,169,110,0.2)`,
          marginBottom: 20, display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ fontSize: 13, fontFamily: "var(--font-playfair)", color: gold, marginBottom: 4 }}>Новая услуга</div>
          {fields.map(f => (
            <div key={f.key}>
              <label style={labelSt}>{f.label}</label>
              <input value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder} required={f.required} style={inputSt} />
            </div>
          ))}
          <button type="submit" disabled={adding} style={{
            background: crimGrd, color: "#fff", border: "none", borderRadius: 10,
            padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)", opacity: adding ? 0.65 : 1,
          }}>{adding ? "Сохраняем..." : "Сохранить услугу"}</button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtMut, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : services.length === 0 ? (
        <div style={{ background: card, borderRadius: 16, padding: "40px 24px", border: `1px solid ${border}`, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✂️</div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-playfair)", color: txtPri, marginBottom: 6 }}>Добавьте первую услугу</div>
          <div style={{ fontSize: 12, color: txtMut, fontFamily: "var(--font-montserrat)" }}>Нажмите «+ Добавить» чтобы создать услугу</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map(s => (
            <div key={s.id} style={{
              background: card, borderRadius: 14, padding: "16px 20px",
              border: `1px solid ${border}`,
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: txtPri, fontFamily: "var(--font-montserrat)", marginBottom: 3 }}>{s.name}</div>
                <div style={{ fontSize: 11, color: txtSec, fontFamily: "var(--font-montserrat)" }}>
                  {s.duration ? `${s.duration} мин` : ""}{s.duration && s.price ? " · " : ""}{s.price ? `${s.price} ₽` : ""}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: gold, fontFamily: "var(--font-playfair)", flexShrink: 0 }}>
                {s.price ? `${s.price} ₽` : "—"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
