"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import AppointmentDetailModal, { Appointment, AppointmentService, AppointmentMaster } from "@/components/partner/AppointmentDetailModal";

export interface Booking {
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
export interface ServiceLite { id: number; name: string; price: string | null; duration: number | null; }
export interface MasterLite  { id: number; fullName: string; specialization: string; photoUrl: string | null; }

// ── design tokens ──
const c = {
  bg:          "#FFFFFF",
  bgSoft:      "#F7F7FA",
  border:      "#ECECF0",
  borderSoft:  "#F2F2F6",
  primary:     "#7B61FF",
  primarySft:  "#F0EDFE",
  green:       "#1FB46A",
  greenSft:    "#E3F8EE",
  orange:      "#FF9500",
  orangeSft:   "#FFF1DE",
  red:         "#EF4444",
  redSft:      "#FCE5E5",
  txtDark:     "#161620",
  txtBody:     "#5F6577",
  txtMute:     "#9AA0B0",
};

const PATHS = {
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  cal:    "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  chev:   "M9 18l6-6-6-6",
  x:      "M18 6L6 18M6 6l12 12",
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
  pending:   { label: "Ожидает",   color: c.orange,  bg: c.orangeSft },
  confirmed: { label: "Подтв.",    color: c.green,   bg: c.greenSft  },
  cancelled: { label: "Отменена",  color: c.red,     bg: c.redSft    },
  completed: { label: "Завершена", color: c.txtBody, bg: c.borderSoft},
};

const WD_SHORT = ["вс","пн","вт","ср","чт","пт","сб"];
const WD_FULL  = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];
const MONTHS_FULL = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];

function toLocalIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateLong(iso: string): string {
  const d = parseIsoDate(iso);
  return `${WD_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_FULL[d.getMonth()]}`;
}
function priceToNumber(p: string | null | undefined): number {
  if (!p) return 0;
  return Number(String(p).replace(/\D/g, "")) || 0;
}

// ───────────────── Date strip ─────────────────
function DateStrip({ selectedIso, todayIso, onChange }: {
  selectedIso: string | null;
  todayIso: string;
  onChange: (iso: string | null) => void;
}) {
  const today = parseIsoDate(todayIso);
  const days: { iso: string; date: Date; isToday: boolean }[] = [];
  for (let offset = -7; offset <= 14; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    days.push({ iso: toLocalIso(d), date: d, isToday: offset === 0 });
  }

  const scrollerRef = useRef<HTMLDivElement>(null);
  const todayBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const btn = todayBtnRef.current;
    const scroller = scrollerRef.current;
    if (!btn || !scroller) return;
    const offset = btn.offsetLeft - scroller.clientWidth / 2 + btn.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
  }, []);

  return (
    <div ref={scrollerRef} style={{
      display: "flex", gap: 6, overflowX: "auto",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      padding: "2px 0 6px",
      WebkitOverflowScrolling: "touch",
    } as React.CSSProperties} className="bb-no-scrollbar">
      <button type="button" onClick={() => onChange(null)}
        style={{
          flexShrink: 0, minWidth: 64, height: 64,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 4, padding: "8px 14px",
          background: selectedIso === null ? c.primary : c.bg,
          color: selectedIso === null ? "#fff" : c.txtDark,
          border: `1px solid ${selectedIso === null ? c.primary : c.border}`,
          borderRadius: 14, cursor: "pointer",
          fontFamily: "var(--font-montserrat)", fontWeight: 700,
          transition: "background 0.18s, border-color 0.18s, color 0.18s",
          boxShadow: selectedIso === null ? "0 6px 18px -4px rgba(123,97,255,0.45)" : "none",
        }}>
        <Ic d={PATHS.cal} size={16} />
        <span style={{ fontSize: 11, letterSpacing: "0.02em" }}>Все</span>
      </button>

      {days.map(d => {
        const sel = selectedIso === d.iso;
        return (
          <button key={d.iso} type="button"
            ref={d.isToday ? todayBtnRef : undefined}
            onClick={() => onChange(d.iso)}
            style={{
              flexShrink: 0, position: "relative",
              width: 56, height: 64,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 2, padding: "8px 6px",
              background: sel ? c.primary : c.bg,
              color: sel ? "#fff" : c.txtDark,
              border: `1px solid ${sel ? c.primary : c.border}`,
              borderRadius: 14, cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
              transition: "background 0.18s, border-color 0.18s, color 0.18s",
              boxShadow: sel ? "0 6px 18px -4px rgba(123,97,255,0.45)" : "none",
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = c.bgSoft; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.background = c.bg; }}
          >
            <span style={{
              fontSize: 10, fontWeight: 700,
              letterSpacing: "0.08em", textTransform: "uppercase",
              color: sel ? "rgba(255,255,255,0.85)" : c.txtMute,
            }}>{WD_SHORT[d.date.getDay()]}</span>
            <span style={{
              fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em",
              fontFeatureSettings: '"tnum" 1',
            }}>{d.date.getDate()}</span>
            {d.isToday && (
              <span style={{
                position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                width: 4, height: 4, borderRadius: "50%",
                background: sel ? "#fff" : c.primary,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────── Status filter ─────────────────
const STATUS_FILTERS = [
  { key: "all",       label: "Все" },
  { key: "pending",   label: "Ожидают" },
  { key: "confirmed", label: "Подтв." },
  { key: "cancelled", label: "Отменены" },
] as const;
type StatusKey = typeof STATUS_FILTERS[number]["key"];

function StatusFilter({ value, onChange, counts }: {
  value: StatusKey;
  onChange: (k: StatusKey) => void;
  counts: Record<string, number>;
}) {
  return (
    <div style={{
      display: "flex", gap: 6, overflowX: "auto",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      padding: "2px 0",
      WebkitOverflowScrolling: "touch",
    } as React.CSSProperties} className="bb-no-scrollbar">
      {STATUS_FILTERS.map(s => {
        const sel = value === s.key;
        const count = s.key === "all" ? counts.all : (counts[s.key] || 0);
        const meta = s.key !== "all" ? STATUS_META[s.key] : null;
        const selBg   = meta?.color ?? c.primary;
        const idleTxt = meta?.color ?? c.txtDark;
        return (
          <button key={s.key} type="button" onClick={() => onChange(s.key)}
            style={{
              flexShrink: 0,
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "9px 14px", borderRadius: 11,
              background: sel ? selBg : c.bg,
              color: sel ? "#fff" : idleTxt,
              border: `1px solid ${sel ? selBg : c.border}`,
              cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
              fontSize: 13, fontWeight: 700, letterSpacing: "-0.005em",
              transition: "background 0.16s, border-color 0.16s, color 0.16s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => { if (!sel) e.currentTarget.style.background = c.bgSoft; }}
            onMouseLeave={e => { if (!sel) e.currentTarget.style.background = c.bg; }}
          >
            {s.label}
            <span style={{
              minWidth: 22, padding: "0 6px", height: 20, borderRadius: 10,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800,
              background: sel ? "rgba(255,255,255,0.25)" : (meta?.bg ?? c.borderSoft),
              color: sel ? "#fff" : (meta?.color ?? c.txtBody),
              fontFeatureSettings: '"tnum" 1',
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────────────── KPI mini ─────────────────
function Kpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14,
      padding: 14, flex: 1, minWidth: 0,
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <div style={{
        fontSize: 10, color: c.txtMute, fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        fontFamily: "var(--font-montserrat)",
      }}>{label}</div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: accent, letterSpacing: "-0.025em",
        fontFamily: "var(--font-montserrat)", fontFeatureSettings: '"tnum" 1',
      }}>{value}</div>
    </div>
  );
}

// ───────────────── Booking card ─────────────────
function BookingCard({ b, service, master, onClick }: {
  b: Booking;
  service: ServiceLite | undefined;
  master: MasterLite | undefined;
  onClick: () => void;
}) {
  const meta = STATUS_META[b.status] || STATUS_META.pending;
  const cancelled = b.status === "cancelled";
  return (
    <button type="button" onClick={onClick}
      style={{
        width: "100%", textAlign: "left", border: "none",
        background: c.bg, padding: 0, cursor: "pointer",
        fontFamily: "var(--font-montserrat)",
        display: "flex", alignItems: "stretch", gap: 0,
        transition: "background 0.15s",
        opacity: cancelled ? 0.6 : 1,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
      onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
    >
      <div style={{
        flexShrink: 0, width: 72,
        padding: "16px 0 14px", textAlign: "center",
        borderRight: `1px solid ${c.borderSoft}`,
      }}>
        <div style={{
          fontSize: 18, fontWeight: 800, color: c.txtDark,
          letterSpacing: "-0.02em", fontFeatureSettings: '"tnum" 1',
          textDecoration: cancelled ? "line-through" : "none",
        }}>{b.startTime}</div>
        {b.endTime && (
          <div style={{
            fontSize: 11, color: c.txtMute, marginTop: 1,
            fontFeatureSettings: '"tnum" 1',
          }}>до {b.endTime}</div>
        )}
      </div>

      <div style={{
        flex: 1, minWidth: 0, padding: "14px 14px 12px",
        display: "flex", flexDirection: "column", gap: 4,
      }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {service?.name || "Услуга"}
        </div>
        <div style={{
          fontSize: 12, color: c.txtBody,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          <span style={{ fontWeight: 600 }}>{b.clientName}</span>
          {master && <span style={{ color: c.txtMute }}> · {master.fullName}</span>}
        </div>
      </div>

      <div style={{
        flexShrink: 0, padding: "14px 14px 12px",
        display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg,
          padding: "4px 9px", borderRadius: 10, letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}>{meta.label}</span>
        <span style={{ color: c.txtMute }}>
          <Ic d={PATHS.chev} size={14} />
        </span>
      </div>
    </button>
  );
}

// ───────────────── Empty state ─────────────────
function EmptyState({ search, selectedIso, statusFilter }: {
  search: string;
  selectedIso: string | null;
  statusFilter: StatusKey;
}) {
  let title = "Записей нет";
  let hint  = "Поделитесь ссылкой на запись с клиентами — записи появятся здесь.";
  let emoji = "📭";

  if (search) {
    title = "Ничего не найдено";
    hint  = `По запросу «${search}» записей нет. Попробуйте другое имя, телефон или услугу.`;
    emoji = "🔍";
  } else if (statusFilter !== "all") {
    const lbl = STATUS_FILTERS.find(s => s.key === statusFilter)?.label.toLowerCase();
    title = `Нет записей в статусе «${lbl}»`;
    hint  = "Снимите фильтр чтобы увидеть остальные записи.";
    emoji = "✨";
  } else if (selectedIso) {
    title = "На этот день записей нет";
    hint  = "Выберите другую дату или вкладку «Все».";
    emoji = "🗓️";
  }

  return (
    <div style={{
      background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
      padding: "40px 24px 36px", textAlign: "center",
      fontFamily: "var(--font-montserrat)",
    }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{emoji}</div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: c.txtDark, marginBottom: 6,
        letterSpacing: "-0.01em",
      }}>{title}</div>
      <div style={{
        fontSize: 13, color: c.txtMute, maxWidth: 320, margin: "0 auto", lineHeight: 1.5,
      }}>{hint}</div>
    </div>
  );
}

// ───────────────── Main ─────────────────
export default function BookingsClient({ initialBookings, services, masters, todayIso }: {
  initialBookings: Booking[];
  services: ServiceLite[];
  masters: MasterLite[];
  todayIso: string;
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [selectedIso, setSelectedIso] = useState<string | null>(todayIso);
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Booking | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh from API after a cancel via the detail modal
  useEffect(() => {
    if (refreshKey === 0) return;
    fetch("/api/partner/bookings")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setBookings(d); })
      .catch(() => {});
  }, [refreshKey]);

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

  // Date-scoped subset (drives KPIs + status counts)
  const dateScoped = useMemo(() => {
    if (selectedIso === null) return bookings;
    return bookings.filter(b => b.appointmentDate === selectedIso);
  }, [bookings, selectedIso]);

  const kpi = useMemo(() => {
    let total = 0, confirmed = 0, pending = 0;
    for (const b of dateScoped) {
      if (b.status === "cancelled") continue;
      total += 1;
      if (b.status === "confirmed") confirmed += 1;
      if (b.status === "pending")   pending   += 1;
    }
    return { total, confirmed, pending };
  }, [dateScoped]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: dateScoped.length, pending: 0, confirmed: 0, cancelled: 0, completed: 0,
    };
    for (const b of dateScoped) counts[b.status] = (counts[b.status] || 0) + 1;
    return counts;
  }, [dateScoped]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dateScoped
      .filter(b => statusFilter === "all" || b.status === statusFilter)
      .filter(b => {
        if (!q) return true;
        const svc = serviceMap.get(b.serviceId)?.name?.toLowerCase() || "";
        const mst = masterMap.get(b.masterId)?.fullName?.toLowerCase() || "";
        return (
          b.clientName.toLowerCase().includes(q) ||
          (b.clientPhone || "").toLowerCase().includes(q) ||
          svc.includes(q) ||
          mst.includes(q)
        );
      })
      .sort((a, b) => {
        if (a.appointmentDate !== b.appointmentDate) {
          return selectedIso === null
            ? b.appointmentDate.localeCompare(a.appointmentDate)
            : a.appointmentDate.localeCompare(b.appointmentDate);
        }
        return a.startTime.localeCompare(b.startTime);
      });
  }, [dateScoped, statusFilter, search, selectedIso, serviceMap, masterMap]);

  const groups = useMemo(() => {
    if (selectedIso !== null) return [{ iso: selectedIso, items: visible }];
    const map = new Map<string, Booking[]>();
    visible.forEach(b => {
      const arr = map.get(b.appointmentDate) || [];
      arr.push(b);
      map.set(b.appointmentDate, arr);
    });
    return Array.from(map.entries()).map(([iso, items]) => ({ iso, items }));
  }, [visible, selectedIso]);

  const subtitle = selectedIso === null
    ? `${bookings.length} ${bookings.length === 1 ? "запись" : bookings.length < 5 ? "записи" : "записей"} всего`
    : formatDateLong(selectedIso);

  const detailService = detail ? (serviceMap.get(detail.serviceId) || null) : null;
  const detailMaster  = detail ? (masterMap.get(detail.masterId)  || null) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`.bb-no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

      <div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
          letterSpacing: "-0.025em", fontFamily: "var(--font-montserrat)",
        }}>Записи</h1>
        <div style={{
          fontSize: 13, color: c.txtMute, marginTop: 4,
          fontFamily: "var(--font-montserrat)",
        }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Kpi label="Всего"  value={kpi.total}     accent={c.primary} />
        <Kpi label="Подтв." value={kpi.confirmed} accent={c.green}   />
        <Kpi label="Ждут"   value={kpi.pending}   accent={c.orange}  />
      </div>

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
          placeholder="Клиент, телефон, услуга или мастер"
          aria-label="Поиск по записям"
          style={{
            width: "100%", height: 44,
            padding: "0 40px 0 40px",
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12,
            fontFamily: "var(--font-montserrat)",
            fontSize: 14, color: c.txtDark,
            outline: "none", transition: "border-color 0.18s, box-shadow 0.18s",
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
              color: c.txtBody, transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = c.border)}
            onMouseLeave={e => (e.currentTarget.style.background = c.borderSoft)}
          >
            <Ic d={PATHS.x} size={13} />
          </button>
        )}
      </div>

      <DateStrip selectedIso={selectedIso} todayIso={todayIso} onChange={setSelectedIso} />
      <StatusFilter value={statusFilter} onChange={setStatusFilter} counts={statusCounts} />

      {visible.length === 0 ? (
        <EmptyState search={search} selectedIso={selectedIso} statusFilter={statusFilter} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {groups.map(group => (
            <div key={group.iso} style={{
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
              overflow: "hidden",
            }}>
              {selectedIso === null && (
                <div style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${c.borderSoft}`,
                  background: c.bgSoft,
                  fontSize: 12, fontWeight: 700, color: c.txtBody,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  fontFamily: "var(--font-montserrat)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {formatDateLong(group.iso)}
                  {group.iso === todayIso && (
                    <span style={{
                      padding: "2px 8px", borderRadius: 8,
                      background: c.primarySft, color: c.primary, fontSize: 10,
                      textTransform: "none", letterSpacing: 0, fontWeight: 700,
                    }}>сегодня</span>
                  )}
                </div>
              )}
              {group.items.map((b, idx) => (
                <div key={b.id} style={{
                  borderBottom: idx < group.items.length - 1 ? `1px solid ${c.borderSoft}` : "none",
                }}>
                  <BookingCard b={b}
                    service={serviceMap.get(b.serviceId)}
                    master={masterMap.get(b.masterId)}
                    onClick={() => setDetail(b)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {bookings.length >= 200 && (
        <div style={{
          padding: "10px 14px", borderRadius: 11,
          background: c.bgSoft, border: `1px solid ${c.border}`,
          fontSize: 12, color: c.txtMute, fontFamily: "var(--font-montserrat)",
        }}>
          Показано 200 последних записей. Выберите более раннюю дату для просмотра старых.
        </div>
      )}

      <AppointmentDetailModal
        open={!!detail}
        appointment={detail as Appointment | null}
        service={detailService as AppointmentService | null}
        master={detailMaster as AppointmentMaster | null}
        onClose={() => setDetail(null)}
        onChanged={() => setRefreshKey(k => k + 1)}
      />
    </div>
  );
}
