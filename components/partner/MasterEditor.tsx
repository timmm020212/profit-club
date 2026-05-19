"use client";
import { useState, useEffect, useRef } from "react";

const c = {
  bg:         "#FFFFFF",
  bgSoft:     "#F7F7FA",
  border:     "#ECECF0",
  borderSoft: "#F2F2F6",
  primary:    "#7B61FF",
  primaryDk:  "#5B3FE5",
  primarySft: "#F0EDFE",
  txtDark:    "#161620",
  txtBody:    "#5F6577",
  txtMute:    "#9AA0B0",
  red:        "#EF4444",
  redSft:     "#FCE5E5",
  green:      "#1FB46A",
  greenSft:   "#E3F8EE",
};

function Ic({ d, size = 20, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const I = {
  x:       "M18 6L6 18M6 6l12 12",
  camera:  "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z",
  trash:   "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  check:   "M20 6L9 17l-5-5",
  info:    "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  plus:    "M12 5v14M5 12h14",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff:  "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22",
};

// Стандартные специализации — синхронизированы с категориями услуг (ServiceEditor)
const ROLES: { name: string; icon: string }[] = [
  { name: "парикмахер",                icon: "✂️" },
  { name: "мастер ногтевого сервиса",  icon: "💅" },
  { name: "массажист",                  icon: "💆" },
  { name: "косметолог",                 icon: "✨" },
  { name: "тренер",                     icon: "🏋️" },
  { name: "мастер бровей",              icon: "👁️" },
  { name: "мастер эпиляции",            icon: "🌟" },
  { name: "специалист",                 icon: "🌿" },
  { name: "мастер татуажа",             icon: "🎨" },
];

export interface MasterData {
  id?: number;
  fullName: string;
  specialization?: string | null;
  phone?: string | null;
  telegramId?: string | null;
  photoUrl?: string | null;
  showOnSite?: boolean;
}

interface Props {
  open: boolean;
  mode: "edit" | "create";
  initial?: MasterData | null;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

// Hash → consistent gradient per name
function gradientFor(name: string): string {
  const palettes = [
    "linear-gradient(135deg, #7B61FF, #5B3FE5)",
    "linear-gradient(135deg, #F87171, #EF4444)",
    "linear-gradient(135deg, #36C77E, #1FB46A)",
    "linear-gradient(135deg, #FBA94C, #F97316)",
    "linear-gradient(135deg, #60A5FA, #2563EB)",
    "linear-gradient(135deg, #E879F9, #C026D3)",
  ];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function splitSpec(value: string | null | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(String(value).split(",").map(s => s.trim().toLowerCase()).filter(Boolean));
}

function joinSpec(set: Set<string>): string {
  return Array.from(set).join(", ");
}

export default function MasterEditor({ open, mode, initial, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<MasterData>({
    fullName: "", specialization: "", phone: "", telegramId: "",
    photoUrl: "", showOnSite: true,
  });
  const [roleSet, setRoleSet] = useState<Set<string>>(new Set());
  const [customRole, setCustomRole] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      const init = mode === "edit" ? initial : null;
      setForm({
        id: init?.id,
        fullName: init?.fullName || "",
        specialization: init?.specialization || "",
        phone: init?.phone || "",
        telegramId: init?.telegramId || "",
        photoUrl: init?.photoUrl || "",
        showOnSite: init?.showOnSite !== false,
      });
      setRoleSet(splitSpec(init?.specialization));
      setCustomRole("");
      setError("");
      setUploadErr("");
      setSaving(false);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [open, mode, initial]);

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

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  function toggleRole(name: string) {
    const norm = name.trim().toLowerCase();
    if (!norm) return;
    setRoleSet(prev => {
      const next = new Set(prev);
      if (next.has(norm)) next.delete(norm);
      else next.add(norm);
      return next;
    });
  }

  function addCustomRole() {
    const v = customRole.trim().toLowerCase();
    if (!v) return;
    setRoleSet(prev => {
      const next = new Set(prev);
      next.add(v);
      return next;
    });
    setCustomRole("");
  }

  async function handleFile(file: File) {
    setUploadErr("");
    if (!file.type.startsWith("image/")) {
      setUploadErr("Это не изображение"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadErr("Файл больше 5 МБ"); return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setForm(p => ({ ...p, photoUrl: objectUrl }));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/partner/masters/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось загрузить");
      }
      const { url } = await res.json() as { url: string };
      setForm(p => ({ ...p, photoUrl: url }));
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Не удалось загрузить");
      setForm(p => ({ ...p, photoUrl: "" }));
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto() {
    setForm(p => ({ ...p, photoUrl: "" }));
    setUploadErr("");
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function openFilePicker() {
    if (!uploading) fileInputRef.current?.click();
  }

  async function handleSave() {
    const cleanName = form.fullName.trim();
    if (!cleanName) {
      setError("Введите имя мастера");
      return;
    }
    if (roleSet.size === 0) {
      setError("Выберите хотя бы одну специализацию");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const photoUrl = form.photoUrl && !form.photoUrl.startsWith("blob:") ? form.photoUrl : null;
      const payload = {
        fullName: cleanName,
        specialization: joinSpec(roleSet),
        phone: form.phone?.trim() || null,
        telegramId: form.telegramId?.trim().replace(/^@/, "") || null,
        photoUrl,
        showOnSite: form.showOnSite !== false,
      };

      const url = mode === "edit"
        ? `/api/partner/masters/${form.id}`
        : `/api/partner/masters`;
      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сохранить");
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !form.id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/partner/masters/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось удалить");
      }
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, color: c.txtMute,
    letterSpacing: "0.12em", textTransform: "uppercase",
    marginBottom: 7, fontFamily: "var(--font-montserrat)",
  };
  const inputStyle = (key: string): React.CSSProperties => ({
    width: "100%", padding: "11px 14px",
    background: c.bg, color: c.txtDark,
    border: `1.5px solid ${focused === key ? c.primary : c.border}`,
    borderRadius: 12, fontSize: 14,
    fontFamily: "var(--font-montserrat)", outline: "none",
    boxShadow: focused === key ? `0 0 0 4px ${c.primarySft}` : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxSizing: "border-box",
  });

  const title = mode === "edit" ? "Редактировать мастера" : "Новый мастер";
  const subtitle = mode === "edit" ? "Внесите изменения" : "Добавьте в команду";

  return (
    <>
      <div onClick={onClose} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(22, 22, 32, 0.50)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }} />

      <div
        role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 540, maxHeight: "92vh",
          zIndex: 110, display: "flex", flexDirection: "column",
          transform: open
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -46%) scale(0.96)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          background: c.bg, borderRadius: 24,
          boxShadow: "0 40px 100px rgba(22,22,32,0.32), 0 8px 24px rgba(22,22,32,0.10)",
          fontFamily: "var(--font-montserrat)",
        }}
      >
        {/* Header */}
        <header style={{
          padding: "20px 24px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${c.border}`, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: c.primary, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4,
            }}>{subtitle}</div>
            <h2 style={{
              fontSize: 19, fontWeight: 800, color: c.txtDark, margin: 0,
              letterSpacing: "-0.02em", lineHeight: 1.15,
            }}>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 36, height: 36, borderRadius: 12,
            background: c.bgSoft, border: "none", cursor: "pointer",
            color: c.txtBody, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s, color 0.15s", flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = c.border; e.currentTarget.style.color = c.txtDark; }}
            onMouseLeave={e => { e.currentTarget.style.background = c.bgSoft; e.currentTarget.style.color = c.txtBody; }}
          >
            <Ic d={I.x} size={16} />
          </button>
        </header>

        {/* Body */}
        <div style={{
          flex: 1, overflowY: "auto", padding: 24,
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          {/* Avatar uploader — circular */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              role="button" tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFilePicker(); } }}
              aria-label="Загрузить фото мастера"
              style={{
                position: "relative",
                width: 130, height: 130, borderRadius: "50%",
                background: form.photoUrl
                  ? `url(${form.photoUrl}) center/cover`
                  : gradientFor(form.fullName || "?"),
                cursor: uploading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff",
                fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em",
                fontFamily: "var(--font-montserrat)",
                boxShadow: "0 12px 30px rgba(22,22,32,0.12)",
                border: `4px solid ${c.bg}`,
                outline: `1px solid ${c.border}`,
                transition: "transform 0.15s",
                userSelect: "none",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              {!form.photoUrl && !uploading && (
                <span aria-hidden>{initialsOf(form.fullName || "?")}</span>
              )}

              {/* Camera badge */}
              {!uploading && (
                <div style={{
                  position: "absolute", bottom: 4, right: 4,
                  width: 36, height: 36, borderRadius: "50%",
                  background: c.primary, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 6px 14px rgba(123, 97, 255, 0.40), 0 0 0 3px #FFFFFF",
                  pointerEvents: "none",
                }}>
                  <Ic d={I.camera} size={16} sw={2} />
                </div>
              )}

              {/* Remove (only when photo set) */}
              {form.photoUrl && !uploading && (
                <button type="button"
                  onClick={e => { e.stopPropagation(); handleRemovePhoto(); }}
                  aria-label="Удалить фото"
                  style={{
                    position: "absolute", top: 0, right: 0,
                    width: 28, height: 28, borderRadius: "50%",
                    background: "#FFFFFF", color: c.red, border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", boxShadow: "0 4px 12px rgba(22,22,32,0.18)",
                  }}
                >
                  <Ic d={I.x} size={14} />
                </button>
              )}

              {uploading && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(22,22,32,0.50)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  backdropFilter: "blur(2px)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.25)",
                    borderTopColor: "#fff",
                    animation: "meSpin 0.8s linear infinite",
                  }} />
                </div>
              )}

              <input
                ref={fileInputRef} type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          {uploadErr && (
            <div style={{ textAlign: "center", fontSize: 12, fontWeight: 600, color: c.red, marginTop: -8 }}>
              {uploadErr}
            </div>
          )}

          {/* Name */}
          <div>
            <label style={labelStyle}>ФИО *</label>
            <input
              type="text"
              placeholder="Анна Иванова"
              value={form.fullName}
              onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
              onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
              style={inputStyle("name")}
              maxLength={120}
              autoFocus
            />
          </div>

          {/* Specializations */}
          <div>
            <label style={labelStyle}>Специализации *</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {ROLES.map(r => {
                const active = roleSet.has(r.name);
                return (
                  <button
                    key={r.name} type="button"
                    onClick={() => toggleRole(r.name)}
                    style={{
                      padding: "8px 12px", borderRadius: 20,
                      background: active ? c.primarySft : c.bg,
                      border: `1.5px solid ${active ? c.primary : c.border}`,
                      color: active ? c.primary : c.txtBody,
                      fontSize: 12, fontWeight: active ? 700 : 500,
                      cursor: "pointer", fontFamily: "var(--font-montserrat)",
                      display: "inline-flex", alignItems: "center", gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    <span aria-hidden style={{ fontSize: 14 }}>{r.icon}</span>
                    {r.name}
                  </button>
                );
              })}
            </div>

            {/* Custom roles added beyond predefined */}
            {Array.from(roleSet).filter(r => !ROLES.some(p => p.name === r)).map(r => (
              <span key={r} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 10px 6px 12px", borderRadius: 16,
                background: c.primarySft, color: c.primary,
                fontSize: 12, fontWeight: 600, marginRight: 6, marginBottom: 6,
              }}>
                {r}
                <button type="button"
                  onClick={() => toggleRole(r)}
                  aria-label="Убрать"
                  style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: "rgba(123,97,255,0.15)", color: c.primary,
                    border: "none", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <Ic d={I.x} size={11} />
                </button>
              </span>
            ))}

            {/* Add custom */}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                type="text"
                placeholder="Своя специализация..."
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomRole(); } }}
                onFocus={() => setFocused("custom")} onBlur={() => setFocused(null)}
                style={{ ...inputStyle("custom"), flex: 1 }}
                maxLength={50}
              />
              <button
                type="button"
                onClick={addCustomRole}
                disabled={!customRole.trim()}
                style={{
                  padding: "0 14px",
                  background: customRole.trim() ? c.primarySft : c.bgSoft,
                  color: customRole.trim() ? c.primary : c.txtMute,
                  border: `1.5px solid ${customRole.trim() ? c.primary : c.border}`,
                  borderRadius: 12,
                  fontSize: 12, fontWeight: 700,
                  cursor: customRole.trim() ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-montserrat)",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                <Ic d={I.plus} size={14} /> Добавить
              </button>
            </div>
          </div>

          {/* Phone + Telegram */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Телефон</label>
              <input
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={form.phone || ""}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
                style={inputStyle("phone")}
                maxLength={30}
              />
            </div>
            <div>
              <label style={labelStyle}>Telegram</label>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: c.txtMute, fontSize: 14, pointerEvents: "none",
                  fontFamily: "var(--font-montserrat)",
                }}>@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={(form.telegramId || "").replace(/^@/, "")}
                  onChange={e => setForm(p => ({ ...p, telegramId: e.target.value.replace(/^@+/, "") }))}
                  onFocus={() => setFocused("tg")} onBlur={() => setFocused(null)}
                  style={{ ...inputStyle("tg"), paddingLeft: 28 }}
                  maxLength={40}
                />
              </div>
            </div>
          </div>

          {/* Show on site toggle */}
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, showOnSite: !p.showOnSite }))}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", borderRadius: 14,
              background: form.showOnSite ? c.primarySft : c.bgSoft,
              border: `1.5px solid ${form.showOnSite ? "rgba(123,97,255,0.30)" : c.border}`,
              cursor: "pointer", textAlign: "left",
              fontFamily: "var(--font-montserrat)",
              transition: "all 0.15s",
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: form.showOnSite ? c.primary : c.border,
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}>
              <Ic d={form.showOnSite ? I.eye : I.eyeOff} size={17} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark, marginBottom: 2 }}>
                Показывать на сайте
              </div>
              <div style={{ fontSize: 11, color: c.txtMute, lineHeight: 1.4 }}>
                {form.showOnSite
                  ? "Клиенты видят мастера и могут записаться к нему"
                  : "Мастер скрыт со страницы записи"}
              </div>
            </div>
            <div style={{
              width: 44, height: 26, borderRadius: 13,
              background: form.showOnSite ? c.primary : "#CBCED9",
              position: "relative", flexShrink: 0,
              transition: "background 0.2s",
            }}>
              <div style={{
                position: "absolute", top: 3, left: form.showOnSite ? 21 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s cubic-bezier(0.32, 0.72, 0, 1)",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }} />
            </div>
          </button>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "12px 14px", borderRadius: 12,
              background: c.redSft, border: `1px solid rgba(239,68,68,0.22)`,
              color: c.red, fontSize: 13, fontWeight: 600, lineHeight: 1.45,
            }}>
              <Ic d={I.info} size={16} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer style={{
          padding: "16px 24px",
          display: "flex", gap: 10,
          borderTop: `1px solid ${c.border}`,
          background: c.bgSoft,
          borderRadius: "0 0 24px 24px",
          flexShrink: 0,
        }}>
          {mode === "edit" && (
            <button
              type="button" onClick={handleDelete}
              disabled={saving || deleting || uploading}
              style={{
                padding: "13px 16px",
                background: confirmDelete ? c.red : c.bg,
                border: `1px solid ${confirmDelete ? c.red : c.border}`,
                borderRadius: 12,
                color: confirmDelete ? "#fff" : c.red,
                fontSize: 13, fontWeight: 600,
                cursor: (saving || deleting || uploading) ? "not-allowed" : "pointer",
                fontFamily: "var(--font-montserrat)",
                display: "inline-flex", alignItems: "center", gap: 7,
                transition: "all 0.18s",
                whiteSpace: "nowrap",
              }}
            >
              <Ic d={I.trash} size={14} />
              {deleting ? "Удаляем..." : confirmDelete ? "Точно удалить?" : "Удалить"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button" onClick={onClose}
            disabled={saving || deleting}
            style={{
              padding: "13px 20px",
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, color: c.txtBody,
              fontSize: 13, fontWeight: 600,
              cursor: (saving || deleting) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => !(saving || deleting) && (e.currentTarget.style.background = c.borderSoft)}
            onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
          >Отмена</button>
          <button
            type="button" onClick={handleSave}
            disabled={saving || deleting || uploading}
            style={{
              padding: "13px 22px",
              background: (saving || deleting || uploading) ? c.txtMute : c.primary,
              border: "none", borderRadius: 12,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: (saving || deleting || uploading) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              letterSpacing: "0.02em",
              transition: "background 0.15s, box-shadow 0.15s, transform 0.15s",
              boxShadow: (saving || deleting || uploading) ? "none" : "0 8px 22px rgba(123, 97, 255, 0.32)",
            }}
            onMouseEnter={e => {
              if (!(saving || deleting || uploading)) {
                e.currentTarget.style.background = c.primaryDk;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 12px 28px rgba(123, 97, 255, 0.40)";
              }
            }}
            onMouseLeave={e => {
              if (!(saving || deleting || uploading)) {
                e.currentTarget.style.background = c.primary;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 22px rgba(123, 97, 255, 0.32)";
              }
            }}
          >
            {saving ? "Сохраняем..." : uploading ? "Подождите..." : mode === "edit" ? "Сохранить" : "Создать"}
          </button>
        </footer>

        <style>{`
          @keyframes meSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
