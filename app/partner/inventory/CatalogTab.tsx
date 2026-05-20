"use client";
import { useEffect, useMemo, useState } from "react";
import MaterialEditor, { MaterialData } from "@/components/partner/MaterialEditor";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  amber: "#F59E0B", amberSft: "#FEF3C7",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface MaterialRow {
  id: number; name: string; unit: string;
  category: string | null; lowStockThreshold: string | null;
  isActive: boolean; archivedAt: string | null;
  currentStock: number; totalValue: number; avgPrice: number | null;
}

function formatKopecksShort(k: number | null): string {
  if (k == null) return "—";
  if (k < 100_000) return `${(k / 100).toFixed(2).replace(/\.00$/, "")} ₽`;
  return `${Math.round(k / 100).toLocaleString("ru-RU")} ₽`;
}

export default function CatalogTab() {
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; mode: "create" | "edit"; data: MaterialData | null }>({
    open: false, mode: "create", data: null,
  });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/partner/materials");
      const d = await r.json();
      if (Array.isArray(d)) setRows(d);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.category) s.add(r.category); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => !categoryFilter || r.category === categoryFilter)
      .filter(r => !q || r.name.toLowerCase().includes(q));
  }, [rows, categoryFilter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Найти материал..."
          style={{
            flex: 1, minWidth: 200, height: 44, padding: "0 14px",
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 11,
            fontFamily: "var(--font-montserrat)", fontSize: 14, color: c.txtDark, outline: "none",
          }} />
        <button type="button"
          onClick={() => setEditor({ open: true, mode: "create", data: null })}
          style={{
            padding: "11px 18px", borderRadius: 11,
            background: c.primary, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)",
            boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
            whiteSpace: "nowrap",
          }}>+ Новый материал</button>
      </div>

      {categories.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip sel={!categoryFilter} onClick={() => setCategoryFilter(null)}>Все</Chip>
          {categories.map(cat => (
            <Chip key={cat} sel={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>{cat}</Chip>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>
      ) : visible.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
          padding: "40px 24px", textAlign: "center",
          fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.txtDark, marginBottom: 4 }}>
            {rows.length === 0 ? "Каталог пуст" : "Ничего не найдено"}
          </div>
          <div style={{ fontSize: 12, color: c.txtMute }}>
            {rows.length === 0
              ? "Добавьте первый материал чтобы начать учёт"
              : "Попробуйте другой поиск или сбросьте фильтр"}
          </div>
        </div>
      ) : (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {visible.map((r, i) => {
            const low = r.lowStockThreshold != null && r.currentStock < Number(r.lowStockThreshold);
            return (
              <div key={r.id} style={{
                borderBottom: i < visible.length - 1 ? `1px solid ${c.borderSoft}` : "none",
              }}>
                <button type="button"
                  onClick={() => setEditor({ open: true, mode: "edit", data: r })}
                  style={{
                    width: "100%", textAlign: "left", border: "none",
                    background: c.bg, padding: "14px 16px", cursor: "pointer",
                    fontFamily: "var(--font-montserrat)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = c.bgSoft; }}
                  onMouseLeave={e => { e.currentTarget.style.background = c.bg; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: c.primarySft, color: c.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 16, fontWeight: 800,
                  }}>📦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 14, fontWeight: 800, color: c.txtDark,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{r.name}</span>
                      {r.category && (
                        <span style={{
                          padding: "2px 7px", borderRadius: 7,
                          background: c.bgSoft, color: c.txtBody,
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                        }}>{r.category}</span>
                      )}
                      {low && (
                        <span style={{
                          padding: "2px 7px", borderRadius: 7,
                          background: c.amberSft, color: c.amber,
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                        }}>низкий остаток</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: c.txtBody, marginTop: 2, fontFeatureSettings: '"tnum" 1' }}>
                      <b>{Number(r.currentStock).toFixed(0)} {r.unit}</b>
                      <span style={{ color: c.txtMute }}> · средняя {formatKopecksShort(r.avgPrice)}/{r.unit}</span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <MaterialEditor
        open={editor.open}
        mode={editor.mode}
        initial={editor.data}
        onClose={() => setEditor(p => ({ ...p, open: false }))}
        onSaved={load}
        onDeleted={load}
      />
    </div>
  );
}

function Chip({ sel, onClick, children }: { sel: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: "7px 13px", borderRadius: 18,
        background: sel ? "#7B61FF" : "#FFFFFF",
        color: sel ? "#fff" : "#5F6577",
        border: `1px solid ${sel ? "#7B61FF" : "#ECECF0"}`,
        cursor: "pointer", fontFamily: "var(--font-montserrat)",
        fontSize: 12, fontWeight: sel ? 700 : 600,
        transition: "all 0.15s",
      }}>{children}</button>
  );
}
