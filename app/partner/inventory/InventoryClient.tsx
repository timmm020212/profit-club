"use client";
import { useState } from "react";
import CatalogTab from "./CatalogTab";
import ArrivalsTab from "./ArrivalsTab";
import UsageTab from "./UsageTab";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primarySft: "#F0EDFE",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

type Tab = "catalog" | "arrivals" | "usage";
const TABS: { key: Tab; label: string }[] = [
  { key: "catalog",  label: "Каталог" },
  { key: "arrivals", label: "Поступления" },
  { key: "usage",    label: "Списания" },
];

export default function InventoryClient() {
  const [tab, setTab] = useState<Tab>("catalog");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
          letterSpacing: "-0.025em", fontFamily: "var(--font-montserrat)",
        }}>Склад</h1>
        <div style={{
          fontSize: 13, color: c.txtMute, marginTop: 4,
          fontFamily: "var(--font-montserrat)",
        }}>Материалы, поступления и списания</div>
      </div>

      <div style={{
        display: "inline-flex", padding: 4, gap: 4,
        background: c.bgSoft, border: `1px solid ${c.border}`, borderRadius: 12,
        alignSelf: "flex-start",
      }}>
        {TABS.map(t => {
          const sel = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px", borderRadius: 9,
                background: sel ? c.bg : "transparent",
                color: sel ? c.txtDark : c.txtBody,
                border: "none", cursor: "pointer",
                fontFamily: "var(--font-montserrat)",
                fontSize: 13, fontWeight: sel ? 700 : 600,
                boxShadow: sel ? "0 1px 3px rgba(22,22,32,0.08)" : "none",
                transition: "all 0.15s",
              }}>{t.label}</button>
          );
        })}
      </div>

      {tab === "catalog"  && <CatalogTab />}
      {tab === "arrivals" && <ArrivalsTab />}
      {tab === "usage"    && <UsageTab />}
    </div>
  );
}
