"use client";
import { useEffect, useState } from "react";

interface Master { id: number; fullName: string; specialization: string; phone: string | null; }

export default function MastersPage() {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", specialization: "", phone: "" });
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/partner/masters")
      .then(r => r.json())
      .then(d => { setMasters(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  async function addMaster(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch("/api/partner/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setMasters(p => [...p, data]);
        setForm({ name: "", specialization: "", phone: "" });
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>Мастера</h1>
        <button
          onClick={() => setShowForm(p => !p)}
          style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={addMaster} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #ececf0", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "name", label: "Имя *", placeholder: "Анна Иванова", required: true },
            { key: "specialization", label: "Специализация", placeholder: "Парикмахер, колорист", required: false },
            { key: "phone", label: "Телефон", placeholder: "+7 (___) ___-__-__", required: false },
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
            {adding ? "Сохраняем..." : "Добавить мастера"}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ color: "#aaa", padding: 20 }}>Загрузка...</div>
      ) : masters.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center", color: "#aaa" }}>
          Мастеров пока нет.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {masters.map(m => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #ececf0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👩‍💼</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{m.fullName}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{m.specialization || "Без специализации"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
