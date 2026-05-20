"use client";
import { useEffect, useState } from "react";
import AdminAccountEditor, { SalonAdminData } from "@/components/partner/AdminAccountEditor";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  green: "#1FB46A", greenSft: "#E3F8EE",
  red: "#EF4444", redSft: "#FCE5E5",
  amber: "#F59E0B", amberSft: "#FEF3C7",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

function initialsOf(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "никогда";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "никогда";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} д назад`;
}

export default function AdminsClient() {
  const [admins, setAdmins] = useState<SalonAdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ open: boolean; mode: "create" | "edit"; data: SalonAdminData | null }>({
    open: false, mode: "create", data: null,
  });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/partner/salon-admins");
      const d = await r.json();
      if (Array.isArray(d)) setAdmins(d);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function activePermCount(a: SalonAdminData): { on: number; total: number } {
    const flags = [a.canEditSchedule, a.canEditBookings, a.canEditMasters, a.canEditBotFlows, a.canRunOptimization, a.canEditInventory];
    return { on: flags.filter(Boolean).length, total: flags.length };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
          letterSpacing: "-0.025em", fontFamily: "var(--font-montserrat)" }}>Администратор</h1>
        <div style={{ fontSize: 13, color: c.txtMute, marginTop: 4, fontFamily: "var(--font-montserrat)" }}>
          {admins.length === 0 ? "Сотрудники салона с доступом в админ-панель"
            : `${admins.length} ${admins.length === 1 ? "администратор" : admins.length < 5 ? "администратора" : "администраторов"}`}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button"
          onClick={() => setEditor({ open: true, mode: "create", data: null })}
          style={{
            padding: "11px 18px", borderRadius: 11,
            background: c.primary, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)",
            boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
          }}>+ Добавить администратора</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>
      ) : admins.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
          padding: "40px 24px", textAlign: "center", fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: c.txtDark, marginBottom: 6 }}>
            Администраторов пока нет
          </div>
          <div style={{ fontSize: 13, color: c.txtMute, maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
            Добавьте первого администратора — он сможет работать в админ-панели от имени вашего салона. Все права настраиваются переключателями.
          </div>
        </div>
      ) : (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {admins.map((a, i) => {
            const pc = activePermCount(a);
            const rank = a.rank === "main" ? "главный" : "доп.";
            const statusLabel = !a.isActive ? "заблокирован" : a.forcePasswordReset ? "смена пароля" : "активен";
            const statusColor = !a.isActive ? c.red : a.forcePasswordReset ? c.amber : c.green;
            const statusBg = !a.isActive ? c.redSft : a.forcePasswordReset ? c.amberSft : c.greenSft;
            return (
              <div key={a.id} style={{ borderBottom: i < admins.length - 1 ? `1px solid ${c.borderSoft}` : "none" }}>
                <button type="button"
                  onClick={() => setEditor({ open: true, mode: "edit", data: a })}
                  style={{
                    width: "100%", textAlign: "left", border: "none", background: c.bg,
                    padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    fontFamily: "var(--font-montserrat)", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
                  onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, #7B61FF, #5B3FE5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0,
                  }}>{initialsOf(a.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: c.txtDark }}>{a.name}</span>
                      <span style={{
                        padding: "2px 7px", borderRadius: 7,
                        background: c.bgSoft, color: c.txtBody,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                      }}>{rank}</span>
                      <span style={{
                        padding: "2px 7px", borderRadius: 7,
                        background: statusBg, color: statusColor,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                      }}>{statusLabel}</span>
                    </div>
                    <div style={{ fontSize: 12, color: c.txtBody, marginTop: 2 }}>
                      логин: <b>{a.username}</b>
                      <span style={{ color: c.txtMute }}> · вход {relativeTime(a.lastLoginAt)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: c.txtMute, marginTop: 3 }}>
                      права: {pc.on}/{pc.total} включено
                    </div>
                  </div>
                  <span style={{ color: c.txtMute, flexShrink: 0 }}>›</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AdminAccountEditor
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
