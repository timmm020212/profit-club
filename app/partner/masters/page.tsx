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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { setMasters(p => [...p, data]); setForm({ name: "", specialization: "", phone: "" }); setShowForm(false); }
    } finally { setAdding(false); }
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${border}` }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>Управление</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 36, fontWeight: 700, color: txtDark, margin: 0, lineHeight: 1.1 }}>Мастера</h1>
        </div>
        <button onClick={() => setShowForm(p => !p)} style={{
          background: showForm ? "transparent" : crimson,
          color: showForm ? txtMid : "#fff",
          border: showForm ? "1px solid #E0DDD7" : "none",
          borderRadius: 8, padding: "11px 22px", fontSize: 13, fontWeight: 600,
          cursor: "pointer", fontFamily: "var(--font-montserrat)",
          letterSpacing: "0.03em", flexShrink: 0,
          transition: "background 0.2s",
        }}>{showForm ? "Отмена" : "+ Добавить"}</button>
      </div>

      {showForm && (
        <form onSubmit={addMaster} style={{
          background: "#fff", borderRadius: 10,
          border: "1px solid rgba(178,34,60,0.2)",
          padding: 24, marginBottom: 20,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 16, fontWeight: 700, color: txtDark, marginBottom: 4 }}>Новый мастер</div>
          {[
            { key: "name", label: "Имя *", placeholder: "Анна Иванова", required: true },
            { key: "specialization", label: "Специализация", placeholder: "Парикмахер, колорист", required: false },
            { key: "phone", label: "Телефон", placeholder: "+7 (___) ___-__-__", required: false },
          ].map(f => (
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
          }}>{adding ? "Сохраняем..." : "Добавить мастера"}</button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtSoft, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : masters.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${border}`, padding: "40px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 18, color: txtDark, marginBottom: 6 }}>Добавьте мастеров</div>
          <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft }}>Нажмите «+ Добавить» чтобы добавить первого мастера</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {masters.map(m => (
            <div key={m.id} style={{
              background: "#fff", borderRadius: 10, padding: 20,
              border: `1px solid ${border}`,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: "#F0EDE8", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-playfair)", fontSize: 18, fontWeight: 700,
                color: txtDark,
              }}>
                {m.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 13, fontWeight: 600, color: txtDark, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.fullName}</div>
                {m.specialization && <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, color: txtMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.specialization}</div>}
                {m.phone && <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 11, color: txtSoft, marginTop: 2 }}>{m.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
