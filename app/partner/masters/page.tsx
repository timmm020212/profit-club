"use client";
import { useEffect, useState } from "react";

const card = "#111120", border = "rgba(255,255,255,0.07)", gold = "#C8A96E";
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

  // Avatar colour from name hash
  function avatarBg(name: string) {
    const colors = ["rgba(200,169,110,0.2)", "rgba(178,34,60,0.2)", "rgba(74,222,128,0.15)", "rgba(96,165,250,0.15)"];
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }
  function avatarColor(name: string) {
    const colors = [gold, "#E8556E", "#4ADE80", "#60A5FA"];
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 8 }}>Управление</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: txtPri, margin: 0 }}>Мастера</h1>
        </div>
        <button onClick={() => setShowForm(p => !p)} style={{
          background: showForm ? "rgba(255,255,255,0.06)" : crimGrd,
          color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px",
          fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-montserrat)",
          marginTop: 20, flexShrink: 0,
        }}>{showForm ? "✕ Отмена" : "+ Добавить"}</button>
      </div>

      {showForm && (
        <form onSubmit={addMaster} style={{
          background: card, borderRadius: 16, padding: 24,
          border: "1px solid rgba(200,169,110,0.2)",
          marginBottom: 20, display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ fontSize: 13, fontFamily: "var(--font-playfair)", color: gold, marginBottom: 4 }}>Новый мастер</div>
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
            background: crimGrd, color: "#fff", border: "none", borderRadius: 10,
            padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)", opacity: adding ? 0.65 : 1,
          }}>{adding ? "Сохраняем..." : "Добавить мастера"}</button>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: txtMut, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>Загрузка...</div>
      ) : masters.length === 0 ? (
        <div style={{ background: card, borderRadius: 16, padding: "40px 24px", border: `1px solid ${border}`, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 15, fontFamily: "var(--font-playfair)", color: txtPri, marginBottom: 6 }}>Добавьте мастеров</div>
          <div style={{ fontSize: 12, color: txtMut, fontFamily: "var(--font-montserrat)" }}>Нажмите «+ Добавить» чтобы добавить первого мастера</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {masters.map(m => (
            <div key={m.id} style={{
              background: card, borderRadius: 16, padding: "20px",
              border: `1px solid ${border}`,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                background: avatarBg(m.fullName), display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 18, fontFamily: "var(--font-playfair)", fontWeight: 700,
                color: avatarColor(m.fullName),
              }}>
                {m.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: txtPri, fontFamily: "var(--font-montserrat)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.fullName}</div>
                {m.specialization && <div style={{ fontSize: 11, color: txtSec, fontFamily: "var(--font-montserrat)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.specialization}</div>}
                {m.phone && <div style={{ fontSize: 11, color: txtMut, fontFamily: "var(--font-montserrat)", marginTop: 2 }}>{m.phone}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
