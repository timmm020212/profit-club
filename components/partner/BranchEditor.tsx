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
  image:  "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  trash:  "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  check:  "M20 6L9 17l-5-5",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
};

export interface BranchData {
  name: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  description?: string | null;
  logoUrl?: string | null;
}

interface Props {
  open: boolean;
  mode: "edit" | "create";
  initial?: BranchData | null;
  onClose: () => void;
  onSaved?: () => void;
}

export default function BranchEditor({ open, mode, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<BranchData>({
    name: "", city: "", address: "", phone: "", description: "", logoUrl: "",
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [success, setSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Reset/sync form when opening
  useEffect(() => {
    if (open) {
      setForm({
        name: mode === "edit" ? (initial?.name || "") : "",
        city: mode === "edit" ? (initial?.city || "") : "",
        address: mode === "edit" ? (initial?.address || "") : "",
        phone: mode === "edit" ? (initial?.phone || "") : "",
        description: mode === "edit" ? (initial?.description || "") : "",
        logoUrl: mode === "edit" ? (initial?.logoUrl || "") : "",
      });
      setError("");
      setInfo("");
      setSuccess(false);
      setSaving(false);
    }
  }, [open, mode, initial]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Cleanup object URL on unmount/close
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  async function handleFile(file: File) {
    setUploadErr("");
    if (!file.type.startsWith("image/")) {
      setUploadErr("Это не изображение");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadErr("Файл больше 5 МБ");
      return;
    }

    // Immediate local preview
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setForm(p => ({ ...p, logoUrl: objectUrl }));

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/partner/branch/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось загрузить");
      }
      const { url } = await res.json() as { url: string };
      setForm(p => ({ ...p, logoUrl: url }));
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Не удалось загрузить");
      setForm(p => ({ ...p, logoUrl: "" }));
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto() {
    setForm(p => ({ ...p, logoUrl: "" }));
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
      setError("Введите название филиала");
      return;
    }
    setSaving(true);
    setError("");
    setInfo("");

    try {
      if (mode === "create") {
        // Backend для нескольких филиалов ещё не реализован —
        // показываем honest "in beta" сообщение, сохраняя данные в localStorage как draft
        await new Promise(r => setTimeout(r, 400));
        try {
          localStorage.setItem("branch_draft", JSON.stringify(form));
        } catch {}
        setInfo("Создание нескольких филиалов скоро будет доступно. Данные сохранены как черновик — мы вернёмся к ним, как только включим эту функцию.");
        setSaving(false);
        return;
      }

      // Edit mode → PATCH existing salon
      // Skip blob: URLs (in-progress upload); only send persisted URLs
      const logoUrl = form.logoUrl && !form.logoUrl.startsWith("blob:") ? form.logoUrl : null;

      const res = await fetch("/api/partner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city?.trim() || null,
          address: form.address?.trim() || null,
          phone: form.phone?.trim() || null,
          description: form.description?.trim() || null,
          logoUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сохранить");
      }

      setSuccess(true);
      setSaving(false);
      onSaved?.();
      setTimeout(() => { onClose(); }, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  // Styles
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

  const title = mode === "edit" ? "Редактировать филиал" : "Новый филиал";
  const subtitle = mode === "edit" ? "Внесите изменения" : "Добавьте точку салона";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(22, 22, 32, 0.50)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "92vw", maxWidth: 480, maxHeight: "90vh",
          zIndex: 110,
          display: "flex", flexDirection: "column",
          transform: open
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -46%) scale(0.96)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
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

        {/* Body — scrollable */}
        <div style={{
          flex: 1, overflowY: "auto", padding: 24,
          display: "flex", flexDirection: "column", gap: 18,
        }}>
          {/* Photo uploader */}
          <div>
            <label style={labelStyle}>Фото филиала</label>
            <div
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFilePicker(); } }}
              onDragOver={e => { e.preventDefault(); if (!uploading) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && !uploading) handleFile(file);
              }}
              style={{
                position: "relative",
                width: "100%", aspectRatio: "16/9",
                borderRadius: 16, overflow: "hidden",
                background: form.logoUrl
                  ? `url(${form.logoUrl}) center/cover`
                  : `linear-gradient(135deg, #F4F1FE 0%, #EAE6FB 60%, #DAD2F5 100%)`,
                border: form.logoUrl
                  ? `1px solid ${c.border}`
                  : `2px dashed ${dragOver ? c.primary : "#D9D2F5"}`,
                boxShadow: dragOver ? `0 0 0 4px ${c.primarySft}` : "none",
                cursor: uploading ? "wait" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.18s, transform 0.18s, box-shadow 0.18s",
              }}
              onMouseEnter={e => {
                if (!form.logoUrl && !dragOver) e.currentTarget.style.borderColor = c.primary;
              }}
              onMouseLeave={e => {
                if (!form.logoUrl && !dragOver) e.currentTarget.style.borderColor = "#D9D2F5";
              }}
            >
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />

              {/* Empty state */}
              {!form.logoUrl && !uploading && (
                <div style={{ textAlign: "center", color: c.txtBody, pointerEvents: "none" }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 18,
                    background: "#FFFFFF", margin: "0 auto 12px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: c.primary,
                    boxShadow: "0 8px 20px rgba(123, 97, 255, 0.20), 0 2px 4px rgba(123, 97, 255, 0.08)",
                  }}>
                    <Ic d={I.upload} size={22} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.005em" }}>
                    {dragOver ? "Отпустите файл" : "Добавить фото"}
                  </div>
                  <div style={{ fontSize: 11, color: c.txtMute, marginTop: 3 }}>
                    Перетащите сюда или нажмите • JPG, PNG, WEBP • до 5 МБ
                  </div>
                </div>
              )}

              {/* Photo set — show overlay with actions on hover */}
              {form.logoUrl && !uploading && (
                <div
                  style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(180deg, transparent 40%, rgba(22,22,32,0.55) 100%)",
                    display: "flex", alignItems: "flex-end", justifyContent: "space-between",
                    padding: 12, gap: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); openFilePicker(); }}
                    style={{
                      padding: "7px 12px", borderRadius: 10,
                      background: "rgba(255,255,255,0.95)",
                      border: "none", cursor: "pointer",
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
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleRemovePhoto(); }}
                    aria-label="Удалить фото"
                    style={{
                      width: 30, height: 30, borderRadius: 10,
                      background: "rgba(255,255,255,0.95)",
                      border: "none", cursor: "pointer",
                      color: c.red, display: "flex", alignItems: "center", justifyContent: "center",
                      backdropFilter: "blur(8px)",
                      boxShadow: "0 4px 12px rgba(22,22,32,0.18)",
                    }}
                  >
                    <Ic d={I.trash} size={14} />
                  </button>
                </div>
              )}

              {/* Uploading spinner overlay */}
              {uploading && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(22,22,32,0.45)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 10,
                  color: "#fff",
                  backdropFilter: "blur(2px)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    border: "3px solid rgba(255,255,255,0.25)",
                    borderTopColor: "#fff",
                    animation: "bbSpin 0.8s linear infinite",
                  }} />
                  <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-montserrat)" }}>
                    Загружаем...
                  </div>
                </div>
              )}
            </div>

            {/* Upload error */}
            {uploadErr && (
              <div style={{
                marginTop: 8, fontSize: 12, fontWeight: 600, color: c.red,
                fontFamily: "var(--font-montserrat)",
              }}>
                {uploadErr}
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Название филиала *</label>
            <input
              type="text"
              placeholder="Beauty Club на Пушкина"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
              style={inputStyle("name")}
              maxLength={120}
            />
          </div>

          {/* City + Address row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Город</label>
              <input
                type="text"
                placeholder="Москва"
                value={form.city || ""}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                onFocus={() => setFocused("city")}
                onBlur={() => setFocused(null)}
                style={inputStyle("city")}
                maxLength={50}
              />
            </div>
            <div>
              <label style={labelStyle}>Адрес</label>
              <input
                type="text"
                placeholder="ул. Пушкина, 25"
                value={form.address || ""}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                onFocus={() => setFocused("address")}
                onBlur={() => setFocused(null)}
                style={inputStyle("address")}
                maxLength={200}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>Телефон</label>
            <input
              type="tel"
              placeholder="+7 (___) ___-__-__"
              value={form.phone || ""}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
              style={inputStyle("phone")}
              maxLength={30}
            />
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Описание</label>
            <textarea
              placeholder="Премиальный салон в центре города. Команда из 8 мастеров..."
              value={form.description || ""}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              onFocus={() => setFocused("description")}
              onBlur={() => setFocused(null)}
              rows={3}
              style={{ ...inputStyle("description"), resize: "vertical", minHeight: 84, fontFamily: "var(--font-montserrat)" }}
              maxLength={500}
            />
            <div style={{
              textAlign: "right", fontSize: 10, color: c.txtMute, marginTop: 4,
              letterSpacing: "0.02em",
            }}>
              {(form.description || "").length} / 500
            </div>
          </div>

          {/* Inline error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "12px 14px", borderRadius: 12,
              background: c.redSft,
              border: `1px solid rgba(239,68,68,0.22)`,
              color: c.red, fontSize: 13, fontWeight: 600,
              lineHeight: 1.45,
            }}>
              <Ic d={I.info} size={16} />
              <div style={{ flex: 1 }}>{error}</div>
            </div>
          )}

          {/* Inline info (e.g. coming soon) */}
          {info && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "12px 14px", borderRadius: 12,
              background: c.primarySft,
              border: `1px solid rgba(123,97,255,0.22)`,
              color: c.primaryDk, fontSize: 13, fontWeight: 500,
              lineHeight: 1.5,
            }}>
              <Ic d={I.info} size={16} />
              <div style={{ flex: 1 }}>{info}</div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "12px 14px", borderRadius: 12,
              background: c.greenSft, color: c.green,
              border: `1px solid rgba(31,180,106,0.22)`,
              fontSize: 13, fontWeight: 600,
            }}>
              <Ic d={I.check} size={16} />
              <span>Сохранено</span>
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
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1, padding: "13px",
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, color: c.txtBody,
              fontSize: 14, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              transition: "background 0.15s, border-color 0.15s",
            }}
            onMouseEnter={e => !saving && (e.currentTarget.style.background = c.borderSoft)}
            onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            style={{
              flex: 2, padding: "13px",
              background: (saving || uploading) ? c.txtMute : c.primary,
              border: "none", borderRadius: 12,
              color: "#fff", fontSize: 14, fontWeight: 700,
              cursor: (saving || uploading) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              letterSpacing: "0.02em",
              transition: "background 0.15s, box-shadow 0.15s, transform 0.15s",
              boxShadow: (saving || uploading) ? "none" : "0 8px 22px rgba(123, 97, 255, 0.32)",
            }}
            onMouseEnter={e => {
              if (!saving && !uploading) {
                e.currentTarget.style.background = c.primaryDk;
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 12px 28px rgba(123, 97, 255, 0.40)";
              }
            }}
            onMouseLeave={e => {
              if (!saving && !uploading) {
                e.currentTarget.style.background = c.primary;
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 22px rgba(123, 97, 255, 0.32)";
              }
            }}
          >
            {saving ? "Сохраняем..." : uploading ? "Подождите..." : mode === "edit" ? "Сохранить" : "Создать филиал"}
          </button>
        </footer>

        <style>{`
          @keyframes bbSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  );
}
