"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

// --- tokens ---
const bg = "#08080D", sidebar = "#090912", card = "#111120";
const border = "rgba(255,255,255,0.07)";
const gold = "#C8A96E", goldDim = "rgba(200,169,110,0.10)";
const crimson = "#B2223C";
const txtPri = "#EDE8DF", txtSec = "#8888A0", txtMut = "#4A4A60";

// Inline SVG icon helper - stroke only
function Ic({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// Icon paths
const I = {
  home:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  cal:     "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  cut:     "M6 3a3 3 0 110 6 3 3 0 010-6zM18 15a3 3 0 110 6 3 3 0 010-6zM8.12 8.12L12 12M12 12l7.88 7.88M20.12 3.88L12 12",
  users:   "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  grid:    "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  globe:   "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  gear:    "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  card:    "M1 4h22v16H1zM1 10h22",
  logout:  "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  star:    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
};

interface NavItem { href: string; label: string; icon: string }

const mainNav: NavItem[] = [
  { href: "/partner/dashboard", label: "Главная",    icon: "home"  },
  { href: "/partner/bookings",  label: "Записи",     icon: "cal"   },
  { href: "/partner/services",  label: "Услуги",     icon: "cut"   },
  { href: "/partner/masters",   label: "Мастера",    icon: "users" },
  { href: "/partner/schedule",  label: "Расписание", icon: "grid"  },
];
const accountNav: NavItem[] = [
  { href: "/partner/my-page",   label: "Моя страница", icon: "globe" },
  { href: "/partner/profile",   label: "Профиль",      icon: "gear"  },
  { href: "/partner/billing",   label: "Тарифы",       icon: "card"  },
];
const tabNav: NavItem[] = [
  { href: "/partner/dashboard", label: "Главная", icon: "home"  },
  { href: "/partner/bookings",  label: "Записи",  icon: "cal"   },
  { href: "/partner/services",  label: "Услуги",  icon: "cut"   },
  { href: "/partner/masters",   label: "Мастера", icon: "users" },
  { href: "/partner/profile",   label: "Профиль", icon: "gear"  },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 14px", borderRadius: 8,
        color: active ? gold : txtSec,
        background: active ? goldDim : "transparent",
        fontSize: 13, fontFamily: "var(--font-montserrat)",
        fontWeight: active ? 600 : 400,
        textDecoration: "none",
        borderLeft: `2px solid ${active ? gold : "transparent"}`,
        marginLeft: -2,
        transition: "all 0.15s ease",
        letterSpacing: "0.01em",
      }}
    >
      <Ic d={I[item.icon as keyof typeof I]} size={15} />
      {item.label}
    </Link>
  );
}

export default function PartnerShell({
  salonName, tariff, children,
}: {
  salonName: string; tariff: string; children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", background: bg, display: "flex", fontFamily: "var(--font-montserrat)" }}>
      {/* Desktop sidebar */}
      <aside
        className="obs-sidebar"
        style={{
          width: 240, flexShrink: 0,
          background: sidebar,
          borderRight: `1px solid ${border}`,
          display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        }}
      >
        {/* Brand */}
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${border}` }}>
          <div style={{
            fontFamily: "var(--font-playfair)", fontSize: 13,
            letterSpacing: "0.20em", color: gold, marginBottom: 5,
            textTransform: "uppercase",
          }}>BeautyBook</div>
          <div style={{
            fontSize: 11, color: txtSec, letterSpacing: "0.02em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{salonName}</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "16px 18px", flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: txtMut, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 2 }}>
            Управление
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {mainNav.map(item => <NavLink key={item.href} item={item} active={pathname === item.href} />)}
          </div>

          <div style={{ height: 1, background: border, margin: "18px 0" }} />

          <div style={{ fontSize: 9, fontWeight: 700, color: txtMut, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 2 }}>
            Аккаунт
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {accountNav.map(item => <NavLink key={item.href} item={item} active={pathname === item.href} />)}
          </div>
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 18px", borderTop: `1px solid ${border}` }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 20, marginBottom: 12,
            background: tariff === "pro" ? "rgba(200,169,110,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${tariff === "pro" ? "rgba(200,169,110,0.35)" : border}`,
          }}>
            <Ic d={I.star} size={11} />
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: tariff === "pro" ? gold : txtSec,
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>{tariff}</span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/partner/join" })}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", background: "none", border: "none",
              cursor: "pointer", padding: "6px 2px",
              color: txtMut, fontSize: 12, fontFamily: "var(--font-montserrat)",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = txtSec)}
            onMouseLeave={e => (e.currentTarget.style.color = txtMut)}
          >
            <Ic d={I.logout} size={14} />
            Выйти
          </button>
        </div>
      </aside>

      {/* Right column */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        <header className="obs-topbar" style={{
          display: "none", height: 56, padding: "0 20px",
          alignItems: "center", justifyContent: "space-between",
          background: sidebar, borderBottom: `1px solid ${border}`,
          position: "sticky", top: 0, zIndex: 40,
        }}>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: 15, color: gold, letterSpacing: "0.12em" }}>BeautyBook</span>
          <span style={{ fontSize: 11, color: txtSec, fontFamily: "var(--font-montserrat)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{salonName}</span>
        </header>

        {/* Content */}
        <main className="obs-main" style={{ flex: 1, padding: "32px 36px 48px", maxWidth: 920, width: "100%" }}>
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <nav className="obs-tabs" style={{
          display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
          height: 64, background: sidebar, borderTop: `1px solid ${border}`,
          zIndex: 50, alignItems: "center", justifyContent: "space-around",
          padding: "0 4px",
        }}>
          {tabNav.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                padding: "6px 10px", borderRadius: 10, minWidth: 52,
                color: active ? gold : txtMut,
                background: active ? goldDim : "transparent",
                textDecoration: "none", transition: "all 0.15s",
              }}>
                <Ic d={I[item.icon as keyof typeof I]} size={20} />
                <span style={{ fontSize: 9, fontFamily: "var(--font-montserrat)", fontWeight: active ? 600 : 400 }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .obs-sidebar { display: none !important; }
          .obs-topbar  { display: flex !important; }
          .obs-tabs    { display: flex !important; }
          .obs-main    { padding: 20px 16px 88px !important; }
        }
      `}</style>
    </div>
  );
}
