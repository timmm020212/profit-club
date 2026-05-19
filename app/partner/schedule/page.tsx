"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import ScheduleCellEditor, { ScheduleCell } from "@/components/partner/ScheduleCellEditor";

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
  green:      "#1FB46A",
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
  chevL: "M15 18l-6-6 6-6",
  chevR: "M9 18l6-6-6-6",
  plus:  "M12 5v14M5 12h14",
  user:  "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  cal:   "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
};

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_SHORT = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"];

// ── Date helpers ──
function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // 0=Mon
  out.setDate(out.getDate() - dow);
  return out;
}
function addDays(d: Date, days: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + days);
  return out;
}
function todayIso(): string {
  return toIso(new Date());
}

interface Master {
  id: number;
  fullName: string;
  specialization: string;
  photoUrl: string | null;
  showOnSite: boolean;
}

interface Slot {
  id: number;
  masterId: number;
  workDate: string;
  startTime: string;
  endTime: string;
  isConfirmed: boolean;
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

// "9 — 19" (drop minutes when :00)
function formatRange(start: string, end: string): string {
  const left = start.endsWith(":00") ? start.slice(0, -3) : start;
  const right = end.endsWith(":00") ? end.slice(0, -3) : end;
  return `${left} — ${right}`;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()));
  const [masters, setMasters] = useState<Master[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{ open: boolean; cell: ScheduleCell | null }>({ open: false, cell: null });
  const [refreshKey, setRefreshKey] = useState(0);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => toIso(addDays(weekStart, i))), [weekStart]);
  const from = weekDates[0];
  const to = weekDates[6];
  const todayStr = todayIso();

  const weekLabel = useMemo(() => {
    const s = weekStart;
    const e = addDays(weekStart, 6);
    const sM = MONTHS_SHORT[s.getMonth()];
    const eM = MONTHS_SHORT[e.getMonth()];
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} — ${e.getDate()} ${sM}`;
    }
    return `${s.getDate()} ${sM} — ${e.getDate()} ${eM}`;
  }, [weekStart]);

  const isCurrentWeek = useMemo(() => {
    const now = startOfWeek(new Date());
    return toIso(now) === toIso(weekStart);
  }, [weekStart]);

  // Fetch masters + schedule
  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([
      fetch("/api/partner/masters").then(r => r.json()),
      fetch(`/api/partner/schedule?from=${from}&to=${to}`).then(r => r.json()),
    ])
      .then(([m, s]) => {
        if (Array.isArray(m)) setMasters(m);
        if (s?.slots) setSlots(s.slots);
        if (s?.counts) setCounts(s.counts);
        if (m?.error) setError(m.error);
        if (s?.error) setError(s.error);
      })
      .catch(() => setError("Ошибка соединения"))
      .finally(() => setLoading(false));
  }, [from, to, refreshKey]);

  const slotByKey = useMemo(() => {
    const map = new Map<string, Slot>();
    for (const s of slots) map.set(`${s.masterId}-${s.workDate}`, s);
    return map;
  }, [slots]);

  const openCell = useCallback((master: Master, date: string) => {
    const slot = slotByKey.get(`${master.id}-${date}`);
    setEditor({
      open: true,
      cell: {
        masterId: master.id,
        masterName: master.fullName,
        date,
        weekDates,
        existing: slot ? { startTime: slot.startTime, endTime: slot.endTime } : null,
      },
    });
  }, [slotByKey, weekDates]);

  function gotoPrev() { setWeekStart(s => addDays(s, -7)); }
  function gotoNext() { setWeekStart(s => addDays(s, 7)); }
  function gotoToday() { setWeekStart(startOfWeek(new Date())); }

  return (
    <div style={{ fontFamily: "var(--font-montserrat)" }}>
      {/* Header */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "flex-start",
        justifyContent: "space-between", gap: 14, marginBottom: 18,
      }}>
        <div>
          <div style={{
            fontSize: 10, color: c.primary, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6,
          }}>График работы</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
            letterSpacing: "-0.02em",
          }}>Расписание</h1>
          <p style={{ fontSize: 13, color: c.txtMute, marginTop: 6 }}>
            Установите рабочие часы мастеров на каждый день
          </p>
        </div>

        {/* Week navigator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: c.bg, border: `1px solid ${c.border}`,
          borderRadius: 14, padding: 4,
        }}>
          <button
            onClick={gotoPrev}
            aria-label="Предыдущая неделя"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "transparent", border: "none", cursor: "pointer",
              color: c.txtBody, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = c.bgSoft; e.currentTarget.style.color = c.txtDark; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = c.txtBody; }}
          ><Ic d={I.chevL} size={16} /></button>

          <button
            onClick={gotoToday}
            disabled={isCurrentWeek}
            title={isCurrentWeek ? "Текущая неделя" : "Перейти к текущей неделе"}
            style={{
              minWidth: 140, textAlign: "center",
              padding: "8px 12px", borderRadius: 10,
              background: "transparent", border: "none",
              cursor: isCurrentWeek ? "default" : "pointer",
              fontSize: 14, fontWeight: 700,
              color: isCurrentWeek ? c.primary : c.txtDark,
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-montserrat)",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { if (!isCurrentWeek) e.currentTarget.style.background = c.bgSoft; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          >{weekLabel}</button>

          <button
            onClick={gotoNext}
            aria-label="Следующая неделя"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "transparent", border: "none", cursor: "pointer",
              color: c.txtBody, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = c.bgSoft; e.currentTarget.style.color = c.txtDark; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = c.txtBody; }}
          ><Ic d={I.chevR} size={16} /></button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: c.txtMute, fontSize: 13 }}>
          Загрузка...
        </div>
      ) : error ? (
        <div style={{
          padding: "14px 18px", borderRadius: 14,
          background: "rgba(239,68,68,0.08)", border: `1px solid rgba(239,68,68,0.22)`,
          color: c.red, fontSize: 13, fontWeight: 600,
        }}>{error}</div>
      ) : masters.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 24,
          padding: "56px 24px", textAlign: "center",
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 26,
            background: `linear-gradient(135deg, ${c.primarySft}, #DAD2F5)`,
            color: c.primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 18px",
            boxShadow: "0 12px 32px rgba(123, 97, 255, 0.25)",
          }}>
            <Ic d={I.user} size={34} sw={1.6} />
          </div>
          <h2 style={{
            fontSize: 20, fontWeight: 800, color: c.txtDark,
            margin: "0 0 6px", letterSpacing: "-0.02em",
          }}>Сначала добавьте мастеров</h2>
          <p style={{
            fontSize: 13, color: c.txtMute,
            maxWidth: 360, margin: "0 auto 22px", lineHeight: 1.55,
          }}>
            Чтобы установить расписание, перейдите в раздел «Мастера» и добавьте команду салона
          </p>
          <a
            href="/partner/masters"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "13px 24px", borderRadius: 12,
              background: c.primary, color: "#fff",
              textDecoration: "none", border: "none",
              fontSize: 14, fontWeight: 700,
              fontFamily: "var(--font-montserrat)",
              boxShadow: "0 8px 22px rgba(123, 97, 255, 0.32)",
              transition: "background 0.15s, transform 0.15s",
            }}
          >
            <Ic d={I.user} size={16} />
            К мастерам
          </a>
        </div>
      ) : (
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18,
          overflow: "hidden",
        }}>
          {/* Horizontal scroll container */}
          <div style={{ overflowX: "auto", overflowY: "visible" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: `200px repeat(7, minmax(120px, 1fr))`,
              minWidth: 940,
            }}>
              {/* Day headers row */}
              <div style={{
                position: "sticky", left: 0, zIndex: 2,
                background: c.bgSoft, borderBottom: `1px solid ${c.border}`,
                borderRight: `1px solid ${c.border}`,
                padding: "12px 16px",
                fontSize: 10, fontWeight: 700, color: c.txtMute,
                letterSpacing: "0.12em", textTransform: "uppercase",
                display: "flex", alignItems: "center",
              }}>Мастер</div>
              {weekDates.map((date, i) => {
                const [y, m, d] = date.split("-").map(Number);
                const dt = new Date(y, m - 1, d);
                const isToday = date === todayStr;
                const isWeekend = i >= 5;
                return (
                  <div key={date} style={{
                    padding: "12px 8px",
                    background: isToday ? c.primarySft : c.bgSoft,
                    borderBottom: `1px solid ${isToday ? c.primary : c.border}`,
                    borderBottomWidth: isToday ? 2 : 1,
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700,
                      color: isToday ? c.primary : isWeekend ? c.red : c.txtMute,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase", marginBottom: 2,
                    }}>{WEEKDAYS_SHORT[i]}</div>
                    <div style={{
                      fontSize: isToday ? 18 : 16,
                      fontWeight: isToday ? 800 : 700,
                      color: isToday ? c.primary : c.txtDark,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}>{dt.getDate()}</div>
                  </div>
                );
              })}

              {/* Master rows */}
              {masters.map((master, mi) => (
                <Row
                  key={master.id}
                  master={master}
                  weekDates={weekDates}
                  todayStr={todayStr}
                  slotByKey={slotByKey}
                  counts={counts}
                  onOpen={openCell}
                  isLast={mi === masters.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && masters.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 16, marginTop: 14,
          fontSize: 11, color: c.txtMute, fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: 4,
              background: c.primarySft, border: `1px solid ${c.primary}`,
            }} />
            Установлено
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block", width: 14, height: 14, borderRadius: 4,
              background: c.bg, border: `1px dashed ${c.border}`,
            }} />
            Выходной
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{
              padding: "1px 5px", borderRadius: 8,
              background: c.green, color: "#fff", fontSize: 9, fontWeight: 700,
            }}>2</span>
            Записей у мастера
          </div>
        </div>
      )}

      {/* Editor */}
      <ScheduleCellEditor
        open={editor.open}
        cell={editor.cell}
        onClose={() => setEditor(p => ({ ...p, open: false }))}
        onSaved={() => setRefreshKey(k => k + 1)}
        onDeleted={() => setRefreshKey(k => k + 1)}
      />
    </div>
  );
}

function Row({
  master, weekDates, todayStr, slotByKey, counts, onOpen, isLast,
}: {
  master: Master;
  weekDates: string[];
  todayStr: string;
  slotByKey: Map<string, Slot>;
  counts: Record<string, number>;
  onOpen: (m: Master, date: string) => void;
  isLast: boolean;
}) {
  const borderColor = c.border;
  const borderB = isLast ? "none" : `1px solid ${borderColor}`;

  return (
    <>
      {/* Master cell */}
      <div style={{
        position: "sticky", left: 0, zIndex: 1,
        background: c.bg,
        borderBottom: borderB,
        borderRight: `1px solid ${c.border}`,
        padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: master.photoUrl
            ? `url(${master.photoUrl}) center/cover`
            : gradientFor(master.fullName),
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 13, fontWeight: 800,
          flexShrink: 0,
          letterSpacing: "-0.02em",
          fontFamily: "var(--font-montserrat)",
          userSelect: "none",
        }}>
          {!master.photoUrl && initialsOf(master.fullName)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 13, fontWeight: 700, color: c.txtDark,
            letterSpacing: "-0.01em", lineHeight: 1.2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "var(--font-montserrat)",
          }}>{master.fullName}</div>
          <div style={{
            fontSize: 10, color: c.txtMute, marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontFamily: "var(--font-montserrat)",
          }}>{master.specialization.split(",")[0]?.trim()}</div>
        </div>
      </div>

      {/* Day cells */}
      {weekDates.map(date => {
        const slot = slotByKey.get(`${master.id}-${date}`);
        const count = counts[`${master.id}-${date}`] || 0;
        const isToday = date === todayStr;
        const isPast = date < todayStr;
        return (
          <button
            key={date} type="button"
            onClick={() => onOpen(master, date)}
            style={{
              border: "none",
              borderBottom: borderB,
              borderRight: `1px solid ${c.borderSoft}`,
              padding: "12px 8px",
              background: slot
                ? (isToday ? c.primarySft : c.bg)
                : (isToday ? "rgba(123,97,255,0.04)" : "transparent"),
              cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4, minHeight: 70,
              position: "relative",
              transition: "background 0.15s",
              fontFamily: "var(--font-montserrat)",
              opacity: isPast && !slot ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!slot) e.currentTarget.style.background = isToday ? "rgba(123,97,255,0.08)" : c.bgSoft;
              else e.currentTarget.style.background = isToday ? "#E8E0FE" : c.primarySft;
            }}
            onMouseLeave={e => {
              if (!slot) e.currentTarget.style.background = isToday ? "rgba(123,97,255,0.04)" : "transparent";
              else e.currentTarget.style.background = isToday ? c.primarySft : c.bg;
            }}
            aria-label={slot
              ? `${master.fullName} ${date}: ${slot.startTime}—${slot.endTime}`
              : `${master.fullName} ${date}: установить часы`}
          >
            {slot ? (
              <>
                <div style={{
                  padding: "5px 11px", borderRadius: 14,
                  background: c.primarySft, color: c.primary,
                  fontSize: 12, fontWeight: 700,
                  letterSpacing: "-0.005em",
                  border: `1px solid rgba(123,97,255,0.20)`,
                  whiteSpace: "nowrap",
                }}>
                  {formatRange(slot.startTime, slot.endTime)}
                </div>
                {count > 0 && (
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    padding: "1px 6px", borderRadius: 8,
                    background: c.green, color: "#fff",
                    fontSize: 9, fontWeight: 700,
                    letterSpacing: "0.02em",
                  }}>
                    <Ic d={I.cal} size={9} sw={2.5} />
                    {count}
                  </div>
                )}
              </>
            ) : (
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "transparent",
                border: `1.5px dashed ${c.border}`,
                color: c.txtMute,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}>
                <Ic d={I.plus} size={14} />
              </div>
            )}
          </button>
        );
      })}
    </>
  );
}
