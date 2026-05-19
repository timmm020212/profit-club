"use client";
import { useState, useEffect } from "react";

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
  x:       "M18 6L6 18M6 6l12 12",
  trash:   "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  clock:   "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  info:    "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  cal:     "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
};

const PRESETS: { label: string; start: string; end: string }[] = [
  { label: "9 — 19", start: "09:00", end: "19:00" },
  { label: "10 — 18", start: "10:00", end: "18:00" },
  { label: "10 — 20", start: "10:00", end: "20:00" },
  { label: "8 — 20",  start: "08:00", end: "20:00" },
  { label: "11 — 21", start: "11:00", end: "21:00" },
];

// HH:MM half-hour ticks from 06:00 to 23:30
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  out.push("23:59"); // for end-of-day closures
  return out;
})();

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_GEN = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const wd = (date.getDay() + 6) % 7; // 0=Пн
  return `${WEEKDAYS_SHORT[wd]}, ${d} ${MONTHS_GEN[m - 1]}`;
}

function dateOfWeek(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (date.getDay() + 6) % 7; // 0=Mon
}

export interface ScheduleCell {
  masterId: number;
  masterName: string;
  date: string;       // YYYY-MM-DD
  weekDates: string[]; // 7 dates of the current week (Mon-Sun)
  existing?: { startTime: string; endTime: string } | null;
}

interface Props {
  open: boolean;
  cell: ScheduleCell | null;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

export default function ScheduleCellEditor({ open, cell, onClose, onSaved, onDeleted }: Props) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("19:00");
  const [scope, setScope] = useState<"day" | "week" | "weekdays">("day");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && cell) {
      setStartTime(cell.existing?.startTime || "09:00");
      setEndTime(cell.existing?.endTime || "19:00");
      setScope("day");
      setSaving(false);
      setDeleting(false);
      setConfirmDelete(false);
      setError("");
    }
  }, [open, cell]);

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

  if (!cell) return null;

  const targetDates = (() => {
    if (scope === "day") return [cell.date];
    if (scope === "week") return cell.weekDates;
    // weekdays = Mon-Fri
    return cell.weekDates.filter((_, i) => i < 5);
  })();

  async function handleSave() {
    if (!cell) return;
    if (startTime >= endTime) {
      setError("Время начала должно быть раньше конца");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/partner/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: cell.masterId,
          dates: targetDates,
          startTime,
          endTime,
        }),
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
    if (!cell?.existing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const params = new URLSearchParams({
        masterId: String(cell.masterId),
        date: cell.date,
      });
      const res = await fetch(`/api/partner/schedule?${params.toString()}`, { method: "DELETE" });
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
    marginBottom: 8, fontFamily: "var(--font-montserrat)",
  };

  const todayDow = dateOfWeek(cell.date);

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
        role="dialog" aria-modal="true" aria-label="Редактировать рабочие часы" aria-hidden={!open}
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
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{cell.masterName}</div>
            <h2 style={{
              fontSize: 18, fontWeight: 800, color: c.txtDark, margin: 0,
              letterSpacing: "-0.02em", lineHeight: 1.2,
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              <Ic d={I.cal} size={16} />
              {formatDateLong(cell.date)}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 36, height: 36, borderRadius: 12,
            background: c.bgSoft, border: "none", cursor: "pointer",
            color: c.txtBody, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s", flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = c.border; }}
            onMouseLeave={e => { e.currentTarget.style.background = c.bgSoft; }}
          >
            <Ic d={I.x} size={16} />
          </button>
        </header>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Quick presets */}
          <div>
            <label style={labelStyle}>Быстрые пресеты</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRESETS.map(p => {
                const active = startTime === p.start && endTime === p.end;
                return (
                  <button
                    key={p.label} type="button"
                    onClick={() => { setStartTime(p.start); setEndTime(p.end); }}
                    style={{
                      padding: "8px 14px", borderRadius: 18,
                      background: active ? c.primary : c.bg,
                      color: active ? "#fff" : c.txtBody,
                      border: `1.5px solid ${active ? c.primary : c.border}`,
                      fontSize: 12, fontWeight: active ? 700 : 600,
                      cursor: "pointer", fontFamily: "var(--font-montserrat)",
                      letterSpacing: "0.01em",
                      transition: "all 0.15s",
                    }}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>

          {/* Time selectors */}
          <div>
            <label style={labelStyle}>Рабочие часы</label>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10,
            }}>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: c.bg, color: c.txtDark,
                  border: `1.5px solid ${c.border}`, borderRadius: 12,
                  fontSize: 16, fontWeight: 700,
                  fontFamily: "var(--font-montserrat)", outline: "none",
                  appearance: "none",
                  letterSpacing: "0.02em",
                  textAlign: "center",
                  textAlignLast: "center" as const,
                  cursor: "pointer",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239AA0B0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: 30,
                }}
              >
                {TIME_OPTIONS.filter(t => t < endTime).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{ color: c.txtMute, fontSize: 16, fontWeight: 600, padding: "0 4px" }}>—</div>
              <select
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px",
                  background: c.bg, color: c.txtDark,
                  border: `1.5px solid ${c.border}`, borderRadius: 12,
                  fontSize: 16, fontWeight: 700,
                  fontFamily: "var(--font-montserrat)", outline: "none",
                  appearance: "none",
                  letterSpacing: "0.02em",
                  textAlign: "center",
                  textAlignLast: "center" as const,
                  cursor: "pointer",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239AA0B0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  paddingRight: 30,
                }}
              >
                {TIME_OPTIONS.filter(t => t > startTime).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{
              marginTop: 10, fontSize: 12, color: c.txtMute,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Ic d={I.clock} size={13} />
              Смена: {(() => {
                const [sh, sm] = startTime.split(":").map(Number);
                const [eh, em] = endTime.split(":").map(Number);
                const mins = (eh * 60 + em) - (sh * 60 + sm);
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                return `${h}ч${m > 0 ? ` ${m}м` : ""}`;
              })()}
            </div>
          </div>

          {/* Scope */}
          <div>
            <label style={labelStyle}>Применить</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {([
                { key: "day",      label: "Только этот день",        sub: formatDateLong(cell.date) },
                { key: "weekdays", label: "Будни (Пн–Пт)",            sub: "5 дней" },
                { key: "week",     label: "Всю неделю",               sub: "7 дней" },
              ] as const).map(opt => {
                const active = scope === opt.key;
                return (
                  <button
                    key={opt.key} type="button"
                    onClick={() => setScope(opt.key)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 12,
                      background: active ? c.primarySft : c.bg,
                      border: `1.5px solid ${active ? c.primary : c.border}`,
                      cursor: "pointer", textAlign: "left",
                      fontFamily: "var(--font-montserrat)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: `2px solid ${active ? c.primary : c.border}`,
                      background: active ? c.primary : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, position: "relative",
                    }}>
                      {active && (
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%",
                          background: "#fff",
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: active ? c.primary : c.txtDark,
                      }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: c.txtMute, marginTop: 1 }}>
                        {opt.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {scope !== "day" && (
              <div style={{
                marginTop: 10,
                padding: "10px 12px", borderRadius: 10,
                background: c.primarySft, color: c.primaryDk,
                fontSize: 11, fontWeight: 500, lineHeight: 1.5,
                display: "flex", gap: 8,
              }}>
                <Ic d={I.info} size={14} />
                <div>
                  Эти часы перезапишут уже установленное расписание {scope === "week" ? "на всех 7 днях" : "в будни"}.
                </div>
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
          {cell.existing && (
            <button
              type="button" onClick={handleDelete}
              disabled={saving || deleting}
              title="Сделать день выходным (удалить часы)"
              style={{
                padding: "13px 14px",
                background: confirmDelete ? c.red : c.bg,
                border: `1px solid ${confirmDelete ? c.red : c.border}`,
                borderRadius: 12,
                color: confirmDelete ? "#fff" : c.red,
                fontSize: 13, fontWeight: 600,
                cursor: (saving || deleting) ? "not-allowed" : "pointer",
                fontFamily: "var(--font-montserrat)",
                display: "inline-flex", alignItems: "center", gap: 7,
                transition: "all 0.18s",
                whiteSpace: "nowrap",
              }}
            >
              <Ic d={I.trash} size={14} />
              {deleting ? "Удаляем..." : confirmDelete ? "Точно выходной?" : "Выходной"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            type="button" onClick={onClose}
            disabled={saving || deleting}
            style={{
              padding: "13px 18px",
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, color: c.txtBody,
              fontSize: 13, fontWeight: 600,
              cursor: (saving || deleting) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              transition: "background 0.15s",
            }}
          >Отмена</button>
          <button
            type="button" onClick={handleSave}
            disabled={saving || deleting}
            style={{
              padding: "13px 22px",
              background: (saving || deleting) ? c.txtMute : c.primary,
              border: "none", borderRadius: 12,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: (saving || deleting) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              letterSpacing: "0.02em",
              transition: "background 0.15s, box-shadow 0.15s, transform 0.15s",
              boxShadow: (saving || deleting) ? "none" : "0 8px 22px rgba(123, 97, 255, 0.32)",
            }}
            onMouseEnter={e => {
              if (!(saving || deleting)) {
                e.currentTarget.style.background = c.primaryDk;
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={e => {
              if (!(saving || deleting)) {
                e.currentTarget.style.background = c.primary;
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </footer>
      </div>
    </>
  );
}
