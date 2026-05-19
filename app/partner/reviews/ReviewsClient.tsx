"use client";
import { useMemo, useState } from "react";

export interface Review {
  id: number;
  salonId: number;
  appointmentId: number | null;
  masterId: number | null;
  serviceId: number | null;
  clientName: string;
  clientPhone: string | null;
  clientTelegramId: string | null;
  rating: number;
  text: string | null;
  status: string;
  partnerReply: string | null;
  createdAt: string | null;
  publishedAt: string | null;
  repliedAt: string | null;
}
export interface ServiceLite { id: number; name: string; price: string | null; duration: number | null; }
export interface MasterLite  { id: number; fullName: string; specialization: string; photoUrl: string | null; }

const c = {
  bg:         "#FFFFFF",
  bgSoft:     "#F7F7FA",
  border:     "#ECECF0",
  borderSoft: "#F2F2F6",
  primary:    "#7B61FF",
  primaryDk:  "#5B3FE5",
  primarySft: "#F0EDFE",
  green:      "#1FB46A",
  greenSft:   "#E3F8EE",
  orange:     "#FF9500",
  orangeSft:  "#FFF1DE",
  red:        "#EF4444",
  redSft:     "#FCE5E5",
  amber:      "#F59E0B",
  amberSft:   "#FEF3C7",
  txtDark:    "#161620",
  txtBody:    "#5F6577",
  txtMute:    "#9AA0B0",
};

const PATHS = {
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  search:  "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  x:       "M18 6L6 18M6 6l12 12",
  reply:   "M3 10h11a5 5 0 010 10h-2M3 10l4-4M3 10l4 4",
  check:   "M20 6L9 17l-5-5",
  pencil:  "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  trash:   "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2",
};

function Ic({ d, size = 18, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function StarRow({ rating, max = 5, size = 14, color = c.amber, mute = c.borderSoft }: {
  rating: number; max?: number; size?: number; color?: string; mute?: string;
}) {
  const filled = Math.max(0, Math.min(max, Math.round(rating)));
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }} aria-label={`${rating} из ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24"
          fill={i < filled ? color : "none"}
          stroke={i < filled ? color : mute}
          strokeWidth={1.6} strokeLinejoin="round">
          <path d={PATHS.star} />
        </svg>
      ))}
    </span>
  );
}

const MONTHS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function initialsOf(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}
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
  for (const ch of name || "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

// ───────── Overview ─────────
function OverviewCard({ reviews }: { reviews: Review[] }) {
  const total = reviews.length;
  const withText = reviews.filter(r => (r.text || "").trim().length > 0).length;
  const awaitingReply = reviews.filter(r => !r.partnerReply && (r.text || "").trim().length > 0).length;
  const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
  const avg = total > 0 ? sum / total : 0;

  const dist: number[] = [0, 0, 0, 0, 0];
  for (const r of reviews) {
    const i = Math.max(1, Math.min(5, r.rating)) - 1;
    dist[i] += 1;
  }
  const maxBar = Math.max(...dist, 1);

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
      padding: "18px 18px 14px",
      display: "grid",
      gridTemplateColumns: "150px 1fr",
      gap: 18, alignItems: "center",
      fontFamily: "var(--font-montserrat)",
    }} className="bb-overview">
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 44, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.04em",
          lineHeight: 1, fontFeatureSettings: '"tnum" 1',
        }}>{total > 0 ? avg.toFixed(1) : "—"}</div>
        <div style={{ marginTop: 8 }}>
          <StarRow rating={avg} size={16} />
        </div>
        <div style={{
          fontSize: 11, color: c.txtMute, marginTop: 6, fontWeight: 600,
          letterSpacing: "0.02em",
        }}>
          {total === 0 ? "пока без оценок" : `${total} ${total === 1 ? "отзыв" : total < 5 ? "отзыва" : "отзывов"}`}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {[5, 4, 3, 2, 1].map(star => {
          const count = dist[star - 1];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barW = (count / maxBar) * 100;
          return (
            <div key={star} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 11, color: c.txtMute, fontWeight: 700, minWidth: 14,
                fontFeatureSettings: '"tnum" 1',
              }}>{star}</span>
              <svg width={11} height={11} viewBox="0 0 24 24" fill={c.amber} stroke="none">
                <path d={PATHS.star} />
              </svg>
              <div style={{
                flex: 1, height: 8, background: c.borderSoft, borderRadius: 4, overflow: "hidden",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute", inset: 0, width: `${barW}%`,
                  background: `linear-gradient(90deg, ${c.amber}, #FBBF24)`,
                  borderRadius: 4,
                  transition: "width 0.4s cubic-bezier(0.32, 0.72, 0, 1)",
                }} />
              </div>
              <span style={{
                fontSize: 11, color: c.txtBody, fontWeight: 700, minWidth: 32,
                textAlign: "right", fontFeatureSettings: '"tnum" 1',
              }}>{count}</span>
              <span style={{
                fontSize: 10, color: c.txtMute, minWidth: 28,
                textAlign: "right", fontFeatureSettings: '"tnum" 1',
              }}>{pct}%</span>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div style={{
          gridColumn: "1 / -1", marginTop: 8, paddingTop: 12,
          borderTop: `1px solid ${c.borderSoft}`,
          display: "flex", gap: 18, flexWrap: "wrap",
          fontSize: 12, color: c.txtBody,
        }}>
          <span><b style={{ color: c.txtDark, fontFeatureSettings: '"tnum" 1' }}>{withText}</b> <span style={{ color: c.txtMute }}>с текстом</span></span>
          {awaitingReply > 0 && (
            <span><b style={{ color: c.orange, fontFeatureSettings: '"tnum" 1' }}>{awaitingReply}</b> <span style={{ color: c.txtMute }}>ждут ответа</span></span>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 520px) {
          .bb-overview { grid-template-columns: 1fr !important; gap: 14px !important; padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}

// ───────── Star filter ─────────
const STAR_FILTERS = [
  { key: "all", label: "Все" },
  { key: "5",   label: "5" },
  { key: "4",   label: "4" },
  { key: "3",   label: "3" },
  { key: "2",   label: "2" },
  { key: "1",   label: "1" },
] as const;
type StarFilterKey = typeof STAR_FILTERS[number]["key"];

function StarFilter({ value, onChange, counts }: {
  value: StarFilterKey;
  onChange: (k: StarFilterKey) => void;
  counts: Record<string, number>;
}) {
  return (
    <div style={{
      display: "flex", gap: 6, overflowX: "auto",
      scrollbarWidth: "none", msOverflowStyle: "none",
      padding: "2px 0",
      WebkitOverflowScrolling: "touch",
    } as React.CSSProperties} className="bb-no-scrollbar">
      {STAR_FILTERS.map(f => {
        const sel = value === f.key;
        const cnt = f.key === "all" ? counts.all : (counts[f.key] || 0);
        return (
          <button key={f.key} type="button" onClick={() => onChange(f.key)}
            style={{
              flexShrink: 0,
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 11,
              background: sel ? c.amber : c.bg,
              color: sel ? "#fff" : c.txtDark,
              border: `1px solid ${sel ? c.amber : c.border}`,
              cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
              fontSize: 13, fontWeight: 700,
              transition: "background 0.16s, border-color 0.16s, color 0.16s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = c.bgSoft; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.background = c.bg; }}
          >
            {f.key !== "all" && (
              <svg width={12} height={12} viewBox="0 0 24 24"
                fill={sel ? "#fff" : c.amber} stroke="none">
                <path d={PATHS.star} />
              </svg>
            )}
            {f.label}
            <span style={{
              minWidth: 22, padding: "0 6px", height: 20, borderRadius: 10,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
              background: sel ? "rgba(255,255,255,0.28)" : c.borderSoft,
              color: sel ? "#fff" : c.txtBody,
              fontFeatureSettings: '"tnum" 1',
            }}>{cnt}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────── Review card ─────────
function ReviewCard({ r, serviceName, masterName, onReplyChange }: {
  r: Review;
  serviceName: string | null;
  masterName: string | null;
  onReplyChange: (id: number, reply: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(r.partnerReply || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setSaving(true); setErr("");
    try {
      await onReplyChange(r.id, draft.trim());
      setEditing(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      padding: "16px 16px 14px",
      fontFamily: "var(--font-montserrat)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: gradientFor(r.clientName),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 13, fontWeight: 800, letterSpacing: "-0.02em",
          flexShrink: 0,
        }}>{initialsOf(r.clientName)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{r.clientName}</div>
          <div style={{
            fontSize: 11, color: c.txtMute, marginTop: 1,
            display: "flex", alignItems: "center", gap: 6,
            fontFeatureSettings: '"tnum" 1',
          }}>
            <StarRow rating={r.rating} size={11} />
            <span>·</span>
            <span>{formatTimestamp(r.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Service + master chip */}
      {(serviceName || masterName) && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 9px", borderRadius: 9,
          background: c.bgSoft, border: `1px solid ${c.borderSoft}`,
          fontSize: 11, color: c.txtBody, fontWeight: 600,
          marginBottom: 10,
        }}>
          {serviceName && <span>{serviceName}</span>}
          {serviceName && masterName && <span style={{ color: c.txtMute }}>·</span>}
          {masterName && <span style={{ color: c.txtMute }}>мастер {masterName}</span>}
        </div>
      )}

      {/* Text */}
      {r.text && (
        <div style={{
          fontSize: 14, color: c.txtDark, lineHeight: 1.55,
          letterSpacing: "-0.005em",
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>{r.text}</div>
      )}

      {/* Reply block */}
      {r.partnerReply && !editing && (
        <div style={{
          marginTop: 12, padding: "10px 12px 11px",
          background: c.primarySft, border: `1px solid ${c.primarySft}`,
          borderLeft: `3px solid ${c.primary}`, borderRadius: 10,
          fontSize: 13, color: c.txtDark, lineHeight: 1.5,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 4,
          }}>
            <span style={{
              fontSize: 10, color: c.primary, fontWeight: 800,
              letterSpacing: "0.12em", textTransform: "uppercase",
            }}>Ответ салона</span>
            <button type="button"
              onClick={() => { setDraft(r.partnerReply || ""); setEditing(true); setErr(""); }}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: c.primary, fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: 0,
                fontFamily: "var(--font-montserrat)",
              }}>
              <Ic d={PATHS.pencil} size={11} sw={2} />
              изменить
            </button>
          </div>
          {r.partnerReply}
        </div>
      )}

      {/* Reply editor */}
      {editing && (
        <div style={{
          marginTop: 12,
          background: c.primarySft,
          padding: 12, borderRadius: 12,
          borderLeft: `3px solid ${c.primary}`,
        }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Ваш ответ клиенту..."
            rows={3}
            style={{
              width: "100%", minHeight: 64, resize: "vertical",
              padding: "9px 11px", borderRadius: 9,
              border: `1px solid ${c.border}`, background: c.bg,
              color: c.txtDark, fontSize: 13, lineHeight: 1.5,
              fontFamily: "var(--font-montserrat)",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${c.primarySft}`; }}
            onBlur={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
          />
          {err && (
            <div style={{
              padding: "8px 10px", borderRadius: 9, marginTop: 8,
              background: c.redSft, color: c.red, fontSize: 12, fontWeight: 600,
            }}>{err}</div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => { setEditing(false); setErr(""); }}
              disabled={saving}
              style={{
                padding: "8px 14px", borderRadius: 9,
                background: c.bg, border: `1px solid ${c.border}`,
                color: c.txtBody, fontSize: 12, fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-montserrat)",
              }}
            >Отмена</button>
            <button type="button" onClick={save}
              disabled={saving}
              style={{
                padding: "8px 14px", borderRadius: 9,
                background: c.primary, border: "none",
                color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "var(--font-montserrat)",
                boxShadow: "0 4px 12px -2px rgba(123,97,255,0.35)",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <Ic d={PATHS.check} size={12} sw={2.5} />
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </div>
      )}

      {/* Reply CTA when no reply yet */}
      {!r.partnerReply && !editing && (
        <button type="button"
          onClick={() => { setDraft(""); setEditing(true); setErr(""); }}
          style={{
            marginTop: 10,
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "transparent", border: "none", padding: 0,
            cursor: "pointer",
            color: c.primary, fontSize: 12, fontWeight: 700,
            fontFamily: "var(--font-montserrat)",
          }}>
          <Ic d={PATHS.reply} size={13} sw={2} />
          Ответить клиенту
        </button>
      )}
    </div>
  );
}

// ───────── Empty state ─────────
function EmptyState({ filtered }: { filtered: boolean }) {
  if (filtered) {
    return (
      <div style={{
        background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
        padding: "40px 24px 36px", textAlign: "center",
        fontFamily: "var(--font-montserrat)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: c.txtDark, marginBottom: 6 }}>
          Под фильтр ничего не подошло
        </div>
        <div style={{ fontSize: 13, color: c.txtMute, maxWidth: 320, margin: "0 auto", lineHeight: 1.5 }}>
          Снимите фильтр звёзд или очистите поиск.
        </div>
      </div>
    );
  }
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
      padding: "28px 24px 24px",
      fontFamily: "var(--font-montserrat)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: c.amberSft, color: c.amber,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill={c.amber} stroke="none">
            <path d={PATHS.star} />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.01em" }}>
            Отзывов пока нет
          </div>
          <div style={{ fontSize: 12, color: c.txtMute, marginTop: 2 }}>
            Они появятся здесь как только клиенты начнут оставлять оценки
          </div>
        </div>
      </div>

      <div style={{
        background: c.bgSoft, borderRadius: 12, padding: "12px 14px",
        fontSize: 12, color: c.txtBody, lineHeight: 1.55,
      }}>
        Скоро на странице салона у каждой завершённой записи появится
        форма оценки звёздами и поле для текста. После публикации отзыв
        автоматически придёт сюда — вы сможете прочитать его и ответить
        клиенту.
      </div>

      {/* Mock preview */}
      <div style={{ marginTop: 18 }}>
        <div style={{
          fontSize: 10, color: c.txtMute, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: 8, paddingLeft: 2,
        }}>превью карточки</div>
        <div style={{
          opacity: 0.92,
          border: `1px solid ${c.border}`, borderRadius: 14, overflow: "hidden",
        }}>
          <div style={{
            padding: "16px 16px 14px",
            background: "linear-gradient(180deg, #FFFFFF 0%, #FCFCFE 100%)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: gradientFor("Анна Петрова"),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 13, fontWeight: 800,
              }}>АП</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: c.txtDark }}>Анна Петрова</div>
                <div style={{
                  fontSize: 11, color: c.txtMute, marginTop: 1,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <StarRow rating={5} size={11} />
                  <span>·</span>
                  <span>сегодня</span>
                </div>
              </div>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 9px", borderRadius: 9,
              background: c.bgSoft, border: `1px solid ${c.borderSoft}`,
              fontSize: 11, color: c.txtBody, fontWeight: 600,
              marginBottom: 10,
            }}>
              Окрашивание · мастер Лена
            </div>
            <div style={{ fontSize: 13, color: c.txtDark, lineHeight: 1.55 }}>
              Всё было идеально — цвет именно тот, что я хотела. Лена очень
              внимательная, всё подробно объяснила. Обязательно вернусь!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Main ─────────
export default function ReviewsClient({ initialReviews, services, masters }: {
  initialReviews: Review[];
  services: ServiceLite[];
  masters: MasterLite[];
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [starFilter, setStarFilter] = useState<StarFilterKey>("all");
  const [search, setSearch] = useState("");
  const [withReplyOnly, setWithReplyOnly] = useState<"any" | "unanswered" | "answered">("any");

  const serviceMap = useMemo(() => {
    const m = new Map<number, ServiceLite>();
    services.forEach(s => m.set(s.id, s));
    return m;
  }, [services]);
  const masterMap = useMemo(() => {
    const m = new Map<number, MasterLite>();
    masters.forEach(s => m.set(s.id, s));
    return m;
  }, [masters]);

  const counts: Record<string, number> = useMemo(() => {
    const cnt: Record<string, number> = { all: reviews.length, "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const r of reviews) {
      const k = String(Math.max(1, Math.min(5, r.rating)));
      cnt[k] = (cnt[k] || 0) + 1;
    }
    return cnt;
  }, [reviews]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reviews
      .filter(r => starFilter === "all" || r.rating === Number(starFilter))
      .filter(r => {
        if (withReplyOnly === "answered")   return !!r.partnerReply;
        if (withReplyOnly === "unanswered") return !r.partnerReply && (r.text || "").trim().length > 0;
        return true;
      })
      .filter(r => {
        if (!q) return true;
        const inText = (r.text || "").toLowerCase().includes(q);
        const inName = r.clientName.toLowerCase().includes(q);
        const inSvc  = (r.serviceId && serviceMap.get(r.serviceId)?.name?.toLowerCase().includes(q)) || false;
        const inMst  = (r.masterId  && masterMap.get(r.masterId)?.fullName?.toLowerCase().includes(q)) || false;
        return inText || inName || inSvc || inMst;
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [reviews, starFilter, search, withReplyOnly, serviceMap, masterMap]);

  async function saveReply(id: number, partnerReply: string) {
    const res = await fetch("/api/partner/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, partnerReply }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Не удалось сохранить");
    }
    const updated = await res.json();
    setReviews(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`.bb-no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

      <div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
          letterSpacing: "-0.025em", fontFamily: "var(--font-montserrat)",
        }}>Отзывы</h1>
        <div style={{
          fontSize: 13, color: c.txtMute, marginTop: 4,
          fontFamily: "var(--font-montserrat)", fontFeatureSettings: '"tnum" 1',
        }}>
          {reviews.length === 0
            ? "Появятся когда клиенты начнут оставлять оценки на сайте"
            : `${reviews.length} ${reviews.length === 1 ? "отзыв" : reviews.length < 5 ? "отзыва" : "отзывов"} · средняя ${(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)}`}
        </div>
      </div>

      {reviews.length > 0 && <OverviewCard reviews={reviews} />}

      {reviews.length > 0 && (
        <>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: c.txtMute, pointerEvents: "none",
            }}>
              <Ic d={PATHS.search} size={17} />
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="По тексту, имени, услуге или мастеру"
              aria-label="Поиск по отзывам"
              style={{
                width: "100%", height: 44,
                padding: "0 40px 0 40px",
                background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12,
                fontFamily: "var(--font-montserrat)",
                fontSize: 14, color: c.txtDark, outline: "none",
                transition: "border-color 0.18s, box-shadow 0.18s",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = c.primary; e.currentTarget.style.boxShadow = `0 0 0 4px ${c.primarySft}`; }}
              onBlur={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
            />
            {search && (
              <button type="button" onClick={() => setSearch("")} aria-label="Очистить поиск"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  width: 28, height: 28, borderRadius: 8,
                  background: c.borderSoft, border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: c.txtBody,
                }}>
                <Ic d={PATHS.x} size={13} />
              </button>
            )}
          </div>

          {/* Star filter */}
          <StarFilter value={starFilter} onChange={setStarFilter} counts={counts} />

          {/* Reply-state filter */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
            padding: "0 2px",
          }}>
            <span style={{
              fontSize: 11, color: c.txtMute, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              fontFamily: "var(--font-montserrat)",
            }}>ответ салона</span>
            {([
              { key: "any" as const,        label: "Все"          },
              { key: "unanswered" as const, label: "Без ответа"   },
              { key: "answered" as const,   label: "С ответом"    },
            ]).map(o => {
              const sel = withReplyOnly === o.key;
              return (
                <button key={o.key} type="button" onClick={() => setWithReplyOnly(o.key)}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    background: sel ? c.txtDark : "transparent",
                    color: sel ? "#fff" : c.txtBody,
                    border: `1px solid ${sel ? c.txtDark : c.border}`,
                    cursor: "pointer",
                    fontFamily: "var(--font-montserrat)",
                    fontSize: 12, fontWeight: 600,
                    whiteSpace: "nowrap",
                    transition: "background 0.16s, border-color 0.16s, color 0.16s",
                  }}
                >{o.label}</button>
              );
            })}
          </div>
        </>
      )}

      {/* List */}
      {reviews.length === 0 ? (
        <EmptyState filtered={false} />
      ) : visible.length === 0 ? (
        <EmptyState filtered={true} />
      ) : (
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
          overflow: "hidden",
        }}>
          {visible.map((r, i) => (
            <div key={r.id} style={{
              borderBottom: i < visible.length - 1 ? `1px solid ${c.borderSoft}` : "none",
            }}>
              <ReviewCard r={r}
                serviceName={r.serviceId ? (serviceMap.get(r.serviceId)?.name || null) : null}
                masterName={r.masterId  ? (masterMap.get(r.masterId)?.fullName  || null) : null}
                onReplyChange={saveReply}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
