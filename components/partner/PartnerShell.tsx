"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

const pageBg = "#F8F6F2", white = "#FFFFFF";
const border = "#E8E5DF", crimson = "#B2223C";
const txtDark = "#111111", txtMid = "#666666", txtSoft = "#AAAAAA";

interface NavItem { href: string; label: string; short: string; }

const mainNav: NavItem[] = [
  { href: "/partner/dashboard", label: "Главная",    short: "Дом"    },
  { href: "/partner/bookings",  label: "Записи",     short: "Записи" },
  { href: "/partner/services",  label: "Услуги",     short: "Услуги" },
  { href: "/partner/masters",   label: "Мастера",    short: "Мастера"},
  { href: "/partner/schedule",  label: "Расписание", short: "График" },
];
const accountNav: NavItem[] = [
  { href: "/partner/my-page", label: "Моя страница", short: "Страница" },
  { href: "/partner/profile", label: "Профиль",      short: "Профиль" },
  { href: "/partner/billing", label: "Тарифы",       short: "Тариф"  },
];
const tabNav: NavItem[] = mainNav.slice(0,4).concat([
  { href: "/partner/profile", label: "Профиль", short: "Я" },
]);

function SLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} style={{
      display: "block",
      padding: "9px 0",
      fontSize: 13,
      fontFamily: "var(--font-montserrat)",
      fontWeight: active ? 600 : 400,
      color: active ? crimson : txtMid,
      textDecoration: "none",
      borderLeft: `2px solid ${active ? crimson : "transparent"}`,
      paddingLeft: 16,
      marginLeft: -2,
      letterSpacing: "0.01em",
      transition: "color 0.15s",
    }}>{item.label}</Link>
  );
}

export default function PartnerShell({ salonName, tariff, children }: { salonName: string; tariff: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", background: pageBg, display: "flex", fontFamily: "var(--font-montserrat)" }}>

      {/* Desktop sidebar */}
      <aside className="ps-sidebar" style={{
        width: 220, flexShrink: 0, background: white,
        borderRight: `1px solid ${border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        {/* Brand */}
        <div style={{ padding: "28px 18px 22px", borderBottom: `1px solid ${border}` }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 15, fontWeight: 700, color: txtDark, letterSpacing: "0.06em", marginBottom: 4 }}>
            BeautyBook
          </div>
          <div style={{ fontSize: 11, color: txtSoft, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {salonName}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "18px 0 18px 2px", flex: 1 }}>
          <div style={{ fontSize: 9, color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", paddingLeft: 18, marginBottom: 6, fontFamily: "var(--font-montserrat)" }}>
            Управление
          </div>
          {mainNav.map(item => <SLink key={item.href} item={item} active={pathname === item.href} />)}

          <div style={{ height: 1, background: border, margin: "16px 18px" }} />

          <div style={{ fontSize: 9, color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", paddingLeft: 18, marginBottom: 6, fontFamily: "var(--font-montserrat)" }}>
            Аккаунт
          </div>
          {accountNav.map(item => <SLink key={item.href} item={item} active={pathname === item.href} />)}
        </nav>

        {/* Footer */}
        <div style={{ padding: "14px 18px", borderTop: `1px solid ${border}` }}>
          <div style={{
            display: "inline-block", padding: "2px 10px", borderRadius: 20,
            border: `1px solid ${border}`, fontSize: 10,
            fontFamily: "var(--font-montserrat)", fontWeight: 600,
            color: tariff === "pro" ? crimson : txtSoft,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
          }}>{tariff}</div>
          <br />
          <button onClick={() => signOut({ callbackUrl: "/partner/join" })} style={{
            background: "none", border: "none", cursor: "pointer", padding: 0,
            fontSize: 12, fontFamily: "var(--font-montserrat)", color: txtSoft,
            letterSpacing: "0.02em", transition: "color 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = txtDark)}
            onMouseLeave={e => (e.currentTarget.style.color = txtSoft)}
          >
            Выйти →
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        <header className="ps-topbar" style={{
          display: "none", height: 56, padding: "0 20px",
          alignItems: "center", justifyContent: "space-between",
          background: white, borderBottom: `1px solid ${border}`,
          position: "sticky", top: 0, zIndex: 40,
        }}>
          <span style={{ fontFamily: "var(--font-playfair)", fontSize: 16, fontWeight: 700, color: txtDark }}>BeautyBook</span>
          <span style={{ fontSize: 11, color: txtSoft, fontFamily: "var(--font-montserrat)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{salonName}</span>
        </header>

        {/* Content */}
        <main className="ps-main" style={{ flex: 1, padding: "36px 40px 48px", maxWidth: 900, width: "100%" }}>
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <nav className="ps-tabs" style={{
          display: "none", position: "fixed", bottom: 0, left: 0, right: 0,
          height: 60, background: white, borderTop: `1px solid ${border}`,
          zIndex: 50, alignItems: "center", justifyContent: "space-around", padding: "0 8px",
        }}>
          {tabNav.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "6px 10px", textDecoration: "none",
                color: active ? crimson : txtSoft,
                borderTop: `2px solid ${active ? crimson : "transparent"}`,
                minWidth: 52,
              }}>
                <span style={{ fontSize: 10, fontFamily: "var(--font-montserrat)", fontWeight: active ? 600 : 400, letterSpacing: "0.02em" }}>
                  {item.short}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .ps-sidebar { display: none !important; }
          .ps-topbar  { display: flex !important; }
          .ps-tabs    { display: flex !important; }
          .ps-main    { padding: 20px 16px 80px !important; }
        }
      `}</style>
    </div>
  );
}
