"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

// ────────────────────────── Design tokens ──────────────────────────
const c = {
  bg:         "#FFFFFF",
  bgSoft:     "#F7F7FA",
  border:     "#ECECF0",
  borderSoft: "#F2F2F6",
  primary:    "#7B61FF",
  primarySft: "#F0EDFE",
  red:        "#EF4444",
  redSft:     "#FEE2E2",
  txtDark:    "#161620",
  txtBody:    "#5F6577",
  txtMute:    "#9AA0B0",
};

function Ic({ d, size = 20 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const I = {
  home:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  cal:     "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  user:    "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M16 7a4 4 0 11-8 0 4 4 0 018 0z",
  cut:     "M6 3a3 3 0 110 6 3 3 0 010-6zM18 15a3 3 0 110 6 3 3 0 010-6zM8.12 8.12L12 12M12 12l7.88 7.88M20.12 3.88L12 12",
  bag:     "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 11-8 0",
  chat:    "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
  chart:   "M18 20V10M12 20V4M6 20v-6",
  bell:    "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  menu:    "M3 6h18M3 12h18M3 18h18",
  x:       "M18 6L6 18M6 6l12 12",
  grid:    "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  globe:   "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  gear:    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  card:    "M1 4h22v16H1zM1 10h22",
  box:     "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
  logout:  "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

interface NavItem { href: string; label: string; icon: keyof typeof I; badge?: number; }

const mainNav: NavItem[] = [
  { href: "/partner/dashboard", label: "Главная",       icon: "home"  },
  { href: "/partner/my-page",   label: "Моя страница",  icon: "globe" },
  { href: "/partner/bookings",  label: "Записи",        icon: "cal"   },
  { href: "/partner/clients",   label: "Клиенты",       icon: "user"  },
  { href: "/partner/masters",   label: "Мастера",       icon: "cut"   },
  { href: "/partner/services",  label: "Услуги",        icon: "bag"   },
  { href: "/partner/inventory", label: "Склад",         icon: "box"   },
  { href: "/partner/reviews",   label: "Отзывы",        icon: "star"  },
  { href: "/partner/analytics", label: "Аналитика",     icon: "chart" },
];

const accountNav: NavItem[] = [
  { href: "/partner/schedule",       label: "Расписание",    icon: "grid" },
  { href: "/partner/administrator",  label: "Администратор", icon: "user" },
  { href: "/partner/profile",        label: "Профиль",       icon: "gear" },
  { href: "/partner/billing",        label: "Тарифы",        icon: "card" },
];

function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: "linear-gradient(135deg, #2D2952, #1A1830)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      boxShadow: "0 6px 18px rgba(45, 41, 82, 0.20)",
    }}>
      <span style={{
        color: "#fff", fontSize: size * 0.52,
        fontWeight: 800, fontFamily: "var(--font-montserrat)",
        letterSpacing: "-0.04em", lineHeight: 1,
      }}>B</span>
    </div>
  );
}

function DrawerLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  return (
    <Link href={item.href} onClick={onClick} style={{
      position: "relative",
      display: "flex", alignItems: "center", gap: 14,
      padding: "12px 22px",
      color: active ? c.primary : c.txtBody,
      background: active ? c.primarySft : "transparent",
      textDecoration: "none",
      fontSize: 14, fontWeight: active ? 600 : 500,
      fontFamily: "var(--font-montserrat)",
      transition: "background 0.15s, color 0.15s",
    }}>
      {active && (
        <span style={{
          position: "absolute", left: 0, top: 8, bottom: 8, width: 3,
          background: c.primary, borderRadius: "0 2px 2px 0",
        }} />
      )}
      <Ic d={I[item.icon]} size={18} />
      {item.label}
      {item.badge !== undefined && item.badge > 0 && (
        <span style={{
          marginLeft: "auto", minWidth: 20, height: 20, borderRadius: 10,
          background: c.red, color: "#fff", fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 6px",
        }}>{item.badge}</span>
      )}
    </Link>
  );
}

export default function PartnerShell({ salonName, tariff, children }: {
  salonName: string; tariff: string; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Scroll lock when drawer open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  // Escape key to close
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  // Auto-close on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Hydration-safe: compute time-dependent strings on client only
  const [greeting, setGreeting] = useState("Здравствуйте");
  const [dateLabel, setDateLabel] = useState("");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 5  ? "Доброй ночи" :
      h < 12 ? "Доброе утро" :
      h < 18 ? "Добрый день" : "Добрый вечер"
    );
    setDateLabel(new Date().toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", weekday: "long",
    }));
  }, []);

  return (
    <div style={{
      minHeight: "100vh", background: c.bgSoft,
      fontFamily: "var(--font-montserrat)",
    }}>
      {/* ───── Top bar ───── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        background: c.bgSoft,
        padding: "18px 24px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }} className="bb-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <BrandMark size={42} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 18, fontWeight: 800, color: c.txtDark,
              letterSpacing: "-0.02em", lineHeight: 1.2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {greeting}! <span aria-hidden>👋</span>
            </div>
            <div style={{ fontSize: 12, color: c.txtMute, marginTop: 2 }}>
              {dateLabel}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button style={{
            position: "relative", width: 42, height: 42, borderRadius: 12,
            background: c.bg, border: `1px solid ${c.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: c.txtDark, cursor: "pointer", transition: "all 0.15s",
          }} aria-label="Уведомления"
            onMouseEnter={e => (e.currentTarget.style.background = c.borderSoft)}
            onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
          >
            <Ic d={I.bell} size={18} />
          </button>
          <button onClick={() => setDrawerOpen(true)} style={{
            width: 42, height: 42, borderRadius: 12,
            background: c.txtDark, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", cursor: "pointer", transition: "all 0.15s",
          }} aria-label="Меню" aria-expanded={drawerOpen}
            onMouseEnter={e => (e.currentTarget.style.background = "#2A2A35")}
            onMouseLeave={e => (e.currentTarget.style.background = c.txtDark)}
          >
            <Ic d={I.menu} size={18} />
          </button>
        </div>
      </header>

      {/* ───── Page content ───── */}
      <main style={{ padding: "8px 24px 32px", maxWidth: 960, width: "100%", margin: "0 auto" }} className="bb-main">
        {children}
      </main>

      {/* ───── Backdrop ───── */}
      <div
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(22, 22, 32, 0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      />

      {/* ───── Drawer (right) ───── */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Меню навигации"
        aria-hidden={!drawerOpen}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: 340, maxWidth: "88vw", zIndex: 70,
          background: c.bg,
          display: "flex", flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
          boxShadow: drawerOpen ? "-20px 0 60px rgba(22, 22, 32, 0.18)" : "none",
        }}
      >
        {/* Drawer header */}
        <div style={{
          padding: "20px 22px 18px",
          borderBottom: `1px solid ${c.border}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
            <BrandMark size={40} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, color: c.txtDark,
                letterSpacing: "-0.01em",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{salonName}</div>
              <div style={{
                display: "inline-flex", alignItems: "center",
                marginTop: 5, padding: "2px 9px", borderRadius: 10,
                background: c.primarySft, color: c.primary,
                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>{tariff}</div>
            </div>
          </div>
          <button onClick={() => setDrawerOpen(false)} style={{
            width: 32, height: 32, borderRadius: 10,
            background: c.borderSoft, border: "none", cursor: "pointer",
            color: c.txtBody, display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, transition: "background 0.15s",
          }} aria-label="Закрыть меню"
            onMouseEnter={e => (e.currentTarget.style.background = c.border)}
            onMouseLeave={e => (e.currentTarget.style.background = c.borderSoft)}
          >
            <Ic d={I.x} size={16} />
          </button>
        </div>

        {/* Nav body */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
          <div style={{
            fontSize: 10, color: c.txtMute, letterSpacing: "0.16em", textTransform: "uppercase",
            padding: "10px 22px 6px", fontWeight: 700,
          }}>Главное</div>
          {mainNav.map(item => (
            <DrawerLink key={item.href} item={item}
              active={pathname === item.href}
              onClick={() => setDrawerOpen(false)}
            />
          ))}

          <div style={{ height: 1, background: c.border, margin: "12px 22px" }} />

          <div style={{
            fontSize: 10, color: c.txtMute, letterSpacing: "0.16em", textTransform: "uppercase",
            padding: "6px 22px 6px", fontWeight: 700,
          }}>Аккаунт</div>
          {accountNav.map(item => (
            <DrawerLink key={item.href} item={item}
              active={pathname === item.href}
              onClick={() => setDrawerOpen(false)}
            />
          ))}
        </nav>

        {/* Drawer footer — sign out */}
        <div style={{
          padding: "14px 22px",
          borderTop: `1px solid ${c.border}`,
          background: c.bgSoft,
        }}>
          <button onClick={() => signOut({ callbackUrl: "/partner/join" })} style={{
            display: "flex", alignItems: "center", gap: 12,
            width: "100%", background: c.bg, border: `1px solid ${c.border}`,
            padding: "11px 14px", borderRadius: 12, cursor: "pointer",
            color: c.red, fontSize: 14, fontWeight: 600,
            fontFamily: "var(--font-montserrat)", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = c.redSft; e.currentTarget.style.borderColor = c.redSft; }}
            onMouseLeave={e => { e.currentTarget.style.background = c.bg; e.currentTarget.style.borderColor = c.border; }}
          >
            <Ic d={I.logout} size={17} />
            Выйти из аккаунта
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 480px) {
          .bb-topbar { padding: 14px 16px 10px !important; }
          .bb-main   { padding: 6px 16px 24px !important; }
        }
      `}</style>
    </div>
  );
}
