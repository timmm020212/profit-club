"use client";
import { useMemo, useState } from "react";
import ClientDetailModal, { ClientSummaryLite, ClientVisit } from "@/components/partner/ClientDetailModal";

export type ClientStatus = "vip" | "regular" | "new" | "sleeping" | "lost";

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

export interface ClientSummary {
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
  status: ClientStatus;
  topMasterId: number | null;
  topServiceId: number | null;
}

const c = {
  bg:         "#FFFFFF",
  bgSoft:     "#F7F7FA",
  border:     "#ECECF0",
  borderSoft: "#F2F2F6",
  primary:    "#7B61FF",
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

const PATHS = {
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  x:      "M18 6L6 18M6 6l12 12",
  sort:   "M3 6h13M3 12h9M3 18h5M21 7v14m0-14l-3 3m3-3l3 3",
  chev:   "M9 18l6-6-6-6",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
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

const STATUS_META: Record<ClientStatus, { label: string; color: string; bg: string }> = {
  vip:      { label: "VIP",         color: c.primary, bg: c.primarySft },
  regular:  { label: "Постоянный",  color: c.green,   bg: c.greenSft  },
  new:      { label: "Новый",       color: c.blue,    bg: c.blueSft   },
  sleeping: { label: "Спящий",      color: c.orange,  bg: c.orangeSft },
  lost:     { label: "Потерян",     color: c.red,     bg: c.redSft    },
};

const STATUS_FILTERS = [
  { key: "all",      label: "Все" },
  { key: "vip",      label: "VIP" },
  { key: "regular",  label: "Постоянные" },
  { key: "new",      label: "Новые" },
  { key: "sleeping", label: "Спящие" },
  { key: "lost",     label: "Потеряны" },
] as const;
type StatusFilterKey = typeof STATUS_FILTERS[number]["key"];

const SORT_OPTIONS = [
  { key: "lastVisit",  label: "По дате"    },
  { key: "totalSpent" as const, label: "По выручке" },
  { key: "visitCount" as const, label: "По визитам" },
] as const;
type SortKey = typeof SORT_OPTIONS[number]["key"];

const MONTHS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateShort(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
function daysAgoLabel(days: number): string {
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 7)   return `${days} дн.`;
  if (days < 30)  return `${Math.floor(days / 7)} нед.`;
  if (days < 365) return `${Math.floor(days / 30)} мес.`;
  return `${Math.floor(days / 365)} г.`;
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
function priceToNumber(p: string | null | undefined): number {
  if (!p) return 0;
  return Number(String(p).replace(/\D/g, "")) || 0;
}
function normalizePhone(p: string | null | undefined): string {
  if (!p) return "";
  return String(p).replace(/\D/g, "");
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent: string }) {
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
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{value}</div>
    </div>
  );
}

function ClientCard({ c: client, onClick }: { c: ClientSummary; onClick: () => void }) {
  const meta = STATUS_META[client.status];
  return (
    <button type="button" onClick={onClick}
      style={{
        width: "100%", textAlign: "left", border: "none",
        background: c.bg, padding: "14px 14px", cursor: "pointer",
        fontFamily: "var(--font-montserrat)",
        display: "flex", alignItems: "center", gap: 12,
        transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
      onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
    >
      {/* Avatar */}
      <div style={{
        width: 48, height: 48, borderRadius: "50%",
        background: gradientFor(client.name),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 16, fontWeight: 800,
        fontFamily: "var(--font-montserrat)", letterSpacing: "-0.02em",
        flexShrink: 0,
        boxShadow: "0 6px 16px -4px rgba(22,22,32,0.18)",
      }}>{initialsOf(client.name)}</div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 2,
        }}>
          <span style={{
            fontSize: 14, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{client.name}</span>
          <span style={{
            flexShrink: 0,
            fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg,
            padding: "3px 8px", borderRadius: 8, letterSpacing: "0.02em",
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            {client.status === "vip" && <Ic d={PATHS.star} size={10} />}
            {meta.label}
          </span>
        </div>
        <div style={{
          fontSize: 12, color: c.txtBody,
          display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
          fontFeatureSettings: '"tnum" 1',
        }}>
          <span style={{ fontWeight: 700, color: c.txtDark }}>{client.visitCount} визит{client.visitCount === 1 ? "" : client.visitCount < 5 ? "а" : "ов"}</span>
          {client.totalSpent > 0 && (
            <span style={{ color: c.txtMute }}>· {client.totalSpent.toLocaleString("ru-RU")} ₽</span>
          )}
          {client.avgTicket > 0 && (
            <span style={{ color: c.txtMute }}>· ср. {client.avgTicket.toLocaleString("ru-RU")} ₽</span>
          )}
        </div>
        <div style={{
          fontSize: 11, color: c.txtMute, marginTop: 4,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span>Последний: {formatDateShort(client.lastVisit)}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, color: c.txtBody, background: c.borderSoft,
            padding: "2px 6px", borderRadius: 6, letterSpacing: "0.02em",
          }}>{daysAgoLabel(client.daysSinceLastVisit)}</span>
        </div>
      </div>

      <span style={{ color: c.txtMute, flexShrink: 0 }}>
        <Ic d={PATHS.chev} size={16} />
      </span>
    </button>
  );
}

export default function ClientsClient({ summaries, bookings, services, masters, todayIso }: {
  summaries: ClientSummary[];
  bookings: Booking[];
  services: ServiceLite[];
  masters: MasterLite[];
  todayIso: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [selected, setSelected] = useState<string | null>(null);

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: summaries.length, vip: 0, regular: 0, new: 0, sleeping: 0, lost: 0 };
    for (const s of summaries) counts[s.status] = (counts[s.status] || 0) + 1;
    return counts;
  }, [summaries]);

  const kpi = useMemo(() => {
    let active = 0, sleeping = 0;
    let revenue = 0;
    for (const s of summaries) {
      if (s.status === "vip" || s.status === "regular" || s.status === "new") active += 1;
      if (s.status === "sleeping" || s.status === "lost") sleeping += 1;
      revenue += s.totalSpent;
    }
    return { total: summaries.length, active, sleeping, revenue };
  }, [summaries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = normalizePhone(search);
    const arr = summaries
      .filter(s => statusFilter === "all" || s.status === statusFilter)
      .filter(s => {
        if (!q) return true;
        if (s.name.toLowerCase().includes(q)) return true;
        if (qDigits && normalizePhone(s.phone).includes(qDigits)) return true;
        return false;
      });
    arr.sort((a, b) => {
      switch (sortKey) {
        case "totalSpent": return b.totalSpent - a.totalSpent;
        case "visitCount": return b.visitCount - a.visitCount;
        case "lastVisit":
        default:           return b.lastVisit.localeCompare(a.lastVisit);
      }
    });
    return arr;
  }, [summaries, statusFilter, search, sortKey]);

  // For the detail modal — build ClientSummaryLite (with topMasterName/Service) + visits
  const selectedClient = useMemo<ClientSummaryLite | null>(() => {
    if (!selected) return null;
    const s = summaries.find(x => x.identifier === selected);
    if (!s) return null;

    const topMasterName = s.topMasterId ? (masterMap.get(s.topMasterId)?.fullName || null) : null;
    const topServiceName = s.topServiceId ? (serviceMap.get(s.topServiceId)?.name || null) : null;

    // Recompute counts for the favourites tooltip (using bookings)
    let topMasterCount = 0, topServiceCount = 0;
    if (s.topMasterId || s.topServiceId) {
      const phoneKey = normalizePhone(s.phone);
      const nameKey = `n:${s.name.toLowerCase().trim()}`;
      for (const b of bookings) {
        if (b.status === "cancelled") continue;
        const bKey = normalizePhone(b.clientPhone) || `n:${b.clientName.toLowerCase().trim()}`;
        if (bKey !== (phoneKey || nameKey)) continue;
        if (s.topMasterId && b.masterId === s.topMasterId) topMasterCount += 1;
        if (s.topServiceId && b.serviceId === s.topServiceId) topServiceCount += 1;
      }
    }

    return { ...s, topMasterName, topServiceName, topMasterCount, topServiceCount };
  }, [selected, summaries, masterMap, serviceMap, bookings]);

  const selectedVisits = useMemo<ClientVisit[]>(() => {
    if (!selected) return [];
    const s = summaries.find(x => x.identifier === selected);
    if (!s) return [];
    const phoneKey = normalizePhone(s.phone);
    const nameKey = `n:${s.name.toLowerCase().trim()}`;
    const matchKey = phoneKey || nameKey;
    return bookings
      .filter(b => (normalizePhone(b.clientPhone) || `n:${b.clientName.toLowerCase().trim()}`) === matchKey)
      .map(b => ({
        id: b.id,
        appointmentDate: b.appointmentDate,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        serviceId: b.serviceId,
        masterId: b.masterId,
        serviceName: serviceMap.get(b.serviceId)?.name || "Услуга",
        masterName: masterMap.get(b.masterId)?.fullName || "Мастер",
        price: priceToNumber(serviceMap.get(b.serviceId)?.price),
      }));
  }, [selected, summaries, bookings, serviceMap, masterMap]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`.bb-no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

      <div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
          letterSpacing: "-0.025em", fontFamily: "var(--font-montserrat)",
        }}>Клиенты</h1>
        <div style={{
          fontSize: 13, color: c.txtMute, marginTop: 4,
          fontFamily: "var(--font-montserrat)", fontFeatureSettings: '"tnum" 1',
        }}>
          {kpi.total} клиент{kpi.total === 1 ? "" : kpi.total < 5 ? "а" : "ов"}
          {kpi.revenue > 0 && <> · {kpi.revenue.toLocaleString("ru-RU")} ₽ суммарно</>}
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "flex", gap: 8 }}>
        <Kpi label="Всего"   value={kpi.total}    accent={c.primary} />
        <Kpi label="Активны" value={kpi.active}   accent={c.green}   />
        <Kpi label="Спящих"  value={kpi.sleeping} accent={c.orange}  />
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
          placeholder="Имя или телефон"
          aria-label="Поиск по клиентам"
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
              color: c.txtBody,
            }}
          >
            <Ic d={PATHS.x} size={13} />
          </button>
        )}
      </div>

      {/* Status filter */}
      <div style={{
        display: "flex", gap: 6, overflowX: "auto",
        scrollbarWidth: "none", msOverflowStyle: "none",
        padding: "2px 0",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties} className="bb-no-scrollbar">
        {STATUS_FILTERS.map(s => {
          const sel = statusFilter === s.key;
          const cnt = s.key === "all" ? statusCounts.all : (statusCounts[s.key] || 0);
          const meta = s.key !== "all" ? STATUS_META[s.key as ClientStatus] : null;
          const selBg = meta?.color ?? c.primary;
          return (
            <button key={s.key} type="button" onClick={() => setStatusFilter(s.key)}
              style={{
                flexShrink: 0,
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "9px 14px", borderRadius: 11,
                background: sel ? selBg : c.bg,
                color: sel ? "#fff" : (meta?.color ?? c.txtDark),
                border: `1px solid ${sel ? selBg : c.border}`,
                cursor: "pointer",
                fontFamily: "var(--font-montserrat)",
                fontSize: 13, fontWeight: 700, letterSpacing: "-0.005em",
                whiteSpace: "nowrap",
                transition: "background 0.16s, border-color 0.16s, color 0.16s",
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
              }}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Sort row — single line, scrolls horizontally if too narrow */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "0 2px",
        overflowX: "auto",
        scrollbarWidth: "none", msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties} className="bb-no-scrollbar">
        <span style={{
          flexShrink: 0,
          fontSize: 11, color: c.txtMute, fontWeight: 700,
          letterSpacing: "0.08em", textTransform: "uppercase",
          fontFamily: "var(--font-montserrat)",
        }}>сортировка</span>
        {SORT_OPTIONS.map(o => {
          const sel = sortKey === o.key;
          return (
            <button key={o.key} type="button" onClick={() => setSortKey(o.key)}
              style={{
                flexShrink: 0,
                padding: "6px 10px", borderRadius: 8,
                background: sel ? c.txtDark : "transparent",
                color: sel ? "#fff" : c.txtBody,
                border: `1px solid ${sel ? c.txtDark : c.border}`,
                cursor: "pointer",
                fontFamily: "var(--font-montserrat)",
                fontSize: 12, fontWeight: 600, letterSpacing: "-0.005em",
                whiteSpace: "nowrap",
                transition: "background 0.16s, border-color 0.16s, color 0.16s",
              }}
            >{o.label}</button>
          );
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <EmptyState search={search} statusFilter={statusFilter} totalClients={summaries.length} />
      ) : (
        <div style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
          overflow: "hidden",
        }}>
          {visible.map((cl, i) => (
            <div key={cl.identifier} style={{
              borderBottom: i < visible.length - 1 ? `1px solid ${c.borderSoft}` : "none",
            }}>
              <ClientCard c={cl} onClick={() => setSelected(cl.identifier)} />
            </div>
          ))}
        </div>
      )}

      {bookings.length >= 500 && (
        <div style={{
          padding: "10px 14px", borderRadius: 11,
          background: c.bgSoft, border: `1px solid ${c.border}`,
          fontSize: 12, color: c.txtMute, fontFamily: "var(--font-montserrat)",
        }}>
          Показаны клиенты из 500 последних записей. Для полной истории — экспорт в админке.
        </div>
      )}

      <ClientDetailModal
        open={!!selected}
        client={selectedClient}
        visits={selectedVisits}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function EmptyState({ search, statusFilter, totalClients }: {
  search: string; statusFilter: StatusFilterKey; totalClients: number;
}) {
  let title = "Клиентов ещё нет";
  let hint  = "Как только в салоне появятся первые записи, клиенты автоматически появятся здесь.";
  let emoji = "👥";

  if (search) {
    title = "Никого не найдено";
    hint  = `По запросу «${search}» нет клиентов. Попробуйте другое имя или телефон.`;
    emoji = "🔍";
  } else if (statusFilter !== "all" && totalClients > 0) {
    const lbl = STATUS_FILTERS.find(s => s.key === statusFilter)?.label.toLowerCase();
    title = `В категории «${lbl}» пусто`;
    hint  = "Снимите фильтр чтобы увидеть остальных клиентов.";
    emoji = "✨";
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
