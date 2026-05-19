"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import BranchEditor, { BranchData } from "@/components/partner/BranchEditor";
import AppointmentDetailModal, { Appointment, AppointmentService, AppointmentMaster } from "@/components/partner/AppointmentDetailModal";

function priceToNumber(p: string | null | undefined): number {
  if (!p) return 0;
  const digits = String(p).replace(/\D/g, "");
  return Number(digits) || 0;
}

// ── tokens ──
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

function Ic({ d, size = 22, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const PATHS = {
  cal:     "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  check:   "M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3",
  clock:   "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  xCirc:   "M12 22a10 10 0 100-20 10 10 0 000 20zM15 9l-6 6M9 9l6 6",
  arrowUp: "M7 17L17 7M7 7h10v10",
  user:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  shop:    "M3 9l1-5h16l1 5M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M8 14h8",
  chev:    "M9 18l6-6-6-6",
  chevDn:  "M6 9l6 6 6-6",
  plus:    "M12 5v14M5 12h14",
  check2:  "M20 6L9 17l-5-5",
  xMark:   "M18 6L6 18M6 6l12 12",
  pencil:  "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
};

// ───────────────── Filial selector (dropdown) ─────────────────
interface SalonInfo { name: string; city?: string; address?: string; phone?: string; description?: string; logoUrl?: string; }

function FilialSelector({
  salon, onEdit, onCreate,
}: {
  salon: SalonInfo | null;
  onEdit: () => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouse);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const name = salon?.name || "Мой салон";
  const addr = salon?.address && salon?.city ? `${salon.address}, ${salon.city}`
             : salon?.address || salon?.city || "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          width: "100%", textAlign: "left",
          background: c.bg,
          border: `1px solid ${open ? c.primary : c.border}`,
          borderRadius: 18, padding: 14,
          display: "flex", alignItems: "center", gap: 14,
          cursor: "pointer", fontFamily: "var(--font-montserrat)",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxShadow: open ? `0 0 0 4px ${c.primarySft}` : "0 0 0 0 transparent",
        }}
      >
        {salon?.logoUrl ? (
          <div style={{
            width: 50, height: 50, borderRadius: 14,
            backgroundImage: `url(${salon.logoUrl})`,
            backgroundSize: "cover", backgroundPosition: "center",
            border: `1px solid ${c.border}`,
            flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 50, height: 50, borderRadius: 14, background: c.primarySft,
            color: c.primary, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Ic d={PATHS.shop} size={22} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, color: c.txtMute, fontWeight: 700,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>Филиал</div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: c.txtDark, marginTop: 2,
            letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{name}</div>
          {addr && (
            <div style={{
              fontSize: 12, color: c.txtMute, marginTop: 1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{addr}</div>
          )}
        </div>
        <div style={{
          color: open ? c.primary : c.txtMute, flexShrink: 0,
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.22s cubic-bezier(0.32,0.72,0,1), color 0.2s",
        }}>
          <Ic d={PATHS.chevDn} size={18} />
        </div>
      </button>

      {/* Dropdown panel */}
      <div
        role="listbox"
        aria-label="Выбор филиала"
        style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
          boxShadow: open
            ? "0 18px 50px rgba(22,22,32,0.10), 0 4px 12px rgba(22,22,32,0.04)"
            : "none",
          padding: 6, zIndex: 30,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transform: open ? "translateY(0) scale(1)" : "translateY(-6px) scale(0.985)",
          transformOrigin: "top center",
          transition: "opacity 0.22s ease, transform 0.22s cubic-bezier(0.32,0.72,0,1), visibility 0.22s",
        }}
      >
        <div style={{
          fontSize: 9, color: c.txtMute, letterSpacing: "0.16em",
          textTransform: "uppercase", padding: "10px 14px 8px", fontWeight: 700,
        }}>
          Ваши филиалы
        </div>

        {/* Current branch — selected (click → edit) */}
        <button
          type="button"
          role="option"
          aria-selected="true"
          onClick={() => { setOpen(false); onEdit(); }}
          style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "10px 12px", borderRadius: 12,
            background: c.primarySft, border: "none", cursor: "pointer",
            fontFamily: "var(--font-montserrat)", textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#E8E2FC")}
          onMouseLeave={e => (e.currentTarget.style.background = c.primarySft)}
        >
          {salon?.logoUrl ? (
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              backgroundImage: `url(${salon.logoUrl})`,
              backgroundSize: "cover", backgroundPosition: "center",
              flexShrink: 0, boxShadow: "0 2px 6px rgba(123, 97, 255, 0.16)",
            }} />
          ) : (
            <div style={{
              width: 38, height: 38, borderRadius: 10, background: c.bg,
              color: c.primary, display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, boxShadow: "0 2px 6px rgba(123, 97, 255, 0.16)",
            }}>
              <Ic d={PATHS.shop} size={18} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: c.txtDark, letterSpacing: "-0.005em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{name}</div>
            {addr ? (
              <div style={{
                fontSize: 11, color: c.txtBody, marginTop: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{addr}</div>
            ) : (
              <div style={{ fontSize: 11, color: c.txtMute, marginTop: 1 }}>Текущий филиал</div>
            )}
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 11, background: c.primary,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ic d={PATHS.check2} size={12} />
            </div>
            <div style={{ color: c.txtMute }} aria-label="Редактировать">
              <Ic d={PATHS.pencil} size={14} />
            </div>
          </div>
        </button>

        {/* Separator */}
        <div style={{ height: 1, background: c.borderSoft, margin: "6px 14px" }} />

        {/* Add new branch */}
        <button
          type="button"
          onClick={() => { setOpen(false); onCreate(); }}
          style={{
            display: "flex", alignItems: "center", gap: 12, width: "100%",
            padding: "10px 12px", borderRadius: 12,
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: "var(--font-montserrat)", textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            border: `1.5px dashed ${c.primary}`, background: "transparent",
            color: c.primary, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Ic d={PATHS.plus} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c.primary, letterSpacing: "-0.005em" }}>
              Добавить филиал
            </div>
            <div style={{ fontSize: 11, color: c.txtMute, marginTop: 1 }}>
              Новая точка салона
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, { bg: string; color: string; label: string }> = {
    pending:   { bg: c.orangeSft, color: c.orange, label: "Ожидает" },
    confirmed: { bg: c.greenSft,  color: c.green,  label: "Подтверждено" },
    cancelled: { bg: c.redSft,    color: c.red,    label: "Отменено" },
    completed: { bg: c.borderSoft,color: c.txtBody,label: "Завершено" },
  };
  const s = m[status] || m.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: s.color, background: s.bg,
      padding: "5px 11px", borderRadius: 14, fontFamily: "var(--font-montserrat)",
      whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

function KpiCard({ icon, gradFrom, gradTo, shadow, value, label, delta, deltaColor }: {
  icon: string;
  gradFrom: string;
  gradTo: string;
  shadow: string;
  value: number | string;
  label: string;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div style={{
      position: "relative",
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 20,
      padding: "32px 8px 18px",
      textAlign: "center",
      minWidth: 0,
      boxShadow: "0 1px 3px rgba(22,22,32,0.03)",
    }}>
      {/* Floating gradient icon — overlaps top edge */}
      <div style={{
        position: "absolute",
        top: -22, left: "50%",
        transform: "translateX(-50%)",
        width: 48, height: 48, borderRadius: "50%",
        background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#FFFFFF",
        boxShadow: `0 10px 22px -4px ${shadow}, 0 3px 6px -1px rgba(22,22,32,0.06)`,
      }}>
        <Ic d={icon} size={22} sw={2.2} />
      </div>

      <div style={{
        fontSize: 30, fontWeight: 800, color: c.txtDark,
        letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 4,
        fontFamily: "var(--font-montserrat)",
      }}>{value}</div>
      <div style={{
        fontSize: 12, color: c.txtMute, fontFamily: "var(--font-montserrat)",
        marginBottom: delta ? 5 : 0,
      }}>{label}</div>
      {delta && (
        <div style={{
          fontSize: 11, fontWeight: 700, color: deltaColor,
          fontFamily: "var(--font-montserrat)", letterSpacing: "0.01em",
        }}>{delta}</div>
      )}
    </div>
  );
}

interface Stats { todayTotal: number; confirmed: number; cancelled: number; date: string; }
interface Service { id: number; name: string; price: string | null; duration: number | null; }
interface Master { id: number; fullName: string; specialization: string; photoUrl: string | null; }

export default function DashboardClient({ initialSalon }: { initialSalon: SalonInfo | null }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [bookings, setBookings] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [salon, setSalon] = useState<SalonInfo | null>(initialSalon);
  const [editor, setEditor] = useState<{ open: boolean; mode: "edit" | "create" }>({ open: false, mode: "edit" });
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch("/api/partner/dashboard").then(r => r.json()).then(d => { if (!d.error) setStats(d); });
    fetch("/api/partner/bookings").then(r => r.json()).then(d => Array.isArray(d) && setBookings(d));
    fetch("/api/partner/services").then(r => r.json()).then(d => Array.isArray(d) && setServices(d));
    fetch("/api/partner/masters").then(r => r.json()).then(d => Array.isArray(d) && setMasters(d));
  }, [refreshKey]);

  // Profile fetched separately so it can refresh after edit
  useEffect(() => {
    fetch("/api/partner/profile").then(r => r.json()).then(d => { if (d && !d.error) setSalon(d); }).catch(() => {});
  }, [refreshKey]);

  const total     = stats?.todayTotal ?? 0;
  const confirmed = stats?.confirmed  ?? 0;
  const cancelled = stats?.cancelled  ?? 0;
  const pending   = Math.max(0, total - confirmed - cancelled);

  const pct = (n: number) => total > 0 ? Math.round(n / total * 100) : 0;

  // Revenue: parse digits from "1500 ₽" strings and exclude cancelled bookings
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();
  const todayBookings = bookings.filter(b => b.appointmentDate === today);
  const revenue = todayBookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + priceToNumber(services.find(x => x.id === b.serviceId)?.price), 0);

  const upcomingToday = todayBookings
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 4);

  const detailService = detail ? services.find(s => s.id === detail.serviceId) || null : null;
  const detailMaster = detail ? masters.find(m => m.id === detail.masterId) || null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Filial selector dropdown */}
      <FilialSelector
        salon={salon}
        onEdit={() => setEditor({ open: true, mode: "edit" })}
        onCreate={() => setEditor({ open: true, mode: "create" })}
      />

      {/* Branch editor modal */}
      <BranchEditor
        open={editor.open}
        mode={editor.mode}
        initial={editor.mode === "edit" ? (salon as BranchData) : null}
        onClose={() => setEditor(p => ({ ...p, open: false }))}
        onSaved={() => setRefreshKey(k => k + 1)}
      />

      {/* Appointment detail modal */}
      <AppointmentDetailModal
        open={!!detail}
        appointment={detail}
        service={detailService as AppointmentService | null}
        master={detailMaster as AppointmentMaster | null}
        onClose={() => setDetail(null)}
        onChanged={() => setRefreshKey(k => k + 1)}
      />

      {/* KPI grid — 3 cards with floating icons */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 10,
        marginTop: 16, // extra room for floating icons that overlap the top edge
      }}>
        <KpiCard
          icon={PATHS.cal}
          gradFrom="#9B85FF" gradTo={c.primary}
          shadow="rgba(123, 97, 255, 0.40)"
          value={total} label="Записей"
          delta={total > 0 ? `+${total} сегодня` : "—"} deltaColor={c.primary}
        />
        <KpiCard
          icon={PATHS.check2}
          gradFrom="#36C77E" gradTo={c.green}
          shadow="rgba(31, 180, 106, 0.36)"
          value={confirmed} label="Подтверждено"
          delta={`${pct(confirmed)}%`} deltaColor={c.green}
        />
        <KpiCard
          icon={PATHS.xMark}
          gradFrom="#F87171" gradTo={c.red}
          shadow="rgba(239, 68, 68, 0.34)"
          value={cancelled} label="Отменено"
          delta={`${pct(cancelled)}%`} deltaColor={c.red}
        />
      </div>

      {/* Revenue card with mini chart */}
      <div style={{
        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18,
        padding: "18px 18px 14px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: c.txtMute, fontFamily: "var(--font-montserrat)" }}>
            Выручка за сегодня
          </div>
          <div style={{
            fontSize: 30, fontWeight: 800, color: c.txtDark,
            letterSpacing: "-0.03em", marginTop: 4, fontFamily: "var(--font-montserrat)",
          }}>
            ₽ {revenue.toLocaleString("ru-RU")}
          </div>
          {revenue > 0 && (
            <div style={{
              fontSize: 12, fontWeight: 700, color: c.green, marginTop: 4,
              display: "inline-flex", alignItems: "center", gap: 4,
              fontFamily: "var(--font-montserrat)",
            }}>
              <Ic d={PATHS.arrowUp} size={13} />
              за {todayBookings.length} {todayBookings.length === 1 ? "запись" : todayBookings.length < 5 ? "записи" : "записей"}
            </div>
          )}
        </div>
        {/* Mini chart SVG */}
        <svg width="140" height="64" viewBox="0 0 140 64" style={{ marginRight: -4, flexShrink: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.primary} stopOpacity="0.28" />
              <stop offset="100%" stopColor={c.primary} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,52 C18,48 26,40 42,38 C58,36 68,32 84,22 C100,12 116,10 140,4 L140,64 L0,64 Z"
            fill="url(#revGrad)"
          />
          <path
            d="M0,52 C18,48 26,40 42,38 C58,36 68,32 84,22 C100,12 116,10 140,4"
            fill="none" stroke={c.primary} strokeWidth="2.5" strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Today's appointments */}
      <div style={{ marginTop: 4 }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginBottom: 10, padding: "0 2px",
        }}>
          <h2 style={{
            fontSize: 17, fontWeight: 800, color: c.txtDark,
            letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-montserrat)",
          }}>Сегодня</h2>
          <Link href="/partner/bookings" style={{
            fontSize: 13, color: c.primary, fontWeight: 600,
            textDecoration: "none", fontFamily: "var(--font-montserrat)",
          }}>Смотреть все →</Link>
        </div>

        {upcomingToday.length === 0 ? (
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18,
            padding: "36px 20px", textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{
              fontSize: 15, fontWeight: 700, color: c.txtDark, marginBottom: 4,
              fontFamily: "var(--font-montserrat)",
            }}>Записей сегодня нет</div>
            <div style={{ fontSize: 12, color: c.txtMute, fontFamily: "var(--font-montserrat)" }}>
              Поделитесь ссылкой на запись с клиентами
            </div>
          </div>
        ) : (
          <div style={{
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 18,
            overflow: "hidden",
          }}>
            {upcomingToday.map((b, i) => {
              const service = services.find(s => s.id === b.serviceId);
              const dotColor = b.status === "pending" ? c.orange : c.primary;
              return (
                <button
                  key={b.id} type="button"
                  onClick={() => setDetail(b)}
                  aria-label={`Открыть запись: ${b.clientName} в ${b.startTime}`}
                  style={{
                    width: "100%", textAlign: "left", background: c.bg, border: "none",
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "14px 16px",
                    borderBottom: i < upcomingToday.length - 1 ? `1px solid ${c.borderSoft}` : "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-montserrat)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
                  onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
                >
                  <div style={{
                    fontSize: 15, fontWeight: 800, color: c.txtDark,
                    minWidth: 50, letterSpacing: "-0.02em",
                  }}>{b.startTime}</div>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0,
                  }} />
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: c.borderSoft, display: "flex", alignItems: "center",
                    justifyContent: "center", color: c.txtMute, flexShrink: 0,
                  }}>
                    <Ic d={PATHS.user} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: c.txtDark,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{service?.name || "Услуга"}</div>
                    <div style={{
                      fontSize: 12, color: c.txtMute, marginTop: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{b.clientName}</div>
                  </div>
                  <StatusBadge status={b.status} />
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
