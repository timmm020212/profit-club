"use client";
import { useEffect, useState } from "react";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  red: "#EF4444", redSft: "#FCE5E5",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

const UNITS: { key: "g" | "ml" | "pcs" | "m"; label: string }[] = [
  { key: "g",   label: "грамм" },
  { key: "ml",  label: "мл" },
  { key: "pcs", label: "шт" },
  { key: "m",   label: "м" },
];

export interface MaterialData {
  id: number; name: string; unit: string;
  category: string | null; lowStockThreshold: string | null;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial: MaterialData | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export default function MaterialEditor({ open, mode, initial, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"g" | "ml" | "pcs" | "m">("g");
  const [category, setCategory] = useState("");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setUnit(((initial?.unit as "g" | "ml" | "pcs" | "m") ?? "g"));
    setCategory(initial?.category ?? "");
    setThreshold(initial?.lowStockThreshold ?? "");
    setError(""); setConfirmDelete(false); setSaving(false);
  }, [open, initial]);

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

  async function save() {
    if (!name.trim()) { setError("Введите название"); return; }
    setSaving(true); setError("");
    try {
      const url = mode === "create"
        ? "/api/partner/materials"
        : `/api/partner/materials/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          unit,
          category: category.trim() || null,
          lowStockThreshold: threshold.trim() || null,
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

  async function del() {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 4000); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/partner/materials/${initial!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Не удалось удалить");
      }
      onDeleted?.();
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
        background: "rgba(22,22,32,0.50)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }} />
      <div
        role="dialog" aria-modal="true" aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 480, maxHeight: "92vh",
          zIndex: 110, display: "flex", flexDirection: "column",
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
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.01em" }}>
            {mode === "create" ? "Новый материал" : "Изменить материал"}
          </h2>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 32, height: 32, borderRadius: 10,
            background: c.bgSoft, border: "none", cursor: "pointer",
            color: c.txtDark, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Название">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="напр., Краска L'Oréal Majirel 7.0"
              style={inputStyle} />
          </Field>

          <Field label="Единица измерения">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {UNITS.map(u => {
                const sel = unit === u.key;
                const disabled = mode === "edit"; // unit change is forbidden by design
                return (
                  <button key={u.key} type="button"
                    disabled={disabled}
                    onClick={() => setUnit(u.key)}
                    style={{
                      padding: "8px 14px", borderRadius: 10,
                      background: sel ? c.primary : c.bg,
                      color: sel ? "#fff" : (disabled ? c.txtMute : c.txtDark),
                      border: `1px solid ${sel ? c.primary : c.border}`,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-montserrat)",
                      fontSize: 13, fontWeight: 700,
                      opacity: disabled && !sel ? 0.5 : 1,
                    }}
                    title={disabled ? "Единицу нельзя менять у существующего материала" : ""}
                  >{u.label}</button>
                );
              })}
            </div>
          </Field>

          <Field label="Категория (необязательно)">
            <input value={category} onChange={e => setCategory(e.target.value)}
              placeholder="напр., Краски / Окислители / Расходники"
              style={inputStyle} />
          </Field>

          <Field label="Низкий остаток (необязательно)" hint="Когда остаток ниже этой цифры — покажем бейдж «низкий».">
            <input value={threshold} onChange={e => setThreshold(e.target.value)}
              inputMode="decimal" placeholder="0"
              style={inputStyle} />
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
          display: "flex", gap: 8,
        }}>
          {mode === "edit" && onDeleted && (
            <button type="button" onClick={del} disabled={saving}
              style={{
                padding: "11px 14px", borderRadius: 11,
                background: confirmDelete ? c.red : c.bg,
                color: confirmDelete ? "#fff" : c.red,
                border: `1px solid ${confirmDelete ? c.red : c.border}`,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "var(--font-montserrat)",
              }}>{confirmDelete ? "Точно?" : "Удалить"}</button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} disabled={saving}
            style={{
              padding: "11px 18px", borderRadius: 11,
              background: c.bg, color: c.txtBody, border: `1px solid ${c.border}`,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
            }}>Отмена</button>
          <button type="button" onClick={save} disabled={saving}
            style={{
              padding: "11px 18px", borderRadius: 11,
              background: c.primary, color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
              boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
            }}>{saving ? "Сохраняем..." : "Сохранить"}</button>
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 11, color: "#9AA0B0", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#9AA0B0" }}>{hint}</div>}
    </div>
  );
}
