"use client";
import { useEffect, useRef, useState } from "react";

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
  swap:     "M16 3l5 5-5 5M21 8H8M8 21l-5-5 5-5M3 16h13",
  arrowL:   "M19 12H5M12 19l-7-7 7-7",
};

const WD_SHORT_RES = ["вс","пн","вт","ср","чт","пт","сб"];
function toLocalIsoRes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseIsoDateRes(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// 08:00 → 21:30 in 30-min increments (28 slots)
const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let m = 8 * 60; m <= 21 * 60 + 30; m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}`);
  }
  return slots;
})();

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

  // Reschedule sub-view state
  const [view, setView] = useState<"details" | "reschedule" | "complete">("details");
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleError, setRescheduleError] = useState("");

  // Complete sub-view state
  interface UsageItem { materialId: number; quantity: string; }
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [usageMaterials, setUsageMaterials] = useState<{ id: number; name: string; unit: string }[]>([]);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");
  const [shortfallBanner, setShortfallBanner] = useState<string | null>(null);
  const dateScrollerRef = useRef<HTMLDivElement>(null);
  const todayBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setPhoneCopied(false);
      setConfirmCancel(false);
      setCancelling(false);
      setError("");
      setView("details");
      setNewDate(appointment?.appointmentDate || "");
      setNewTime(appointment?.startTime || "");
      setRescheduling(false);
      setRescheduleError("");
      setUsageItems([]);
      setUsageMaterials([]);
      setCompleting(false);
      setCompleteError("");
      setShortfallBanner(null);
    }
  }, [open, appointment]);

  // Load materials + recipe when entering complete view
  useEffect(() => {
    if (view !== "complete" || !appointment) return;
    setCompleteError("");
    fetch("/api/partner/materials")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsageMaterials(d.map((m: { id: number; name: string; unit: string }) => ({ id: m.id, name: m.name, unit: m.unit }))); })
      .catch(() => {});
    if (service && service.id) {
      const variantId = appointment.variantId;
      const serviceId = service.id;
      if (variantId) {
        fetch(`/api/partner/services/${serviceId}/variants/${variantId}/materials`)
          .then(r => r.ok ? r.json() : [])
          .then((arr: { materialId: number; quantity: string }[]) =>
            setUsageItems(arr.map(x => ({ materialId: x.materialId, quantity: String(x.quantity) }))))
          .catch(() => setUsageItems([]));
      } else {
        setUsageItems([]);
      }
    } else {
      setUsageItems([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, appointment, service]);

  // Scroll selected date into view when entering reschedule
  useEffect(() => {
    if (view !== "reschedule") return;
    const scroller = dateScrollerRef.current;
    const btn = todayBtnRef.current;
    if (!scroller || !btn) return;
    const offset = btn.offsetLeft - scroller.clientWidth / 2 + btn.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
  }, [view]);

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

  async function handleReschedule() {
    if (!appointment) return;
    if (!newDate || !newTime) {
      setRescheduleError("Выберите новую дату и время");
      return;
    }
    setRescheduling(true);
    setRescheduleError("");
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: appointment.masterId,
          appointmentDate: newDate,
          startTime: newTime,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось перенести запись");
      }
      onChanged?.();
      onClose();
    } catch (e) {
      setRescheduleError(e instanceof Error ? e.message : String(e));
      setRescheduling(false);
    }
  }

  async function handleComplete() {
    if (!appointment) return;
    setCompleting(true);
    setCompleteError("");
    setShortfallBanner(null);
    try {
      const patchRes = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!patchRes.ok) {
        const j = await patchRes.json().catch(() => ({}));
        throw new Error(j.error || "Не удалось завершить запись");
      }
      if (usageItems.length > 0) {
        const items = usageItems
          .map(u => ({ materialId: Number(u.materialId), quantity: Number(u.quantity) }))
          .filter(u => u.materialId > 0 && u.quantity > 0);
        if (items.length > 0) {
          const usageRes = await fetch(`/api/partner/appointments/${appointment.id}/usage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          const data = await usageRes.json();
          if (!usageRes.ok) throw new Error(data?.error || "Не удалось списать материалы");
          if (data?.anyShortfall) {
            setShortfallBanner("Часть материалов списана не полностью — внесите фактический приход.");
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
      onChanged?.();
      onClose();
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setCompleting(false);
    }
  }

  const isActive = appointment.status === "confirmed" || appointment.status === "pending";
  const isTodayOrPast = (() => {
    if (!appointment) return false;
    const d = new Date();
    const todayIso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return appointment.appointmentDate <= todayIso;
  })();
  const isUnchanged =
    newDate === appointment.appointmentDate && newTime === appointment.startTime;
  const canSaveReschedule = !!newDate && !!newTime && !isUnchanged && !rescheduling;

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
          background: view === "reschedule" ? c.primarySft : view === "complete" ? c.greenSft : status.bg,
          padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
          transition: "background 0.2s",
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            color: view === "reschedule" ? c.primaryDk : view === "complete" ? c.green : status.color,
            fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
          }}>
            {view === "reschedule" ? (
              <>
                <Ic d={I.swap} size={14} />
                Перенос записи
              </>
            ) : view === "complete" ? (
              <>
                <Ic d={I.check} size={14} />
                Завершение записи
              </>
            ) : (
              <>
                <span style={{
                  width: 8, height: 8, borderRadius: 4, background: status.color,
                  boxShadow: `0 0 0 4px ${status.bg}`,
                }} />
                {status.label}
              </>
            )}
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

        {view === "reschedule" ? (
          <RescheduleBody
            current={{ date: appointment.appointmentDate, time: appointment.startTime }}
            newDate={newDate} newTime={newTime}
            onPickDate={setNewDate} onPickTime={setNewTime}
            scrollerRef={dateScrollerRef} todayBtnRef={todayBtnRef}
            error={rescheduleError}
          />
        ) : view === "complete" ? (
          <div style={{
            flex: 1, overflowY: "auto", padding: "20px 24px 24px",
            display: "flex", flexDirection: "column", gap: 16,
            fontFamily: "var(--font-montserrat)",
          }}>
            <div style={{
              fontSize: 11, color: c.txtMute, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>Списать материалы</div>

            {usageItems.length === 0 ? (
              <div style={{
                padding: "24px 16px", background: c.bgSoft, borderRadius: 12,
                textAlign: "center", color: c.txtMute, fontSize: 13, lineHeight: 1.5,
              }}>
                Рецепт для этого варианта услуги не задан.<br/>
                Можно добавить материалы вручную или завершить без списания.
              </div>
            ) : (
              <div style={{ fontSize: 11, color: c.txtMute, textAlign: "right" }}>из рецепта · можно править</div>
            )}

            {usageItems.map((u, idx) => {
              const mat = usageMaterials.find(m => m.id === u.materialId);
              return (
                <div key={idx} style={{ display: "flex", gap: 6 }}>
                  <select value={u.materialId}
                    onChange={e => {
                      const v = Number(e.target.value);
                      setUsageItems(prev => prev.map((x, i) => i === idx ? { ...x, materialId: v } : x));
                    }}
                    style={{
                      flex: 1, height: 40, padding: "0 10px",
                      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
                      fontFamily: "var(--font-montserrat)", fontSize: 13, color: c.txtDark, outline: "none",
                    }}>
                    {usageMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <input value={u.quantity}
                    onChange={e => {
                      const q = e.target.value;
                      setUsageItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: q } : x));
                    }}
                    inputMode="decimal" placeholder="0"
                    style={{
                      width: 80, height: 40, padding: "0 10px",
                      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
                      fontFamily: "var(--font-montserrat)", fontSize: 13, color: c.txtDark, outline: "none",
                    }} />
                  <div style={{
                    display: "flex", alignItems: "center", padding: "0 8px",
                    fontSize: 12, color: c.txtBody, fontWeight: 600, minWidth: 28,
                  }}>{mat?.unit ?? ""}</div>
                  <button type="button"
                    onClick={() => setUsageItems(prev => prev.filter((_, i) => i !== idx))}
                    style={{
                      width: 36, height: 40, borderRadius: 9,
                      background: c.bg, border: `1px solid ${c.border}`,
                      color: c.red, cursor: "pointer", flexShrink: 0,
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                    }} aria-label="Удалить">&#215;</button>
                </div>
              );
            })}

            <button type="button"
              disabled={usageMaterials.length === 0}
              onClick={() => {
                const firstId = usageMaterials[0]?.id;
                if (!firstId) return;
                setUsageItems(prev => [...prev, { materialId: firstId, quantity: "" }]);
              }}
              style={{
                alignSelf: "flex-start",
                background: "transparent", border: `1px dashed ${c.border}`,
                padding: "8px 12px", borderRadius: 9,
                color: c.primary, fontSize: 12, fontWeight: 700,
                cursor: usageMaterials.length === 0 ? "not-allowed" : "pointer",
                opacity: usageMaterials.length === 0 ? 0.5 : 1,
                fontFamily: "var(--font-montserrat)",
              }}>+ Добавить материал</button>

            {shortfallBanner && (
              <div style={{
                padding: "10px 12px", borderRadius: 10,
                background: "#FEF3C7", color: "#92400E",
                fontSize: 12, fontWeight: 600,
              }}>{shortfallBanner}</div>
            )}

            {completeError && (
              <div style={{
                padding: "10px 12px", borderRadius: 10,
                background: c.redSft, color: c.red,
                fontSize: 12, fontWeight: 600,
              }}>{completeError}</div>
            )}
          </div>
        ) : (
        /* Body */
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
        )}

        {/* Footer — single row that fills the width */}
        <footer style={{
          padding: "12px 24px",
          display: "flex", gap: 8, alignItems: "stretch",
          borderTop: `1px solid ${c.border}`,
          background: c.bgSoft,
          flexShrink: 0,
        }}>
          {view === "details" ? (
            <>
              {isActive && (
                <>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    aria-label={cancelling ? "Отменяем" : confirmCancel ? "Подтвердите отмену" : "Отменить запись"}
                    title={confirmCancel ? "Подтвердите отмену" : "Отменить запись"}
                    style={{
                      flexShrink: 0,
                      height: 44,
                      width: (confirmCancel || cancelling) ? "auto" : 52,
                      padding: (confirmCancel || cancelling) ? "0 14px" : 0,
                      background: confirmCancel ? c.red : c.bg,
                      border: `1px solid ${confirmCancel ? c.red : c.border}`,
                      borderRadius: 11,
                      color: confirmCancel ? "#fff" : c.red,
                      fontSize: 13, fontWeight: 700,
                      cursor: cancelling ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-montserrat)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                      transition: "background 0.18s, color 0.18s, border-color 0.18s, width 0.18s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Ic d={I.ban} size={16} />
                    {cancelling ? "Отменяем..." : confirmCancel ? "Точно?" : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("reschedule")}
                    aria-label="Перенести запись"
                    title="Перенести запись"
                    style={{
                      flexShrink: 0,
                      width: 52, height: 44,
                      background: c.primarySft,
                      border: "1px solid transparent",
                      borderRadius: 11,
                      color: c.primaryDk,
                      cursor: "pointer",
                      fontFamily: "var(--font-montserrat)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.18s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#E5DEFE"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = c.primarySft; }}
                  >
                    <Ic d={I.swap} size={16} />
                  </button>
                  {isTodayOrPast && (
                    <button
                      type="button"
                      onClick={() => setView("complete")}
                      aria-label="Завершить запись и списать материалы"
                      title="Завершить и списать материалы"
                      style={{
                        flexShrink: 0,
                        width: 52, height: 44,
                        background: c.greenSft,
                        border: "1px solid transparent",
                        borderRadius: 11,
                        color: "#0F8A4A",
                        cursor: "pointer",
                        fontFamily: "var(--font-montserrat)",
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.18s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#C8F0DC"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = c.greenSft; }}
                    >
                      <Ic d={I.check} size={16} />
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, height: 44,
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 11, color: c.txtBody,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-montserrat)",
                }}
              >Закрыть</button>
            </>
          ) : view === "complete" ? (
            <>
              <button
                type="button"
                onClick={() => { setView("details"); setCompleteError(""); setShortfallBanner(null); }}
                disabled={completing}
                aria-label="Назад"
                style={{
                  flexShrink: 0,
                  width: 52, height: 44,
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 11, color: c.txtBody,
                  cursor: completing ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-montserrat)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Ic d={I.arrowL} size={16} />
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing}
                style={{
                  flex: 1, height: 44,
                  background: c.green, border: "none",
                  borderRadius: 11, color: "#fff",
                  fontSize: 13, fontWeight: 700,
                  cursor: completing ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-montserrat)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                  boxShadow: "0 6px 18px -4px rgba(31, 180, 106, 0.45)",
                }}
              >
                <Ic d={I.check} size={16} />
                {completing
                  ? "Завершаем..."
                  : usageItems.length === 0
                    ? "Завершить без списания"
                    : "Завершить и списать"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => { setView("details"); setRescheduleError(""); }}
                disabled={rescheduling}
                aria-label="Назад к деталям"
                title="Назад"
                style={{
                  flexShrink: 0,
                  width: 52, height: 44,
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 11, color: c.txtBody,
                  cursor: rescheduling ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-montserrat)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Ic d={I.arrowL} size={16} />
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                disabled={!canSaveReschedule}
                style={{
                  flex: 1, height: 44,
                  background: canSaveReschedule ? c.primary : c.borderSoft,
                  border: "none",
                  borderRadius: 11,
                  color: canSaveReschedule ? "#fff" : c.txtMute,
                  fontSize: 13, fontWeight: 700,
                  cursor: canSaveReschedule ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-montserrat)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                  boxShadow: canSaveReschedule ? "0 8px 22px -6px rgba(123, 97, 255, 0.50)" : "none",
                  transition: "background 0.18s, color 0.18s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (canSaveReschedule) e.currentTarget.style.background = c.primaryDk; }}
                onMouseLeave={e => { if (canSaveReschedule) e.currentTarget.style.background = c.primary; }}
              >
                <Ic d={I.check} size={16} />
                {rescheduling ? "Переносим..." : "Сохранить"}
              </button>
            </>
          )}
        </footer>
      </div>
    </>
  );
}

function RescheduleBody({
  current, newDate, newTime, onPickDate, onPickTime, scrollerRef, todayBtnRef, error,
}: {
  current: { date: string; time: string };
  newDate: string;
  newTime: string;
  onPickDate: (iso: string) => void;
  onPickTime: (hhmm: string) => void;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  todayBtnRef: React.RefObject<HTMLButtonElement | null>;
  error: string;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toLocalIsoRes(today);

  const days: { iso: string; date: Date; isToday: boolean }[] = [];
  for (let offset = 0; offset <= 30; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    days.push({ iso: toLocalIsoRes(d), date: d, isToday: offset === 0 });
  }

  // Include current appointment date even if it's past, so user can re-confirm same date with new time
  const currentDateObj = parseIsoDateRes(current.date);
  currentDateObj.setHours(0, 0, 0, 0);
  if (currentDateObj.getTime() < today.getTime()) {
    days.unshift({ iso: current.date, date: currentDateObj, isToday: false });
  }

  const selectedBtnRef = useRef<HTMLButtonElement>(null);
  // Mount: scroll today (or current date) into view via the shared ref
  useEffect(() => {
    const scroller = scrollerRef.current;
    const btn = todayBtnRef.current || selectedBtnRef.current;
    if (!scroller || !btn) return;
    const offset = btn.offsetLeft - scroller.clientWidth / 2 + btn.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sameAsOriginal = newDate === current.date && newTime === current.time;

  return (
    <div style={{
      flex: 1, overflowY: "auto", padding: "20px 24px 24px",
      display: "flex", flexDirection: "column", gap: 20,
    }}>
      {/* Current appointment summary */}
      <div style={{
        background: c.bgSoft, border: `1px solid ${c.border}`, borderRadius: 14,
        padding: "12px 14px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: c.bg, color: c.txtMute,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${c.border}`, flexShrink: 0,
        }}>
          <Ic d={I.clock} size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, color: c.txtMute, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>Сейчас</div>
          <div style={{
            fontSize: 14, fontWeight: 700, color: c.txtDark, marginTop: 1,
            letterSpacing: "-0.01em", fontFeatureSettings: '"tnum" 1',
          }}>
            {formatDate(current.date)} · {current.time}
          </div>
        </div>
      </div>

      {/* New date picker */}
      <div>
        <div style={{
          fontSize: 11, color: c.txtMute, fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: 10, paddingLeft: 2,
        }}>Новая дата</div>
        <div ref={scrollerRef} className="bb-no-scrollbar-modal" style={{
          display: "flex", gap: 6, overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none" as any,
          padding: "2px 0 6px",
          WebkitOverflowScrolling: "touch",
          margin: "0 -24px", paddingLeft: 24, paddingRight: 24,
        }}>
          {days.map(d => {
            const sel = newDate === d.iso;
            const refToAttach =
              d.isToday ? todayBtnRef
              : (sel ? selectedBtnRef : undefined);
            return (
              <button key={d.iso} type="button"
                ref={refToAttach as React.RefObject<HTMLButtonElement>}
                onClick={() => onPickDate(d.iso)}
                style={{
                  flexShrink: 0, position: "relative",
                  width: 54, height: 62,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 2, padding: "8px 6px",
                  background: sel ? c.primary : c.bg,
                  color: sel ? "#fff" : c.txtDark,
                  border: `1px solid ${sel ? c.primary : c.border}`,
                  borderRadius: 12, cursor: "pointer",
                  fontFamily: "var(--font-montserrat)",
                  transition: "background 0.18s, border-color 0.18s, color 0.18s",
                  boxShadow: sel ? "0 6px 18px -4px rgba(123,97,255,0.45)" : "none",
                }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: sel ? "rgba(255,255,255,0.85)" : c.txtMute,
                }}>{WD_SHORT_RES[d.date.getDay()]}</span>
                <span style={{
                  fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em",
                  fontFeatureSettings: '"tnum" 1',
                }}>{d.date.getDate()}</span>
                {d.iso === todayIso && (
                  <span style={{
                    position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)",
                    width: 4, height: 4, borderRadius: "50%",
                    background: sel ? "#fff" : c.primary,
                  }} />
                )}
              </button>
            );
          })}
        </div>
        <style>{`.bb-no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>
      </div>

      {/* New time picker */}
      <div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 10, paddingLeft: 2,
        }}>
          <div style={{
            fontSize: 11, color: c.txtMute, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
          }}>Новое время</div>
          <label style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, color: c.txtMute, fontWeight: 600,
            fontFamily: "var(--font-montserrat)",
          }}>
            <span>своё</span>
            <input
              type="time"
              value={newTime}
              step={300}
              onChange={e => onPickTime(e.target.value)}
              style={{
                width: 86, padding: "5px 8px",
                borderRadius: 8, border: `1px solid ${c.border}`,
                background: c.bg, color: c.txtDark, fontWeight: 700,
                fontFamily: "var(--font-montserrat)",
                fontFeatureSettings: '"tnum" 1',
                outline: "none",
              }}
            />
          </label>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 6,
        }}>
          {TIME_SLOTS.map(t => {
            const sel = newTime === t;
            return (
              <button key={t} type="button"
                onClick={() => onPickTime(t)}
                style={{
                  height: 38,
                  background: sel ? c.primary : c.bg,
                  color: sel ? "#fff" : c.txtDark,
                  border: `1px solid ${sel ? c.primary : c.border}`,
                  borderRadius: 10, cursor: "pointer",
                  fontFamily: "var(--font-montserrat)",
                  fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em",
                  fontFeatureSettings: '"tnum" 1',
                  transition: "background 0.15s, border-color 0.15s, color 0.15s",
                  boxShadow: sel ? "0 4px 12px -3px rgba(123,97,255,0.40)" : "none",
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = c.bgSoft; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = c.bg; }}
              >{t}</button>
            );
          })}
        </div>
      </div>

      {/* Hint when nothing changed */}
      {sameAsOriginal && (
        <div style={{
          padding: "10px 14px", borderRadius: 11,
          background: c.bgSoft, border: `1px dashed ${c.border}`,
          fontSize: 12, color: c.txtMute, fontFamily: "var(--font-montserrat)",
          textAlign: "center",
        }}>
          Выберите другую дату или время чтобы перенести запись
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "12px 14px", borderRadius: 12,
          background: c.redSft, border: `1px solid rgba(239,68,68,0.22)`,
          color: c.red, fontSize: 13, fontWeight: 600,
          fontFamily: "var(--font-montserrat)",
        }}>{error}</div>
      )}
    </div>
  );
}
