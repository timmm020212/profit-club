"use client";

import { useState } from "react";

type PeriodType = "week" | "month" | "custom";

interface MasterPeriodSelectorProps {
  onPeriodChange: (from: string, to: string) => void;
}

function getWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(monday), to: fmt(sunday) };
}

function getMonthRange(): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { from: fmt(first), to: fmt(last) };
}

export default function MasterPeriodSelector({ onPeriodChange }: MasterPeriodSelectorProps) {
  const [active, setActive] = useState<PeriodType>("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const handleSelect = (type: PeriodType) => {
    setActive(type);
    if (type === "week") {
      const r = getWeekRange();
      onPeriodChange(r.from, r.to);
    } else if (type === "month") {
      const r = getMonthRange();
      onPeriodChange(r.from, r.to);
    }
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onPeriodChange(customFrom, customTo);
    }
  };

  const tabs: { key: PeriodType; label: string }[] = [
    { key: "week", label: "Неделя" },
    { key: "month", label: "Месяц" },
    { key: "custom", label: "Период" },
  ];

  return (
    <div className="px-5 pt-4">
      <div className="flex bg-white rounded-xl p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSelect(t.key)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: active === t.key ? "#B2223C" : "transparent",
              color: active === t.key ? "#fff" : "#888",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <div className="flex gap-2 mt-3 items-center">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
          />
          <span className="text-gray-400 text-xs">—</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700"
          />
          <button
            onClick={handleCustomApply}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
            style={{ background: "#B2223C" }}
          >
            ОК
          </button>
        </div>
      )}
    </div>
  );
}
