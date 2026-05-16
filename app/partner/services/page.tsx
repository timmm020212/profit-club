"use client";
import { useEffect, useState } from "react";

interface Service { id: number; name: string; price: string | null; duration: number; }

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setServices(p => [data, ...p]);
        setForm({ name: "", price: "", duration: "", description: "" });
        setShowForm(false);
      }
    } finally {
      setAdding(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0",
    borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>Услуги</h1>
        <button
          onClick={() => setShowForm(p => !p)}
          style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={addService} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #ececf0", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "name", label: "Название *", placeholder: "Стрижка женская", required: true },
            { key: "price", label: "Цена (₽)", placeholder: "3500", required: false },
            { key: "duration", label: "Длительность (мин)", placeholder: "60", required: false },
            { key: "description", label: "Описание", placeholder: "Описание услуги", required: false },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>{f.label}</label>
              <input
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                required={f.required}
                style={inputStyle}
              />
            </div>
          ))}
          <button type="submit" disabled={adding} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: adding ? 0.6 : 1 }}>
            {adding ? "Сохраняем..." : "Сохранить"}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ color: "#aaa", padding: 20 }}>Загрузка...</div>
      ) : services.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center", color: "#aaa" }}>
          Услуг пока нет. Добавьте первую.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.map(s => (
            <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #ececf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>
                  {s.duration ? `${s.duration} мин` : ""}
                  {s.price ? ` · ${s.price} ₽` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
