"use client";
import { useEffect, useMemo, useState } from "react";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  red: "#EF4444", redSft: "#FCE5E5",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface MaterialOption { id: number; name: string; unit: string; }

interface Props {
  open: boolean;
  materials: MaterialOption[];
  presetMaterialId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function ArrivalEditor({ open, materials, presetMaterialId, onClose, onSaved }: Props) {
  const [materialId, setMaterialId] = useState<number | null>(null);
  const [qty, setQty] = useState("");
  const [priceMode, setPriceMode] = useState<"per" | "total">("per");
  const [priceInput, setPriceInput] = useState(""); // rubles input from user
  const [supplier, setSupplier] = useState("");
  const [arrivedAt, setArrivedAt] = useState(todayIso());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMaterialId(presetMaterialId ?? materials[0]?.id ?? null);
    setQty(""); setPriceMode("per"); setPriceInput("");
    setSupplier(""); setArrivedAt(todayIso()); setNote("");
    setSaving(false); setError("");
  }, [open, materials, presetMaterialId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedMaterial = useMemo(
    () => materials.find(m => m.id === materialId) || null,
    [materials, materialId],
  );

  // Convert user input rubles → kopecks per unit
  const qtyNum = Number(qty);
  const priceNum = Number(priceInput);
  const pricePerUnitKopecks = (() => {
    if (!Number.isFinite(priceNum) || priceNum <= 0) return 0;
    if (priceMode === "per")   return Math.round(priceNum * 100);
    if (priceMode === "total") {
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) return 0;
      return Math.round((priceNum * 100) / qtyNum);
    }
    return 0;
  })();

  async function save() {
    if (!materialId)        { setError("Выберите материал"); return; }
    if (!(qtyNum > 0))      { setError("Количество должно быть больше 0"); return; }
    if (!(pricePerUnitKopecks >= 0)) { setError("Цена не задана"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/partner/material-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId, qty: qtyNum, pricePerUnit: pricePerUnitKopecks,
          arrivedAt, supplier: supplier.trim() || null, note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Не удалось сохранить");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(22,22,32,0.50)", backdropFilter: "blur(8px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }} />
      <div role="dialog" aria-modal="true" aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 480, maxHeight: "92vh", zIndex: 110,
          display: "flex", flexDirection: "column",
          transform: open ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -46%) scale(0.96)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s, transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          background: c.bg, borderRadius: 24,
          boxShadow: "0 40px 100px rgba(22,22,32,0.32), 0 8px 24px rgba(22,22,32,0.10)",
          fontFamily: "var(--font-montserrat)", overflow: "hidden",
        }}>
        <div style={{
          padding: "16px 24px", borderBottom: `1px solid ${c.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.txtDark }}>Новое поступление</h2>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 32, height: 32, borderRadius: 10, background: c.bgSoft, border: "none",
            cursor: "pointer", color: c.txtDark, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Материал">
            <select value={materialId ?? ""}
              onChange={e => setMaterialId(Number(e.target.value))}
              style={inputStyle}>
              {materials.length === 0 && <option value="">— Сначала создайте материал —</option>}
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </select>
          </Field>

          <Field label={`Количество${selectedMaterial ? ` (${selectedMaterial.unit})` : ""}`}>
            <input value={qty} onChange={e => setQty(e.target.value)}
              inputMode="decimal" placeholder="0"
              style={inputStyle} />
          </Field>

          <Field label="Цена в рублях">
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {([
                { key: "per" as const,   label: `за ед.` },
                { key: "total" as const, label: "общая сумма" },
              ]).map(o => {
                const sel = priceMode === o.key;
                return (
                  <button key={o.key} type="button" onClick={() => setPriceMode(o.key)}
                    style={{
                      padding: "6px 12px", borderRadius: 8,
                      background: sel ? c.txtDark : "transparent",
                      color: sel ? "#fff" : c.txtBody,
                      border: `1px solid ${sel ? c.txtDark : c.border}`,
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      fontFamily: "var(--font-montserrat)",
                    }}>{o.label}</button>
                );
              })}
            </div>
            <input value={priceInput} onChange={e => setPriceInput(e.target.value)}
              inputMode="decimal" placeholder="0.00"
              style={inputStyle} />
            {pricePerUnitKopecks > 0 && (
              <div style={{ fontSize: 11, color: c.txtMute, marginTop: 6 }}>
                {priceMode === "per"
                  ? `Итого: ${((pricePerUnitKopecks * qtyNum) / 100).toFixed(2)} ₽`
                  : `За единицу: ${(pricePerUnitKopecks / 100).toFixed(2)} ₽`}
              </div>
            )}
          </Field>

          <Field label="Поставщик (необязательно)">
            <input value={supplier} onChange={e => setSupplier(e.target.value)}
              placeholder="напр., КраскаОпт"
              style={inputStyle} />
          </Field>

          <Field label="Дата поступления">
            <input type="date" value={arrivedAt}
              onChange={e => setArrivedAt(e.target.value)}
              style={inputStyle} />
          </Field>

          <Field label="Заметка (необязательно)">
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2} placeholder="напр., акция -10%"
              style={{ ...inputStyle, height: "auto", minHeight: 60, padding: "10px 14px", resize: "vertical" }} />
          </Field>

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              background: c.redSft, color: c.red,
              fontSize: 12, fontWeight: 600,
            }}>{error}</div>
          )}
        </div>

        <footer style={{
          padding: "12px 24px", borderTop: `1px solid ${c.border}`, background: c.bgSoft,
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button type="button" onClick={onClose} disabled={saving}
            style={{
              padding: "11px 18px", borderRadius: 11,
              background: c.bg, color: c.txtBody, border: `1px solid ${c.border}`,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
            }}>Отмена</button>
          <button type="button" onClick={save} disabled={saving || materials.length === 0}
            style={{
              padding: "11px 22px", borderRadius: 11,
              background: c.primary, color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700,
              cursor: (saving || materials.length === 0) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
              opacity: materials.length === 0 ? 0.5 : 1,
            }}>{saving ? "Сохраняем..." : "Принять поступление"}</button>
        </footer>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px",
  background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 11,
  fontFamily: "var(--font-montserrat)", fontSize: 14, color: "#161620",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 11, color: "#9AA0B0", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{label}</label>
      {children}
    </div>
  );
}
