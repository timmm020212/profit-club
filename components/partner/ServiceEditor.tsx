"use client";
import { useState, useEffect, useRef } from "react";

// ── tokens ──
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
  x:      "M18 6L6 18M6 6l12 12",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  trash:  "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  check:  "M20 6L9 17l-5-5",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
};

// Категории + автомапинг роли мастера (как в админке Profit)
const CATEGORIES: { name: string; icon: string; role: string }[] = [
  { name: "Парикмахерские услуги", icon: "✂️", role: "парикмахер" },
  { name: "Ногтевой сервис",       icon: "💅", role: "мастер ногтевого сервиса" },
  { name: "Массаж",                 icon: "💆", role: "массажист" },
  { name: "Косметология",           icon: "✨", role: "косметолог" },
  { name: "Фитнес",                 icon: "🏋️", role: "тренер" },
  { name: "Брови и ресницы",        icon: "👁️", role: "мастер бровей" },
  { name: "Эпиляция",               icon: "🌟", role: "мастер эпиляции" },
  { name: "СПА",                    icon: "🌿", role: "специалист" },
  { name: "Перманентный макияж",    icon: "🎨", role: "мастер татуажа" },
];

const BADGES: { key: string; label: string; bg: string; color: string }[] = [
  { key: "",         label: "Без бейджа", bg: "transparent",        color: c.txtMute },
  { key: "accent",   label: "HIT",         bg: "#B2223C",            color: "#fff" },
  { key: "discount", label: "−20%",        bg: "#059669",            color: "#fff" },
  { key: "dark",     label: "BLACK",       bg: "#18181B",            color: "#fff" },
  { key: "light",    label: "NEW",         bg: "#FFFFFF",            color: "#18181B" },
];

export interface ServiceData {
  id?: number;
  name: string;
  description?: string | null;
  price?: string | null;
  duration?: number | null;
  imageUrl?: string | null;
  category?: string | null;
  executorRole?: string | null;
  badgeText?: string | null;
  badgeType?: string | null;
}

interface Props {
  open: boolean;
  mode: "edit" | "create";
  initial?: ServiceData | null;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

// Strip non-digits for price display in input
function priceDigits(raw: unknown): string {
  if (!raw) return "";
  return String(raw).replace(/\D/g, "");
}

export default function ServiceEditor({ open, mode, initial, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState<ServiceData>({
    name: "", description: "", price: "", duration: 60,
    imageUrl: "", category: "", executorRole: "", badgeText: "", badgeType: "",
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Sync initial on open
  useEffect(() => {
    if (open) {
      setForm({
        id: initial?.id,
        name: mode === "edit" ? (initial?.name || "") : "",
        description: mode === "edit" ? (initial?.description || "") : "",
        price: mode === "edit" ? priceDigits(initial?.price) : "",
        duration: mode === "edit" ? (Number(initial?.duration) || 60) : 60,
        imageUrl: mode === "edit" ? (initial?.imageUrl || "") : "",
        category: mode === "edit" ? (initial?.category || "") : "",
        executorRole: mode === "edit" ? (initial?.executorRole || "") : "",
        badgeText: mode === "edit" ? (initial?.badgeText || "") : "",
        badgeType: mode === "edit" ? (initial?.badgeType || "") : "",
      });
      setError("");
      setUploadErr("");
      setSaving(false);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [open, mode, initial]);

  // Scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Category → auto-set executorRole
  function pickCategory(catName: string) {
    const found = CATEGORIES.find(c => c.name === catName);
    setForm(p => ({
      ...p,
      category: catName,
      executorRole: found?.role || p.executorRole || "",
    }));
  }

  async function handleFile(file: File) {
    setUploadErr("");
    if (!file.type.startsWith("image/")) {
      setUploadErr("Это не изображение"); return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setUploadErr("Файл больше 6 МБ"); return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setForm(p => ({ ...p, imageUrl: objectUrl }));
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/partner/services/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось загрузить");
      }
      const { url } = await res.json() as { url: string };
      setForm(p => ({ ...p, imageUrl: url }));
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Не удалось загрузить");
      setForm(p => ({ ...p, imageUrl: "" }));
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto() {
    setForm(p => ({ ...p, imageUrl: "" }));
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
    if (!form.name.trim()) {
      setError("Введите название услуги");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const imageUrl = form.imageUrl && !form.imageUrl.startsWith("blob:") ? form.imageUrl : null;

      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || "",
        price: form.price || null,
        duration: form.duration || 60,
        imageUrl,
        category: form.category || null,
        executorRole: form.executorRole || null,
        badgeText: form.badgeText?.trim() || null,
        badgeType: form.badgeText?.trim() ? (form.badgeType || null) : null,
      };

      const url = mode === "edit"
        ? `/api/partner/services/${form.id}`
        : `/api/partner/services`;
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
      const res = await fetch(`/api/partner/services/${form.id}`, { method: "DELETE" });
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

  // ── Styles ──
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

  const title = mode === "edit" ? "Редактировать услугу" : "Новая услуга";
  const subtitle = mode === "edit" ? "Внесите изменения" : "Добавьте услугу в прайс";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(22, 22, 32, 0.50)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }} />

      {/* Modal */}
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
          {/* Photo */}
          <div>
            <label style={labelStyle}>Фото услуги</label>
            <div
              role="button" tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFilePicker(); } }}
              onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && !uploading) handleFile(file);
              }}
              style={{
                position: "relative", width: "100%", aspectRatio: "16/9",
                borderRadius: 16, overflow: "hidden",
                background: form.imageUrl
                  ? `url(${form.imageUrl}) center/cover`
                  : `linear-gradient(135deg, #F4F1FE 0%, #EAE6FB 60%, #DAD2F5 100%)`,
                border: form.imageUrl
                  ? `1px solid ${c.border}`
                  : `2px dashed ${dragOver ? c.primary : "#D9D2F5"}`,
                boxShadow: dragOver ? `0 0 0 4px ${c.primarySft}` : "none",
                cursor: uploading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={e => { if (!form.imageUrl && !dragOver) e.currentTarget.style.borderColor = c.primary; }}
              onMouseLeave={e => { if (!form.imageUrl && !dragOver) e.currentTarget.style.borderColor = "#D9D2F5"; }}
            >
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

              {!form.imageUrl && !uploading && (
                <div style={{ textAlign: "center", color: c.txtBody, pointerEvents: "none" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 18,
                    background: "#FFFFFF", margin: "0 auto 12px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: c.primary,
                    boxShadow: "0 8px 20px rgba(123, 97, 255, 0.20)",
                  }}>
                    <Ic d={I.upload} size={22} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.txtDark }}>
                    {dragOver ? "Отпустите файл" : "Добавить фото"}
                  </div>
                  <div style={{ fontSize: 11, color: c.txtMute, marginTop: 3 }}>
                    JPG, PNG, WEBP • до 6 МБ
                  </div>
                </div>
              )}

              {/* Badge preview over image */}
              {form.imageUrl && form.badgeText?.trim() && form.badgeType && (
                (() => {
                  const b = BADGES.find(x => x.key === form.badgeType);
                  if (!b || !b.key) return null;
                  return (
                    <div style={{
                      position: "absolute", top: 12, right: 12,
                      padding: "5px 11px", borderRadius: 14,
                      background: b.bg, color: b.color,
                      fontSize: 11, fontWeight: 700,
                      letterSpacing: "0.04em",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                      pointerEvents: "none",
                    }}>{form.badgeText}</div>
                  );
                })()
              )}

              {form.imageUrl && !uploading && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, transparent 40%, rgba(22,22,32,0.55) 100%)",
                  display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                  padding: 12, gap: 8,
                }}>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); openFilePicker(); }}
                    style={{
                      padding: "7px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.95)", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600, color: c.txtDark,
                      fontFamily: "var(--font-montserrat)",
                      display: "inline-flex", alignItems: "center", gap: 6,
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 4px 12px rgba(22,22,32,0.18)",
                    }}
                  >
                    <Ic d={I.upload} size={13} />
                    Заменить
                  </button>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); handleRemovePhoto(); }}
                    aria-label="Удалить фото"
                    style={{
                      width: 30, height: 30, borderRadius: 10,
                      background: "rgba(255,255,255,0.95)", border: "none", cursor: "pointer",
                      color: c.red, display: "flex", alignItems: "center", justifyContent: "center",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 4px 12px rgba(22,22,32,0.18)",
                    }}
                  >
                    <Ic d={I.trash} size={14} />
                  </button>
                </div>
              )}

              {uploading && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(22,22,32,0.45)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 10,
                  color: "#fff", backdropFilter: "blur(2px)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.25)",
                    borderTopColor: "#fff",
                    animation: "seSpin 0.8s linear infinite",
                  }} />
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Загружаем...</div>
                </div>
              )}
            </div>
            {uploadErr && (
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: c.red }}>{uploadErr}</div>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Название *</label>
            <input
              type="text"
              placeholder="Стрижка женская"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onFocus={() => setFocused("name")} onBlur={() => setFocused(null)}
              style={inputStyle("name")}
              maxLength={120}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Категория</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORIES.map(cat => {
                const active = form.category === cat.name;
                return (
                  <button
                    key={cat.name} type="button"
                    onClick={() => pickCategory(active ? "" : cat.name)}
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
                    <span aria-hidden style={{ fontSize: 14 }}>{cat.icon}</span>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price + Duration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Цена</label>
              <input
                type="text" inputMode="numeric"
                placeholder="3 500 ₽"
                value={(() => {
                  const digits = String(form.price || "").replace(/\D/g, "");
                  if (!digits) return "";
                  return `${Number(digits).toLocaleString("ru-RU")} ₽`;
                })()}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setForm(p => ({ ...p, price: digits }));
                }}
                onFocus={() => setFocused("price")} onBlur={() => setFocused(null)}
                style={inputStyle("price")}
              />
            </div>
            <div>
              <label style={labelStyle}>Длительность</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text" inputMode="numeric"
                  placeholder="60"
                  value={form.duration?.toString() || ""}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "");
                    setForm(p => ({ ...p, duration: v ? Number(v) : null }));
                  }}
                  onFocus={() => setFocused("duration")} onBlur={() => setFocused(null)}
                  style={{ ...inputStyle("duration"), paddingRight: 44 }}
                  maxLength={4}
                />
                <div style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  color: c.txtMute, fontSize: 12, pointerEvents: "none",
                }}>мин</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Описание</label>
            <textarea
              placeholder="Стрижка, мытьё головы, укладка..."
              value={form.description || ""}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onFocus={() => setFocused("description")} onBlur={() => setFocused(null)}
              rows={3}
              style={{ ...inputStyle("description"), resize: "vertical", minHeight: 84, fontFamily: "var(--font-montserrat)" }}
              maxLength={500}
            />
          </div>

          {/* Badge */}
          <div>
            <label style={labelStyle}>Бейдж на карточке</label>
            <input
              type="text"
              placeholder="Например: ХИТ, NEW, −20%"
              value={form.badgeText || ""}
              onChange={e => setForm(p => ({ ...p, badgeText: e.target.value }))}
              onFocus={() => setFocused("badge")} onBlur={() => setFocused(null)}
              style={inputStyle("badge")}
              maxLength={20}
            />
            {form.badgeText?.trim() && (
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {BADGES.filter(b => b.key).map(b => {
                  const active = form.badgeType === b.key;
                  return (
                    <button
                      key={b.key} type="button"
                      onClick={() => setForm(p => ({ ...p, badgeType: b.key }))}
                      style={{
                        padding: "6px 12px", borderRadius: 14,
                        background: b.bg, color: b.color,
                        border: b.key === "light" ? `1.5px solid ${active ? c.primary : c.border}` : `1.5px solid ${active ? c.primary : "transparent"}`,
                        fontSize: 11, fontWeight: 700,
                        letterSpacing: "0.04em",
                        cursor: "pointer", fontFamily: "var(--font-montserrat)",
                        outline: active ? `3px solid ${c.primarySft}` : "none",
                        transition: "all 0.15s",
                      }}
                    >{b.label}</button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, badgeType: "" }))}
                  style={{
                    padding: "6px 12px", borderRadius: 14,
                    background: c.bgSoft, color: c.txtMute,
                    border: `1.5px solid ${!form.badgeType ? c.primary : c.border}`,
                    fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "var(--font-montserrat)",
                    outline: !form.badgeType ? `3px solid ${c.primarySft}` : "none",
                  }}
                >Без стиля</button>
              </div>
            )}
          </div>

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
              aria-label={confirmDelete ? "Подтвердить удаление" : "Удалить услугу"}
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
          @keyframes seSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
