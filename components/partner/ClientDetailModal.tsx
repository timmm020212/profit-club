"use client";
import { useEffect, useMemo, useState } from "react";

export interface ClientVisit {
  id: number;
  appointmentDate: string;
  startTime: string;
  endTime: string | null;
  status: string;
  serviceId: number;
  masterId: number;
  serviceName: string;
  masterName: string;
  price: number;
}

export interface ClientSummaryLite {
  identifier: string;
  name: string;
  phone: string | null;
  telegramId: string | null;
  visitCount: number;
  cancelledCount: number;
  completedCount: number;
  totalSpent: number;
  avgTicket: number;
  firstVisit: string;
  lastVisit: string;
  daysSinceLastVisit: number;
  status: "vip" | "regular" | "new" | "sleeping" | "lost";
  topMasterId: number | null;
  topServiceId: number | null;
  topMasterName?: string | null;
  topMasterCount?: number;
  topServiceName?: string | null;
  topServiceCount?: number;
}

interface Props {
  open: boolean;
  client: ClientSummaryLite | null;
  visits: ClientVisit[];
  onClose: () => void;
}

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
  blue:       "#2563EB",
  blueSft:    "#E0EBFF",
  txtDark:    "#161620",
  txtBody:    "#5F6577",
  txtMute:    "#9AA0B0",
};

const I = {
  x:      "M18 6L6 18M6 6l12 12",
  phone:  "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  copy:   "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  check:  "M20 6L9 17l-5-5",
  msg:    "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  cal:    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  cut:    "M6 3a3 3 0 110 6 3 3 0 010-6zM18 15a3 3 0 110 6 3 3 0 010-6zM8.12 8.12L12 12M12 12l7.88 7.88M20.12 3.88L12 12",
  user:   "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
};

function Ic({ d, size = 18, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  vip:      { label: "VIP",         color: c.primary, bg: c.primarySft },
  regular:  { label: "Постоянный",  color: c.green,   bg: c.greenSft  },
  new:      { label: "Новый",       color: c.blue,    bg: c.blueSft   },
  sleeping: { label: "Спящий",      color: c.orange,  bg: c.orangeSft },
  lost:     { label: "Потерян",     color: c.red,     bg: c.redSft    },
};

const STATUS_VISIT: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Ожидает",   color: c.orange, bg: c.orangeSft },
  confirmed: { label: "Подтв.",    color: c.green,  bg: c.greenSft  },
  cancelled: { label: "Отменена",  color: c.red,    bg: c.redSft    },
  completed: { label: "Завершена", color: c.txtBody,bg: c.borderSoft},
};

const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const WD     = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateLong(iso: string): string {
  const d = parseIso(iso);
  return `${WD[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function formatDateShort(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
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

function clientAgeMonths(firstIso: string, todayIso: string): number {
  const a = parseIso(firstIso), b = parseIso(todayIso);
  return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

function daysSinceLabel(days: number): string {
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7)   return `${days} дн. назад`;
  if (days < 30)  return `${Math.floor(days / 7)} нед. назад`;
  if (days < 365) return `${Math.floor(days / 30)} мес. назад`;
  return `${Math.floor(days / 365)} г. назад`;
}

export default function ClientDetailModal({ open, client, visits, onClose }: Props) {
  const [phoneCopied, setPhoneCopied] = useState(false);

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

  useEffect(() => { if (open) setPhoneCopied(false); }, [open, client?.identifier]);

  // Sort visits newest first
  const sortedVisits = useMemo(() => {
    return visits.slice().sort((a, b) => {
      if (a.appointmentDate !== b.appointmentDate) return b.appointmentDate.localeCompare(a.appointmentDate);
      return b.startTime.localeCompare(a.startTime);
    });
  }, [visits]);

  if (!client) return null;

  const meta = STATUS_META[client.status];
  const months = clientAgeMonths(client.firstVisit, new Date().toISOString().slice(0, 10));
  const ageLabel = months === 0 ? "новый" : months < 12 ? `${months} мес.` : `${Math.floor(months / 12)} г.`;

  async function copyPhone() {
    if (!client?.phone) return;
    try {
      await navigator.clipboard.writeText(client.phone);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 1800);
    } catch {/* no-op */}
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
        role="dialog" aria-modal="true" aria-label="Карточка клиента" aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 520, maxHeight: "92vh",
          zIndex: 110, display: "flex", flexDirection: "column",
          transform: open ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -46%) scale(0.96)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          background: c.bg, borderRadius: 24,
          boxShadow: "0 40px 100px rgba(22,22,32,0.32), 0 8px 24px rgba(22,22,32,0.10)",
          fontFamily: "var(--font-montserrat)",
          overflow: "hidden",
        }}
      >
        {/* Status bar */}
        <div style={{
          background: meta.bg, padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            color: meta.color, fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
          }}>
            {client.status === "vip" && <Ic d={I.star} size={14} />}
            {meta.label}
          </div>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 32, height: 32, borderRadius: 10,
            background: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(8px)",
            border: "none", cursor: "pointer",
            color: c.txtDark, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}>
            <Ic d={I.x} size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Identity hero */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: gradientFor(client.name),
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 22, fontWeight: 800,
              fontFamily: "var(--font-montserrat)", letterSpacing: "-0.03em",
              flexShrink: 0,
              boxShadow: "0 12px 28px -6px rgba(22,22,32,0.25)",
            }}>{initialsOf(client.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 20, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.02em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{client.name}</div>
              <div style={{
                fontSize: 12, color: c.txtMute, marginTop: 4,
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                fontFeatureSettings: '"tnum" 1',
              }}>
                {client.phone && <span>{client.phone}</span>}
                {client.telegramId && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Ic d={I.msg} size={11} /> Telegram
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KPI grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 6,
          }}>
            <KpiCell label="визитов"  value={String(client.visitCount)}                            accent={c.primary} />
            <KpiCell label="всего"    value={`₽${Math.round(client.totalSpent / 1000)}k`}          accent={c.green}   subtle={`${client.totalSpent.toLocaleString("ru-RU")} ₽`} />
            <KpiCell label="ср. чек"  value={client.avgTicket > 0 ? `₽${client.avgTicket.toLocaleString("ru-RU")}` : "—"} accent={c.txtDark} />
            <KpiCell label="с нами"   value={ageLabel}                                              accent={c.txtBody} />
          </div>

          {/* Last visit chip */}
          <div style={{
            background: c.bgSoft, border: `1px solid ${c.border}`, borderRadius: 12,
            padding: "10px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 12, color: c.txtBody,
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Ic d={I.cal} size={14} />
              Последний визит
            </span>
            <span style={{ fontWeight: 700, color: c.txtDark, fontFeatureSettings: '"tnum" 1' }}>
              {formatDateShort(client.lastVisit)} · {daysSinceLabel(client.daysSinceLastVisit)}
            </span>
          </div>

          {/* Favorites */}
          {(client.topMasterName || client.topServiceName) && (
            <div style={{ display: "flex", gap: 8 }}>
              {client.topMasterName && (
                <FavCard
                  icon={I.user}
                  label="Любимый мастер"
                  primary={client.topMasterName}
                  meta={client.topMasterCount ? `${client.topMasterCount}× визитов` : ""}
                />
              )}
              {client.topServiceName && (
                <FavCard
                  icon={I.cut}
                  label="Любимая услуга"
                  primary={client.topServiceName}
                  meta={client.topServiceCount ? `${client.topServiceCount}× выбрана` : ""}
                />
              )}
            </div>
          )}

          {/* Visit timeline */}
          <div>
            <div style={{
              display: "flex", alignItems: "baseline", justifyContent: "space-between",
              marginBottom: 10, padding: "0 2px",
            }}>
              <h3 style={{
                fontSize: 14, fontWeight: 800, color: c.txtDark, margin: 0,
                letterSpacing: "-0.01em",
              }}>История визитов</h3>
              <span style={{ fontSize: 11, color: c.txtMute, fontWeight: 600 }}>
                всего {sortedVisits.length}
                {client.cancelledCount > 0 && <span style={{ color: c.red }}> · {client.cancelledCount} отменено</span>}
              </span>
            </div>

            {sortedVisits.length === 0 ? (
              <div style={{
                padding: "24px 16px", textAlign: "center",
                background: c.bgSoft, border: `1px dashed ${c.border}`, borderRadius: 14,
                fontSize: 13, color: c.txtMute,
              }}>
                Нет завершённых визитов
              </div>
            ) : (
              <div style={{
                background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14,
                overflow: "hidden",
              }}>
                {sortedVisits.map((v, i) => {
                  const vmeta = STATUS_VISIT[v.status] || STATUS_VISIT.pending;
                  const cancelled = v.status === "cancelled";
                  return (
                    <div key={v.id} style={{
                      display: "flex", alignItems: "stretch", gap: 0,
                      borderBottom: i < sortedVisits.length - 1 ? `1px solid ${c.borderSoft}` : "none",
                      opacity: cancelled ? 0.55 : 1,
                    }}>
                      {/* Date rail */}
                      <div style={{
                        flexShrink: 0, width: 78, padding: "12px 8px 10px",
                        textAlign: "center", borderRight: `1px solid ${c.borderSoft}`,
                        background: c.bgSoft,
                      }}>
                        <div style={{
                          fontSize: 13, fontWeight: 800, color: c.txtDark,
                          letterSpacing: "-0.02em", fontFeatureSettings: '"tnum" 1',
                          textDecoration: cancelled ? "line-through" : "none",
                        }}>{formatDateShort(v.appointmentDate)}</div>
                        <div style={{
                          fontSize: 11, color: c.txtMute, marginTop: 2,
                          fontFeatureSettings: '"tnum" 1',
                        }}>{v.startTime}</div>
                      </div>
                      {/* Body */}
                      <div style={{ flex: 1, minWidth: 0, padding: "12px 14px 10px" }}>
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.005em",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{v.serviceName}</div>
                        <div style={{
                          fontSize: 11, color: c.txtMute, marginTop: 2,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          мастер {v.masterName}
                          {v.price > 0 && <span style={{ color: c.txtBody }}> · {v.price.toLocaleString("ru-RU")} ₽</span>}
                        </div>
                      </div>
                      {/* Status */}
                      <div style={{
                        flexShrink: 0, padding: "12px 12px 10px",
                        display: "flex", alignItems: "center",
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: vmeta.color, background: vmeta.bg,
                          padding: "4px 8px", borderRadius: 9, letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                        }}>{vmeta.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <footer style={{
          padding: "12px 24px",
          display: "flex", gap: 8,
          borderTop: `1px solid ${c.border}`,
          background: c.bgSoft,
          flexShrink: 0,
          flexWrap: "wrap",
        }}>
          {client.phone ? (
            <>
              <a
                href={`tel:${client.phone}`}
                style={{
                  flex: 1, minWidth: 140,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                  padding: "11px 14px", borderRadius: 11,
                  background: c.primary, color: "#fff",
                  textDecoration: "none",
                  fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
                  fontFamily: "var(--font-montserrat)",
                  boxShadow: "0 6px 16px rgba(123, 97, 255, 0.30)",
                  transition: "background 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = c.primaryDk; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = c.primary; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <Ic d={I.phone} size={14} />
                Позвонить
              </a>
              <button
                type="button" onClick={copyPhone}
                style={{
                  padding: "11px 14px", borderRadius: 11,
                  background: phoneCopied ? c.greenSft : c.bg,
                  color: phoneCopied ? c.green : c.txtBody,
                  border: `1px solid ${phoneCopied ? "rgba(31,180,106,0.3)" : c.border}`,
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: 12, fontWeight: 600,
                  fontFamily: "var(--font-montserrat)",
                  transition: "all 0.15s",
                }}
              >
                <Ic d={phoneCopied ? I.check : I.copy} size={14} />
                {phoneCopied ? "Скопировано" : "Скопировать"}
              </button>
            </>
          ) : (
            <div style={{
              flex: 1, padding: "11px 14px", borderRadius: 11,
              background: c.bg, border: `1px dashed ${c.border}`,
              color: c.txtMute, fontSize: 12, fontWeight: 600, textAlign: "center",
              fontFamily: "var(--font-montserrat)",
            }}>Телефон клиента не указан</div>
          )}
          <button
            type="button" onClick={onClose}
            style={{
              padding: "11px 18px",
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 11, color: c.txtBody,
              fontSize: 13, fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
            }}
          >Закрыть</button>
        </footer>
      </div>
    </>
  );
}

function KpiCell({ label, value, accent, subtle }: { label: string; value: string; accent: string; subtle?: string }) {
  return (
    <div style={{
      background: c.bgSoft, borderRadius: 12,
      padding: "10px 8px", textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
      minHeight: 64,
    }}>
      <div style={{
        fontSize: 16, fontWeight: 800, color: accent, letterSpacing: "-0.02em",
        fontFamily: "var(--font-montserrat)", fontFeatureSettings: '"tnum" 1',
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
      }} title={subtle}>{value}</div>
      <div style={{
        fontSize: 9, color: c.txtMute, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
}

function FavCard({ icon, label, primary, meta }: { icon: string; label: string; primary: string; meta: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: "10px 12px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: c.primarySft, color: c.primary,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Ic d={icon} size={15} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9, color: c.txtMute, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{label}</div>
        <div style={{
          fontSize: 12, fontWeight: 700, color: c.txtDark, marginTop: 1,
          letterSpacing: "-0.005em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{primary}</div>
        {meta && (
          <div style={{
            fontSize: 10, color: c.txtMute, marginTop: 1,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{meta}</div>
        )}
      </div>
    </div>
  );
}
