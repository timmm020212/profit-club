"use client";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { section: "Главное", items: [
    { href: "/partner/dashboard", icon: "🏠", label: "Главная" },
    { href: "/partner/bookings", icon: "📅", label: "Записи" },
  ]},
  { section: "Управление", items: [
    { href: "/partner/services", icon: "✂️", label: "Услуги" },
    { href: "/partner/masters", icon: "👩‍💼", label: "Мастера" },
    { href: "/partner/schedule", icon: "🕐", label: "Расписание" },
    { href: "/partner/my-page", icon: "🔗", label: "Моя страница" },
  ]},
  { section: "Аккаунт", items: [
    { href: "/partner/profile", icon: "👤", label: "Профиль салона" },
    { href: "/partner/billing", icon: "💳", label: "Тариф и оплата" },
  ]},
];

const TARIFF_LABELS: Record<string, string> = {
  basic: "Базовый",
  advanced: "Продвинутый",
  pro: "Профессиональный",
};

interface Props {
  salonName: string;
  tariff: string;
  onClose: () => void;
}

export default function PartnerSidebar({ salonName, tariff, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut({ callbackUrl: "/partner/join" });
  }

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 40 }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "80%", maxWidth: 280,
        background: "#fff", zIndex: 50, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.1)", borderLeft: "1px solid #f0f0f0",
      }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#111", marginBottom: 4 }}>{salonName}</div>
          <span style={{
            display: "inline-block", fontSize: 10, fontWeight: 700,
            background: "#f0f0f5", color: "#555", borderRadius: 6, padding: "2px 8px",
          }}>
            {TARIFF_LABELS[tariff] || tariff}
          </span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV.map(group => (
            <div key={group.section}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#ccc", padding: "10px 18px 4px",
              }}>{group.section}</div>
              {group.items.map(item => {
                const active = pathname === item.href;
                return (
                  <button key={item.href} onClick={() => navigate(item.href)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 18px", fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "#1a1a2e" : "#666",
                    background: active ? "#f2f2f6" : "transparent",
                    border: "none",
                    borderLeft: `2px solid ${active ? "#1a1a2e" : "transparent"}`,
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span>{item.icon}</span>{item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f0f0f0" }}>
          <button onClick={handleLogout} style={{
            fontSize: 12, color: "#aaa", background: "none", border: "none",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0,
          }}>
            ← Выйти
          </button>
        </div>
      </div>
    </>
  );
}
