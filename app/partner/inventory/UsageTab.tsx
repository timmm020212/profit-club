"use client";
import { useEffect, useMemo, useState } from "react";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  red: "#EF4444", redSft: "#FCE5E5",
  amber: "#F59E0B", amberSft: "#FEF3C7",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface UsageRow {
  id: number; appointmentId: number;
  materialId: number; materialName: string; materialUnit: string;
  quantity: string; totalCost: number; shortfall: string;
  appointmentDate: string; startTime: string; clientName: string;
}

const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const WD = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateLong(iso: string): string {
  const d = parseIso(iso);
  return `${WD[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function UsageTab() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/partner/usage")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRows(d); })
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, UsageRow[]>();
    rows.forEach(r => {
      const arr = m.get(r.appointmentDate) || [];
      arr.push(r);
      m.set(r.appointmentDate, arr);
    });
    return Array.from(m.entries());
  }, [rows]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>;
  }
  if (rows.length === 0) {
    return (
      <div style={{
        background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
        padding: "40px 24px", textAlign: "center",
        fontFamily: "var(--font-montserrat)",
      }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>↓</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: c.txtDark, marginBottom: 4 }}>
          Списаний пока нет
        </div>
        <div style={{ fontSize: 12, color: c.txtMute }}>
          После завершения первой записи материалы спишутся автоматически по рецепту
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map(([date, items]) => (
        <div key={date} style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
          overflow: "hidden", fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${c.borderSoft}`, background: c.bgSoft,
            fontSize: 12, fontWeight: 700, color: c.txtBody,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>{formatDateLong(date)}</div>
          {items.map((u, i) => {
            const short = Number(u.shortfall) > 0;
            return (
              <div key={u.id} style={{
                padding: "12px 16px",
                borderBottom: i < items.length - 1 ? `1px solid ${c.borderSoft}` : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: short ? c.amberSft : c.bgSoft,
                  color: short ? c.amber : c.txtMute,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 18, fontWeight: 800,
                }}>{short ? "⚠" : "↓"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: c.txtDark,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {u.materialName}
                    <span style={{ color: c.txtBody, fontWeight: 600 }}>
                      {" "}— {Number(u.quantity).toFixed(0)} {u.materialUnit}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11, color: c.txtMute, marginTop: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFeatureSettings: '"tnum" 1',
                  }}>
                    {u.startTime} · {u.clientName}
                    {short && <span style={{ color: c.amber, marginLeft: 6 }}>· не хватило {Number(u.shortfall).toFixed(0)} {u.materialUnit}</span>}
                  </div>
                </div>
                <div style={{
                  flexShrink: 0, fontSize: 13, fontWeight: 700, color: c.red,
                  fontFeatureSettings: '"tnum" 1', whiteSpace: "nowrap",
                }}>
                  −{Math.round(u.totalCost / 100).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
