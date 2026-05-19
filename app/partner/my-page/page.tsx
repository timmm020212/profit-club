"use client";
import { useEffect, useState, useRef } from "react";

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

function Ic({ d, size = 18, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const I = {
  copy:   "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  check:  "M20 6L9 17l-5-5",
  ext:    "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  share:  "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  qr:     "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h.01M21 14h-2M14 17v-3M19 21h-2M21 21h-2M21 17v-1M14 19v2",
  edit:   "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  info:   "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  globe:  "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  x:      "M18 6L6 18M6 6l12 12",
};

interface Salon {
  id: number;
  slug: string;
  name: string;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export default function MyPagePage() {
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  // Slug edit state
  const [editOpen, setEditOpen] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [validationMsg, setValidationMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/partner/profile").then(r => r.json()).then(d => {
      if (d && !d.error) setSalon(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const url = salon ? `${origin}/${salon.slug}` : "";
  const qrUrl = url ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&color=161620&bgcolor=FFFFFF&format=svg&data=${encodeURIComponent(url)}` : "";
  const shareText = salon ? `Записаться в ${salon.name}` : "Записаться";

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  // Live availability check (debounced)
  useEffect(() => {
    if (!editOpen) return;
    if (!newSlug || newSlug === salon?.slug) {
      setAvailable(null);
      setValidationMsg("");
      return;
    }
    if (!SLUG_RE.test(newSlug)) {
      setAvailable(false);
      setValidationMsg("Только латинские буквы, цифры и дефис (3-40 символов)");
      return;
    }
    setChecking(true);
    setValidationMsg("");
    if (checkTimer.current) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/partner/branch/slug?slug=${encodeURIComponent(newSlug)}`);
        const data = await res.json();
        setAvailable(data.available);
        if (!data.available) {
          if (data.reason === "reserved") setValidationMsg("Этот адрес зарезервирован системой");
          else if (data.reason === "invalid") setValidationMsg("Некорректный формат");
          else setValidationMsg("Этот адрес уже занят");
        }
      } catch {
        setAvailable(false);
        setValidationMsg("Ошибка проверки");
      } finally {
        setChecking(false);
      }
    }, 350);
    return () => { if (checkTimer.current) clearTimeout(checkTimer.current); };
  }, [newSlug, editOpen, salon?.slug]);

  function openEditor() {
    setNewSlug(salon?.slug || "");
    setEditOpen(true);
    setSaveError("");
    setAvailable(null);
    setValidationMsg("");
  }

  async function saveSlug() {
    if (!newSlug || newSlug === salon?.slug) { setEditOpen(false); return; }
    if (available !== true) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/partner/branch/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: newSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось обновить");
      setSalon(p => p ? { ...p, slug: data.slug } : p);
      setEditOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: c.txtMute, fontFamily: "var(--font-montserrat)", fontSize: 13 }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "var(--font-montserrat)", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div>
        <div style={{ fontSize: 10, color: c.primary, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
          Публичная ссылка
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0, letterSpacing: "-0.02em" }}>
          Моя страница
        </h1>
        <p style={{ fontSize: 13, color: c.txtMute, marginTop: 6 }}>
          Поделитесь ссылкой с клиентами — они смогут записаться онлайн
        </p>
      </div>

      {/* HERO URL CARD */}
      <div style={{
        position: "relative",
        background: `linear-gradient(135deg, #FFFFFF 0%, #FBFAFE 100%)`,
        border: `1px solid ${c.border}`,
        borderRadius: 20,
        padding: 24,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(22,22,32,0.04)",
      }}>
        {/* Decorative gradient blob */}
        <div style={{
          position: "absolute", top: -60, right: -60,
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(123,97,255,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 12px", borderRadius: 20,
            background: c.primarySft, color: c.primary,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
            marginBottom: 14,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: c.green, boxShadow: `0 0 0 3px ${c.greenSft}` }} />
            АКТИВНА
          </div>

          {/* URL display */}
          <div style={{
            fontSize: 11, color: c.txtMute, fontWeight: 600,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
          }}>
            Ваша ссылка
          </div>
          <div style={{
            display: "flex", alignItems: "baseline", flexWrap: "wrap",
            gap: 2, marginBottom: 18, lineHeight: 1.25,
          }}>
            <span style={{ fontSize: 18, color: c.txtMute, fontWeight: 500, letterSpacing: "-0.005em" }}>
              {origin.replace(/^https?:\/\//, "")}/
            </span>
            <span style={{
              fontSize: 22, color: c.txtDark, fontWeight: 800,
              letterSpacing: "-0.02em",
              padding: "0 4px",
              background: `linear-gradient(180deg, transparent 55%, ${c.primarySft} 55%)`,
            }}>
              {salon?.slug || "..."}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleCopy}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "11px 18px", borderRadius: 12,
                background: copied ? c.green : c.primary,
                color: "#fff", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "var(--font-montserrat)",
                letterSpacing: "0.02em",
                boxShadow: copied
                  ? `0 6px 18px rgba(31, 180, 106, 0.35)`
                  : `0 6px 18px rgba(123, 97, 255, 0.32)`,
                transition: "background 0.2s, box-shadow 0.2s, transform 0.15s",
              }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <Ic d={copied ? I.check : I.copy} size={15} />
              {copied ? "Скопировано" : "Скопировать"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "11px 18px", borderRadius: 12,
                background: c.bg, color: c.txtDark,
                border: `1px solid ${c.border}`,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                fontFamily: "var(--font-montserrat)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
              onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
            >
              <Ic d={I.ext} size={14} />
              Открыть
            </a>
          </div>
        </div>
      </div>

      {/* QR + SHARE */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 14 }}>
        {/* QR card */}
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20,
          padding: 18, display: "flex", flexDirection: "column",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: c.primarySft,
              color: c.primary, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ic d={I.qr} size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.005em" }}>QR-код</div>
              <div style={{ fontSize: 10, color: c.txtMute, marginTop: 1 }}>для печати и наклеек</div>
            </div>
          </div>
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            background: c.bgSoft, borderRadius: 14, padding: 14, minHeight: 160,
          }}>
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="QR-код" style={{ width: "100%", maxWidth: 160, height: "auto", display: "block" }} />
            ) : (
              <div style={{ color: c.txtMute, fontSize: 12 }}>Загрузка...</div>
            )}
          </div>
          {qrUrl && (
            <a
              href={qrUrl.replace("format=svg", "format=png")}
              download={`qr-${salon?.slug || "page"}.png`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                marginTop: 12, padding: "9px 12px", borderRadius: 10,
                background: c.bgSoft, color: c.txtBody, textDecoration: "none",
                fontSize: 12, fontWeight: 600, border: `1px solid ${c.border}`,
                fontFamily: "var(--font-montserrat)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = c.border)}
              onMouseLeave={e => (e.currentTarget.style.background = c.bgSoft)}
            >
              <Ic d={I.share} size={13} />
              Скачать PNG
            </a>
          )}
        </div>

        {/* Share card */}
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20,
          padding: 18, display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10, background: c.primarySft,
              color: c.primary, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ic d={I.share} size={16} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.005em" }}>Поделиться</div>
              <div style={{ fontSize: 10, color: c.txtMute, marginTop: 1 }}>отправьте клиентам</div>
            </div>
          </div>

          {[
            {
              key: "tg", label: "Telegram", color: "#0088CC", bg: "#E3F2FB",
              href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`,
            },
            {
              key: "wa", label: "WhatsApp", color: "#25D366", bg: "#E5F8EC",
              href: `https://wa.me/?text=${encodeURIComponent(shareText + " — " + url)}`,
            },
            {
              key: "vk", label: "ВКонтакте", color: "#0077FF", bg: "#E3EEFE",
              href: `https://vk.com/share.php?url=${encodeURIComponent(url)}`,
            },
          ].map(s => (
            <a
              key={s.key} href={s.href} target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12,
                background: c.bgSoft, color: c.txtDark,
                textDecoration: "none", fontSize: 13, fontWeight: 600,
                border: `1px solid ${c.borderSoft}`,
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = c.bg; e.currentTarget.style.borderColor = s.color + "33"; }}
              onMouseLeave={e => { e.currentTarget.style.background = c.bgSoft; e.currentTarget.style.borderColor = c.borderSoft; }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: s.bg, color: s.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, fontFamily: "var(--font-montserrat)",
              }}>{s.label.charAt(0)}</div>
              <span style={{ flex: 1 }}>{s.label}</span>
              <Ic d={I.ext} size={13} />
            </a>
          ))}
        </div>
      </div>

      {/* SLUG EDITOR */}
      <div style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20,
        padding: 18,
      }}>
        {!editOpen ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: c.bgSoft,
              color: c.txtBody, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Ic d={I.edit} size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.005em" }}>
                Изменить адрес страницы
              </div>
              <div style={{ fontSize: 11, color: c.txtMute, marginTop: 2 }}>
                Текущий: <span style={{ color: c.primary, fontWeight: 600 }}>{salon?.slug}</span>
              </div>
            </div>
            <button
              onClick={openEditor}
              style={{
                padding: "8px 14px", borderRadius: 10,
                background: c.bgSoft, color: c.txtDark,
                border: `1px solid ${c.border}`,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "var(--font-montserrat)",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = c.border)}
              onMouseLeave={e => (e.currentTarget.style.background = c.bgSoft)}
            >
              Изменить
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.005em" }}>
                Новый адрес страницы
              </div>
              <button
                onClick={() => setEditOpen(false)}
                aria-label="Отмена"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: c.bgSoft, color: c.txtBody, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Ic d={I.x} size={14} />
              </button>
            </div>

            <div style={{
              display: "flex", alignItems: "stretch",
              border: `1.5px solid ${available === false ? c.red : available === true ? c.green : c.border}`,
              borderRadius: 12, overflow: "hidden",
              transition: "border-color 0.2s",
            }}>
              <span style={{
                display: "flex", alignItems: "center",
                padding: "0 12px",
                background: c.bgSoft, color: c.txtMute,
                fontSize: 13, fontFamily: "var(--font-montserrat)",
                borderRight: `1px solid ${c.border}`,
              }}>
                {origin.replace(/^https?:\/\//, "")}/
              </span>
              <input
                type="text"
                value={newSlug}
                onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="my-salon"
                autoFocus
                maxLength={40}
                style={{
                  flex: 1, minWidth: 0,
                  padding: "11px 14px",
                  background: c.bg, color: c.txtDark,
                  border: "none", outline: "none",
                  fontSize: 14, fontWeight: 600,
                  fontFamily: "var(--font-montserrat)",
                }}
              />
              <div style={{
                display: "flex", alignItems: "center", padding: "0 12px",
                color: available === true ? c.green : available === false ? c.red : c.txtMute,
              }}>
                {checking ? (
                  <div style={{
                    width: 14, height: 14, borderRadius: 7,
                    border: `2px solid ${c.border}`, borderTopColor: c.primary,
                    animation: "spnR 0.7s linear infinite",
                  }} />
                ) : available === true ? (
                  <Ic d={I.check} size={16} />
                ) : available === false ? (
                  <Ic d={I.x} size={14} />
                ) : null}
              </div>
            </div>

            <div style={{
              marginTop: 8, fontSize: 11,
              color: validationMsg ? c.red : c.txtMute,
              lineHeight: 1.4,
            }}>
              {validationMsg || "Только латинские буквы, цифры и дефис. От 3 до 40 символов."}
            </div>

            {saveError && (
              <div style={{
                marginTop: 10, padding: "10px 12px", borderRadius: 10,
                background: c.redSft, color: c.red,
                fontSize: 12, fontWeight: 600,
              }}>{saveError}</div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                onClick={() => setEditOpen(false)}
                disabled={saving}
                style={{
                  flex: 1, padding: "11px",
                  background: c.bg, color: c.txtBody,
                  border: `1px solid ${c.border}`, borderRadius: 11,
                  fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-montserrat)",
                }}
              >Отмена</button>
              <button
                onClick={saveSlug}
                disabled={saving || available !== true}
                style={{
                  flex: 2, padding: "11px",
                  background: (saving || available !== true) ? c.txtMute : c.primary,
                  color: "#fff", border: "none", borderRadius: 11,
                  fontSize: 13, fontWeight: 700,
                  cursor: (saving || available !== true) ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-montserrat)",
                  letterSpacing: "0.02em",
                  boxShadow: (saving || available !== true) ? "none" : "0 6px 18px rgba(123, 97, 255, 0.32)",
                  transition: "background 0.15s, box-shadow 0.15s",
                }}
              >
                {saving ? "Сохраняем..." : "Сохранить адрес"}
              </button>
            </div>

            <div style={{
              marginTop: 12, padding: "10px 12px", borderRadius: 10,
              background: c.primarySft, color: c.primaryDk,
              fontSize: 11, fontWeight: 500, lineHeight: 1.5,
              display: "flex", gap: 8,
            }}>
              <Ic d={I.info} size={14} />
              <div>Старая ссылка перестанет работать. Не меняйте адрес если вы уже поделились им с клиентами.</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spnR {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
