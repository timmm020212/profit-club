"use client";
import { useEffect, useState } from "react";
import ArrivalEditor from "@/components/partner/ArrivalEditor";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primarySft: "#F0EDFE",
  green: "#1FB46A",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface Lot {
  id: number; materialId: number; materialName: string; materialUnit: string;
  qtyInitial: string; qtyRemaining: string; pricePerUnit: number;
  supplier: string | null; arrivedAt: string; note: string | null;
}
interface MaterialOption { id: number; name: string; unit: string; }

const MONTHS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m-1]}`;
}

export default function ArrivalsTab() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [lr, mr] = await Promise.all([
        fetch("/api/partner/material-lots").then(r => r.json()),
        fetch("/api/partner/materials").then(r => r.json()),
      ]);
      if (Array.isArray(lr)) setLots(lr);
      if (Array.isArray(mr)) setMaterials(mr.map((m: { id: number; name: string; unit: string }) => ({ id: m.id, name: m.name, unit: m.unit })));
    } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setEditorOpen(true)}
          disabled={materials.length === 0}
          title={materials.length === 0 ? "Сначала создайте материал в Каталоге" : ""}
          style={{
            padding: "11px 18px", borderRadius: 11,
            background: c.primary, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700,
            cursor: materials.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "var(--font-montserrat)",
            boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
            opacity: materials.length === 0 ? 0.5 : 1,
          }}>+ Поступление</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>
      ) : lots.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
          padding: "40px 24px", textAlign: "center",
          fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>↑</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.txtDark, marginBottom: 4 }}>
            Поступлений пока нет
          </div>
          <div style={{ fontSize: 12, color: c.txtMute }}>
            Первый приход материалов появится здесь
          </div>
        </div>
      ) : (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {lots.map((l, i) => (
            <div key={l.id} style={{
              borderBottom: i < lots.length - 1 ? `1px solid ${c.borderSoft}` : "none",
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
              fontFamily: "var(--font-montserrat)",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: "#E3F8EE", color: c.green,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 20, fontWeight: 800,
              }}>↑</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 800, color: c.txtDark,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{l.materialName}</div>
                <div style={{ fontSize: 12, color: c.txtBody, marginTop: 2, fontFeatureSettings: '"tnum" 1' }}>
                  +{Number(l.qtyInitial).toFixed(0)} {l.materialUnit}
                  <span style={{ color: c.txtMute }}> · осталось {Number(l.qtyRemaining).toFixed(0)}</span>
                  {l.supplier && <span style={{ color: c.txtMute }}> · {l.supplier}</span>}
                </div>
              </div>
              <div style={{
                flexShrink: 0, textAlign: "right",
                fontSize: 12, color: c.txtBody, fontFeatureSettings: '"tnum" 1',
              }}>
                <div style={{ fontWeight: 700, color: c.txtDark }}>
                  {(Math.round((l.pricePerUnit * Number(l.qtyInitial)) / 100)).toLocaleString("ru-RU")} ₽
                </div>
                <div style={{ color: c.txtMute, marginTop: 2 }}>{formatDateShort(l.arrivedAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ArrivalEditor
        open={editorOpen}
        materials={materials}
        onClose={() => setEditorOpen(false)}
        onSaved={loadAll}
      />
    </div>
  );
}
