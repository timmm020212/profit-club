"use client";
import { useState } from "react";
import PartnerSidebar from "./PartnerSidebar";

interface Props {
  children: React.ReactNode;
  salonName: string;
  tariff: string;
}

export default function PartnerShell({ children, salonName, tariff }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa" }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "#fff", borderBottom: "1px solid #ececf0",
        padding: "13px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#111", letterSpacing: "-0.02em" }}>{salonName}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>Партнёрский кабинет</div>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            padding: 6, display: "flex", flexDirection: "column", gap: 4,
          }}
          aria-label="Меню"
        >
          <div style={{ width: 20, height: 2, background: "#333", borderRadius: 2 }} />
          <div style={{ width: 20, height: 2, background: "#333", borderRadius: 2 }} />
          <div style={{ width: 14, height: 2, background: "#333", borderRadius: 2 }} />
        </button>
      </header>

      <main style={{ padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
        {children}
      </main>

      {sidebarOpen && (
        <PartnerSidebar
          salonName={salonName}
          tariff={tariff}
          onClose={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
