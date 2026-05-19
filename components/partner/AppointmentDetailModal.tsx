"use client";
import { useEffect, useState } from "react";

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
  orange:     "#FF9500",
  orangeSft:  "#FFF1DE",
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
  x:        "M18 6L6 18M6 6l12 12",
  clock:    "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  cal:      "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  phone:    "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z",
  user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  cut:      "M6 3a3 3 0 110 6 3 3 0 010-6zM18 15a3 3 0 110 6 3 3 0 010-6zM8.12 8.12L12 12M12 12l7.88 7.88M20.12 3.88L12 12",
  ruble:    "M6 11h7a4 4 0 100-8H6v18M6 15h8",
  msg:      "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  ban:      "M18.36 18.36A10 10 0 005.64 5.64M2 12a10 10 0 1020 0 10 10 0 00-20 0z",
  copy:     "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  check:    "M20 6L9 17l-5-5",
};

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Ожидает подтверждения", color: c.orange,  bg: c.orangeSft },
  confirmed: { label: "Подтверждена",          color: c.green,   bg: c.greenSft  },
  cancelled: { label: "Отменена",              color: c.red,     bg: c.redSft    },
  completed: { label: "Завершена",             color: c.txtBody, bg: c.borderSoft},
};

const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const WEEKDAYS = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]}, ${d} ${MONTHS[m - 1]}`;
}

function priceToNumber(p: string | null | undefined): number {
  if (!p) return 0;
  const digits = String(p).replace(/\D/g, "");
  return Number(digits) || 0;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
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
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[h % palettes.length];
}

export interface Appointment {
  id: number;
  masterId: number;
  serviceId: number;
  variantId: number | null;
  appointmentDate: string;
  startTime: string;
  endTime: string | null;
  clientName: string;
  clientPhone: string | null;
  clientTelegramId: string | null;
  status: string;
  createdAt: string;
}

export interface AppointmentService {
  id: number;
  name: string;
  price: string | null;
  duration: number | null;
}
export interface AppointmentMaster {
  id: number;
  fullName: string;
  specialization: string;
  photoUrl: string | null;
}

interface Props {
  open: boolean;
  appointment: Appointment | null;
  service: AppointmentService | null;
  master: AppointmentMaster | null;
  onClose: () => void;
  onChanged?: () => void;
}

export default function AppointmentDetailModal({ open, appointment, service, master, onClose, onChanged }: Props) {
  const [phoneCopied, setPhoneCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPhoneCopied(false);
      setConfirmCancel(false);
      setCancelling(false);
      setError("");
    }
  }, [open]);

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

  if (!appointment) return null;

  const status = STATUS[appointment.status] || STATUS.pending;
  const price = priceToNumber(service?.price);
  const duration = service?.duration ?? null;

  async function handleCopyPhone() {
    if (!appointment?.clientPhone) return;
    try {
      await navigator.clipboard.writeText(appointment.clientPhone);
      setPhoneCopied(true);
      setTimeout(() => setPhoneCopied(false), 1800);
    } catch {
      // Silently fail
    }
  }

  async function handleCancel() {
    if (!appointment) return;
    if (!confirmCancel) {
      setConfirmCancel(true);
      setTimeout(() => setConfirmCancel(false), 4000);
      return;
    }
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments?id=${appointment.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось отменить");
      }
      onChanged?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCancelling(false);
      setConfirmCancel(false);
    }
  }

  const isActive = appointment.status === "confirmed" || appointment.status === "pending";

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
        role="dialog" aria-modal="true" aria-label="Детали записи" aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 480, maxHeight: "92vh",
          zIndex: 110, display: "flex", flexDirection: "column",
          transform: open
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -46%) scale(0.96)",
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
          background: status.bg, padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            color: status.color, fontSize: 13, fontWeight: 700,
            letterSpacing: "0.02em",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: 4, background: status.color,
              boxShadow: `0 0 0 4px ${status.bg}`,
            }} />
            {status.label}
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
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Time + Date hero */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 11, color: c.txtMute, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8,
            }}>Запись</div>
            <div style={{
              fontSize: 42, fontWeight: 800, color: c.txtDark,
              letterSpacing: "-0.04em", lineHeight: 1,
              fontFeatureSettings: '"tnum" 1',
              marginBottom: 8,
            }}>
              {appointment.startTime}
              {appointment.endTime && (
                <span style={{ color: c.txtMute, fontWeight: 600, fontSize: 28 }}>
                  {" — "}{appointment.endTime}
                </span>
              )}
            </div>
            <div style={{
              fontSize: 13, color: c.txtBody,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <Ic d={I.cal} size={14} />
              {formatDate(appointment.appointmentDate)}
            </div>
          </div>

          {/* Service info card */}
          {service && (
            <div style={{
              background: c.bgSoft, borderRadius: 14, padding: 16,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 11,
                  background: c.primarySft, color: c.primary,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}><Ic d={I.cut} size={17} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, color: c.txtMute, fontWeight: 700,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                  }}>Услуга</div>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: c.txtDark, marginTop: 2,
                    letterSpacing: "-0.01em",
                  }}>{service.name}</div>
                </div>
              </div>
              {(price > 0 || duration) && (
                <div style={{
                  display: "flex", gap: 8, paddingTop: 10,
                  borderTop: `1px solid ${c.border}`,
                }}>
                  {price > 0 && (
                    <div style={{
                      flex: 1,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9,
                        background: c.bg, color: c.primary,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}><Ic d={I.ruble} size={14} /></div>
                      <div>
                        <div style={{ fontSize: 10, color: c.txtMute, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Цена</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.01em" }}>
                          {price.toLocaleString("ru-RU")} ₽
                        </div>
                      </div>
                    </div>
                  )}
                  {duration && (
                    <div style={{
                      flex: 1,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 9,
                        background: c.bg, color: c.primary,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}><Ic d={I.clock} size={14} /></div>
                      <div>
                        <div style={{ fontSize: 10, color: c.txtMute, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Длительность</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.01em" }}>
                          {duration} мин
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Master card */}
          {master && (
            <div style={{
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14,
              padding: 14, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: master.photoUrl
                  ? `url(${master.photoUrl}) center/cover`
                  : gradientFor(master.fullName),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14, fontWeight: 800,
                fontFamily: "var(--font-montserrat)", letterSpacing: "-0.02em",
                flexShrink: 0,
              }}>
                {!master.photoUrl && initialsOf(master.fullName)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, color: c.txtMute, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                }}>Мастер</div>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: c.txtDark, marginTop: 2,
                  letterSpacing: "-0.01em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{master.fullName}</div>
                {master.specialization && (
                  <div style={{
                    fontSize: 11, color: c.txtMute, marginTop: 1,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{master.specialization.split(",")[0]?.trim()}</div>
                )}
              </div>
            </div>
          )}

          {/* Client card */}
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14,
            padding: 14, display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: gradientFor(appointment.clientName),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 14, fontWeight: 800,
                fontFamily: "var(--font-montserrat)", letterSpacing: "-0.02em",
                flexShrink: 0,
              }}>{initialsOf(appointment.clientName)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, color: c.txtMute, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase",
                }}>Клиент</div>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: c.txtDark, marginTop: 2,
                  letterSpacing: "-0.01em",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{appointment.clientName}</div>
              </div>
            </div>

            {/* Contact actions */}
            {(appointment.clientPhone || appointment.clientTelegramId) && (
              <div style={{ display: "flex", gap: 8 }}>
                {appointment.clientPhone && (
                  <>
                    <a
                      href={`tel:${appointment.clientPhone}`}
                      style={{
                        flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                        padding: "10px 14px", borderRadius: 11,
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
                      onClick={handleCopyPhone}
                      title={phoneCopied ? "Скопировано" : "Скопировать номер"}
                      style={{
                        padding: "10px 14px", borderRadius: 11,
                        background: phoneCopied ? c.greenSft : c.bgSoft,
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
                      {phoneCopied ? "Скопировано" : appointment.clientPhone}
                    </button>
                  </>
                )}
                {!appointment.clientPhone && appointment.clientTelegramId && (
                  <div style={{
                    flex: 1, display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: 11,
                    background: c.bgSoft, color: c.txtBody,
                    border: `1px solid ${c.border}`,
                    fontSize: 12, fontWeight: 600,
                  }}>
                    <Ic d={I.msg} size={14} />
                    Telegram: {appointment.clientTelegramId}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 14px", borderRadius: 12,
              background: c.redSft, border: `1px solid rgba(239,68,68,0.22)`,
              color: c.red, fontSize: 13, fontWeight: 600,
            }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <footer style={{
          padding: "14px 24px",
          display: "flex", gap: 10,
          borderTop: `1px solid ${c.border}`,
          background: c.bgSoft,
          flexShrink: 0,
        }}>
          {isActive && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              style={{
                padding: "12px 16px",
                background: confirmCancel ? c.red : c.bg,
                border: `1px solid ${confirmCancel ? c.red : c.border}`,
                borderRadius: 11,
                color: confirmCancel ? "#fff" : c.red,
                fontSize: 13, fontWeight: 600,
                cursor: cancelling ? "not-allowed" : "pointer",
                fontFamily: "var(--font-montserrat)",
                display: "inline-flex", alignItems: "center", gap: 7,
                transition: "all 0.18s",
                whiteSpace: "nowrap",
              }}
            >
              <Ic d={I.ban} size={14} />
              {cancelling ? "Отменяем..." : confirmCancel ? "Точно отменить?" : "Отменить запись"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "12px 22px",
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
