"use client";
import { useState, useEffect } from "react";

const c = {
  bg:         "#FFFFFF",
  bgSoft:     "#F7F7FA",
  border:     "#ECECF0",
  borderSoft: "#F2F2F6",
  primary:    "#7B61FF",
  primaryDk:  "#5B3FE5",
  primarySft: "#F0EDFE",
  txtDark:    "#161620",
  txtBody:    "#5F6577",
  txtMute:    "#9AA0B0",
  red:        "#EF4444",
  redSft:     "#FCE5E5",
  green:      "#1FB46A",
  greenSft:   "#E3F8EE",
  amber:      "#F59E0B",
  amberSft:   "#FEF3C7",
};

function Ic({ d, size = 18, sw = 2 }: { d: string; size?: number; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const I = {
  x:       "M18 6L6 18M6 6l12 12",
  eye:     "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 100-6 3 3 0 000 6z",
  eyeOff:  "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  ban:     "M18.36 18.36A10 10 0 005.64 5.64M2 12a10 10 0 1020 0 10 10 0 00-20 0z",
  check:   "M20 6L9 17l-5-5",
  trash:   "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  lock:    "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  key:     "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  zap:     "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  chevron: "M6 9l6 6 6-6",
};

export interface SalonAdminData {
  id: number;
  username: string;
  name: string;
  rank: "main" | "secondary";
  isActive: boolean;
  forcePasswordReset: boolean;
  lastLoginAt: string | null;
  sessionsInvalidatedAt: string | null;
  canEditSchedule: boolean;
  canEditBookings: boolean;
  canEditMasters: boolean;
  canEditBotFlows: boolean;
  canRunOptimization: boolean;
  canEditInventory: boolean;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial: SalonAdminData | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

const PERM_LABELS: { key: keyof SalonAdminData; label: string; desc: string }[] = [
  { key: "canEditSchedule",    label: "Расписание",    desc: "Создавать и изменять рабочие слоты" },
  { key: "canEditBookings",    label: "Записи",        desc: "Подтверждать, переносить, отменять записи" },
  { key: "canEditMasters",     label: "Мастера",       desc: "Добавлять и редактировать мастеров" },
  { key: "canEditBotFlows",    label: "Бот",           desc: "Управлять сценариями Telegram-бота" },
  { key: "canRunOptimization", label: "Оптимизация",   desc: "Запускать автоматическое планирование" },
  { key: "canEditInventory",   label: "Склад",         desc: "Управлять товарами и остатками" },
];

function generatePassword(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function AdminAccountEditor({ open, mode, initial, onClose, onSaved, onDeleted }: Props) {
  // Form state
  const [username, setUsername]     = useState("");
  const [name, setName]             = useState("");
  const [rank, setRank]             = useState<"main" | "secondary">("secondary");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);

  // Permissions
  const [perms, setPerms] = useState({
    canEditSchedule: true,
    canEditBookings: true,
    canEditMasters: false,
    canEditBotFlows: false,
    canRunOptimization: false,
    canEditInventory: false,
  });

  // UI state
  const [focused, setFocused]             = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");

  // Reset-password section
  const [resetOpen, setResetOpen]         = useState(false);
  const [resetPw, setResetPw]             = useState("");
  const [showResetPw, setShowResetPw]     = useState(false);
  const [resetting, setResetting]         = useState(false);
  const [resetError, setResetError]       = useState("");

  // Kick
  const [kickConfirm, setKickConfirm]     = useState(false);
  const [kicking, setKicking]             = useState(false);

  // Activate / deactivate
  const [toggling, setToggling]           = useState(false);

  // Delete
  const [delConfirm, setDelConfirm]       = useState(false);
  const [deleting, setDeleting]           = useState(false);

  // Populate form on open
  useEffect(() => {
    if (open) {
      const d = mode === "edit" ? initial : null;
      setUsername(d?.username || "");
      setName(d?.name || "");
      setRank((d?.rank as "main" | "secondary") || "secondary");
      setPassword("");
      setShowPw(false);
      setPerms({
        canEditSchedule:    d?.canEditSchedule    ?? true,
        canEditBookings:    d?.canEditBookings    ?? true,
        canEditMasters:     d?.canEditMasters     ?? false,
        canEditBotFlows:    d?.canEditBotFlows    ?? false,
        canRunOptimization: d?.canRunOptimization ?? false,
        canEditInventory:   d?.canEditInventory   ?? false,
      });
      setError("");
      setResetOpen(false);
      setResetPw("");
      setShowResetPw(false);
      setResetting(false);
      setResetError("");
      setKickConfirm(false);
      setKicking(false);
      setToggling(false);
      setDelConfirm(false);
      setDeleting(false);
    }
  }, [open, mode, initial]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ────── Save (create or edit) ──────
  async function handleSave() {
    const cleanName = name.trim();
    if (!cleanName) { setError("Введите имя администратора"); return; }
    if (mode === "create") {
      if (!username.trim()) { setError("Введите логин"); return; }
      if (password.length < 8) { setError("Пароль — минимум 8 символов"); return; }
    }
    setSaving(true);
    setError("");
    try {
      const url = mode === "create"
        ? "/api/partner/salon-admins"
        : `/api/partner/salon-admins/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const body = mode === "create"
        ? { username: username.trim(), name: cleanName, rank, password, ...perms }
        : { name: cleanName, rank, ...perms };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сохранить");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  // ────── Reset password ──────
  async function handleResetPassword() {
    if (resetPw.length < 8) { setResetError("Пароль — минимум 8 символов"); return; }
    setResetting(true);
    setResetError("");
    try {
      const res = await fetch(`/api/partner/salon-admins/${initial!.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPw }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось сбросить пароль");
      }
      setResetOpen(false);
      setResetPw("");
      onSaved();
    } catch (e) {
      setResetError(e instanceof Error ? e.message : String(e));
      setResetting(false);
    }
  }

  // ────── Kick ──────
  async function handleKick() {
    if (!kickConfirm) {
      setKickConfirm(true);
      setTimeout(() => setKickConfirm(false), 4000);
      return;
    }
    setKicking(true);
    try {
      const res = await fetch(`/api/partner/salon-admins/${initial!.id}/kick`, { method: "POST" });
      if (!res.ok) throw new Error("Не удалось выгнать");
      setKickConfirm(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setKicking(false); }
  }

  // ────── Toggle active ──────
  async function handleToggleActive() {
    if (!initial) return;
    setToggling(true);
    setError("");
    try {
      const res = await fetch(`/api/partner/salon-admins/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !initial.isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось изменить статус");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setToggling(false);
    }
  }

  // ────── Delete ──────
  async function handleDelete() {
    if (!initial) return;
    if (!delConfirm) {
      setDelConfirm(true);
      setTimeout(() => setDelConfirm(false), 4000);
      return;
    }
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/partner/salon-admins/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не удалось удалить");
      }
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
      setDelConfirm(false);
    }
  }

  // ────── Styles ──────
  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, color: c.txtMute,
    letterSpacing: "0.12em", textTransform: "uppercase",
    marginBottom: 7, fontFamily: "var(--font-montserrat)",
  };

  const inputStyle = (key: string): React.CSSProperties => ({
    width: "100%", padding: "11px 14px",
    background: c.bg, color: c.txtDark,
    border: `1.5px solid ${focused === key ? c.primary : c.border}`,
    borderRadius: 12, fontSize: 14,
    fontFamily: "var(--font-montserrat)", outline: "none",
    boxShadow: focused === key ? `0 0 0 4px ${c.primarySft}` : "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    boxSizing: "border-box",
  });

  const title    = mode === "edit" ? "Редактировать администратора" : "Новый администратор";
  const subtitle = mode === "edit" ? "Изменить данные и права" : "Создать учётную запись";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(22, 22, 32, 0.50)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }} />

      {/* Modal */}
      <div
        role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 540, maxHeight: "92vh",
          zIndex: 110, display: "flex", flexDirection: "column",
          transform: open
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -46%) scale(0.96)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease, transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          background: c.bg, borderRadius: 24,
          boxShadow: "0 40px 100px rgba(22,22,32,0.32), 0 8px 24px rgba(22,22,32,0.10)",
          fontFamily: "var(--font-montserrat)",
        }}
      >
        {/* ── Header ── */}
        <header style={{
          padding: "20px 24px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: `1px solid ${c.border}`, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 10, color: c.primary, fontWeight: 700,
              letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4,
            }}>{subtitle}</div>
            <h2 style={{
              fontSize: 19, fontWeight: 800, color: c.txtDark, margin: 0,
              letterSpacing: "-0.02em", lineHeight: 1.15,
            }}>{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 36, height: 36, borderRadius: 12,
            background: c.bgSoft, border: "none", cursor: "pointer",
            color: c.txtBody, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s, color 0.15s", flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = c.border; e.currentTarget.style.color = c.txtDark; }}
            onMouseLeave={e => { e.currentTarget.style.background = c.bgSoft; e.currentTarget.style.color = c.txtBody; }}
          >
            <Ic d={I.x} size={16} />
          </button>
        </header>

        {/* ── Body (scrollable) ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Username (create only) */}
            {mode === "create" && (
              <div>
                <label style={labelStyle}>Логин</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  placeholder="latin_login123"
                  autoComplete="off"
                  autoCapitalize="off"
                  style={inputStyle("username")}
                />
                <div style={{ fontSize: 11, color: c.txtMute, marginTop: 5 }}>
                  3–50 символов: латиница, цифры, _ и -. Изменить после создания нельзя.
                </div>
              </div>
            )}

            {/* Name */}
            <div>
              <label style={labelStyle}>Имя</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                placeholder="Анна Смирнова"
                style={inputStyle("name")}
              />
            </div>

            {/* Rank (segment control) */}
            <div>
              <label style={labelStyle}>Статус</label>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
              }}>
                {(["main", "secondary"] as const).map(r => (
                  <button key={r} type="button"
                    onClick={() => setRank(r)}
                    style={{
                      padding: "11px 12px", borderRadius: 12, cursor: "pointer",
                      border: `1.5px solid ${rank === r ? c.primary : c.border}`,
                      background: rank === r ? c.primarySft : c.bg,
                      color: rank === r ? c.primary : c.txtBody,
                      fontSize: 13, fontWeight: 700,
                      fontFamily: "var(--font-montserrat)",
                      transition: "all 0.15s",
                    }}
                  >
                    {r === "main" ? "Главный" : "Дополнительный"}
                  </button>
                ))}
              </div>
            </div>

            {/* Password (create only) */}
            {mode === "create" && (
              <div>
                <label style={labelStyle}>Пароль</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      placeholder="Минимум 8 символов"
                      autoComplete="new-password"
                      style={{ ...inputStyle("password"), paddingRight: 44 }}
                    />
                    <button type="button"
                      onClick={() => setShowPw(p => !p)}
                      aria-label={showPw ? "Скрыть пароль" : "Показать пароль"}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", color: c.txtMute,
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <Ic d={showPw ? I.eyeOff : I.eye} size={16} />
                    </button>
                  </div>
                  <button type="button"
                    title="Сгенерировать пароль"
                    onClick={() => {
                      const gen = generatePassword();
                      setPassword(gen);
                      setShowPw(true);
                      navigator.clipboard.writeText(gen).catch(() => {});
                    }}
                    style={{
                      flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                      background: c.bgSoft, border: `1px solid ${c.border}`,
                      color: c.primary, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.primarySft)}
                    onMouseLeave={e => (e.currentTarget.style.background = c.bgSoft)}
                  >
                    <Ic d={I.zap} size={16} />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: c.txtMute, marginTop: 5 }}>
                  Кнопка ⚡ создаёт случайный пароль и копирует в буфер обмена.
                </div>
              </div>
            )}

            {/* Permissions */}
            <div>
              <label style={labelStyle}>Права доступа</label>
              <div style={{
                background: c.bgSoft, borderRadius: 14, overflow: "hidden",
                border: `1px solid ${c.border}`,
              }}>
                {PERM_LABELS.map((p, i) => {
                  const enabled = perms[p.key as keyof typeof perms] as boolean;
                  return (
                    <div key={p.key} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      padding: "12px 16px",
                      borderBottom: i < PERM_LABELS.length - 1 ? `1px solid ${c.border}` : "none",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark }}>{p.label}</div>
                        <div style={{ fontSize: 11, color: c.txtMute, marginTop: 1 }}>{p.desc}</div>
                      </div>
                      <button type="button"
                        role="switch"
                        aria-checked={enabled}
                        onClick={() => setPerms(prev => ({ ...prev, [p.key]: !enabled }))}
                        style={{
                          flexShrink: 0,
                          width: 44, height: 24, borderRadius: 12,
                          background: enabled ? c.primary : c.border,
                          border: "none", cursor: "pointer", position: "relative",
                          transition: "background 0.2s",
                        }}
                      >
                        <span style={{
                          position: "absolute", top: 3, left: enabled ? 23 : 3,
                          width: 18, height: 18, borderRadius: "50%",
                          background: "#fff",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.20)",
                          transition: "left 0.2s",
                        }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Edit-mode action blocks ── */}
            {mode === "edit" && initial && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  fontSize: 10, color: c.txtMute, fontWeight: 700,
                  letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2,
                }}>Управление аккаунтом</div>

                {/* Reset password — collapsible */}
                <div style={{ border: `1px solid ${c.border}`, borderRadius: 14, overflow: "hidden" }}>
                  <button type="button"
                    onClick={() => setResetOpen(p => !p)}
                    style={{
                      width: "100%", textAlign: "left", padding: "13px 16px",
                      background: c.bg, border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 10,
                      fontFamily: "var(--font-montserrat)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
                    onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
                  >
                    <span style={{ color: c.amber, display: "flex" }}><Ic d={I.lock} size={16} /></span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: c.txtDark }}>
                      Сбросить пароль
                    </span>
                    <span style={{
                      color: c.txtMute, transition: "transform 0.2s",
                      display: "flex",
                      transform: resetOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}>
                      <Ic d={I.chevron} size={16} />
                    </span>
                  </button>
                  {resetOpen && (
                    <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${c.borderSoft}` }}>
                      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                        <div style={{ flex: 1, position: "relative" }}>
                          <input
                            type={showResetPw ? "text" : "password"}
                            value={resetPw}
                            onChange={e => setResetPw(e.target.value)}
                            onFocus={() => setFocused("resetpw")}
                            onBlur={() => setFocused(null)}
                            placeholder="Новый пароль (мин. 8 симв.)"
                            autoComplete="new-password"
                            style={{ ...inputStyle("resetpw"), paddingRight: 44 }}
                          />
                          <button type="button"
                            onClick={() => setShowResetPw(p => !p)}
                            style={{
                              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                              background: "none", border: "none", cursor: "pointer", color: c.txtMute,
                              display: "flex",
                            }}
                          >
                            <Ic d={showResetPw ? I.eyeOff : I.eye} size={16} />
                          </button>
                        </div>
                        <button type="button"
                          title="Сгенерировать пароль"
                          onClick={() => {
                            const gen = generatePassword();
                            setResetPw(gen);
                            setShowResetPw(true);
                            navigator.clipboard.writeText(gen).catch(() => {});
                          }}
                          style={{
                            flexShrink: 0, width: 44, height: 44, borderRadius: 12,
                            background: c.bgSoft, border: `1px solid ${c.border}`,
                            color: c.primary, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Ic d={I.zap} size={16} />
                        </button>
                      </div>
                      {resetError && (
                        <div style={{ fontSize: 12, color: c.red, marginTop: 6 }}>{resetError}</div>
                      )}
                      <button type="button"
                        onClick={handleResetPassword}
                        disabled={resetting}
                        style={{
                          marginTop: 10, width: "100%", padding: "10px 16px", borderRadius: 11,
                          background: c.amber, color: "#fff", border: "none",
                          fontSize: 13, fontWeight: 700, cursor: resetting ? "not-allowed" : "pointer",
                          fontFamily: "var(--font-montserrat)", opacity: resetting ? 0.7 : 1,
                        }}
                      >
                        {resetting ? "Сохраняем…" : "Сохранить и сбросить сессии"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Kick everywhere */}
                <div style={{
                  border: `1px solid ${c.border}`, borderRadius: 14,
                  padding: "13px 16px",
                  display: "flex", alignItems: "center", gap: 10, background: c.bg,
                }}>
                  <span style={{ color: c.red, display: "flex" }}><Ic d={I.ban} size={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark }}>Выгнать отовсюду</div>
                    <div style={{ fontSize: 11, color: c.txtMute, marginTop: 1 }}>
                      Все активные сессии немедленно инвалидируются
                    </div>
                  </div>
                  <button type="button"
                    onClick={handleKick}
                    disabled={kicking}
                    aria-label={kickConfirm ? "Подтвердите выход" : "Выгнать отовсюду"}
                    style={{
                      flexShrink: 0,
                      padding: "8px 14px", borderRadius: 10,
                      background: kickConfirm ? c.red : c.bg,
                      border: `1px solid ${kickConfirm ? c.red : c.border}`,
                      color: kickConfirm ? "#fff" : c.red,
                      fontSize: 12, fontWeight: 700, cursor: kicking ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-montserrat)",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {kicking ? "…" : kickConfirm ? "Подтвердить" : "Выгнать"}
                  </button>
                </div>

                {/* Activate / Deactivate */}
                <div style={{
                  border: `1px solid ${c.border}`, borderRadius: 14,
                  padding: "13px 16px",
                  display: "flex", alignItems: "center", gap: 10, background: c.bg,
                }}>
                  <span style={{ color: initial.isActive ? c.red : c.green, display: "flex" }}>
                    <Ic d={initial.isActive ? I.ban : I.check} size={16} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark }}>
                      {initial.isActive ? "Деактивировать" : "Активировать"}
                    </div>
                    <div style={{ fontSize: 11, color: c.txtMute, marginTop: 1 }}>
                      {initial.isActive
                        ? "Администратор потеряет доступ к панели"
                        : "Восстановить доступ администратора"}
                    </div>
                  </div>
                  <button type="button"
                    onClick={handleToggleActive}
                    disabled={toggling}
                    style={{
                      flexShrink: 0,
                      padding: "8px 14px", borderRadius: 10,
                      background: initial.isActive ? c.redSft : c.greenSft,
                      border: "none",
                      color: initial.isActive ? c.red : c.green,
                      fontSize: 12, fontWeight: 700,
                      cursor: toggling ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-montserrat)",
                      opacity: toggling ? 0.7 : 1,
                    }}
                  >
                    {toggling ? "…" : initial.isActive ? "Деактивировать" : "Активировать"}
                  </button>
                </div>

                {/* Delete (only when inactive) */}
                {!initial.isActive && (
                  <div style={{
                    border: `1px solid ${c.border}`, borderRadius: 14,
                    padding: "13px 16px",
                    display: "flex", alignItems: "center", gap: 10, background: c.bg,
                  }}>
                    <span style={{ color: c.red, display: "flex" }}><Ic d={I.trash} size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: c.txtDark }}>Удалить аккаунт</div>
                      <div style={{ fontSize: 11, color: c.txtMute, marginTop: 1 }}>
                        Безвозвратное удаление (архивирование)
                      </div>
                    </div>
                    <button type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      aria-label={delConfirm ? "Подтвердите удаление" : "Удалить аккаунт"}
                      style={{
                        flexShrink: 0,
                        padding: "8px 14px", borderRadius: 10,
                        background: delConfirm ? c.red : c.bg,
                        border: `1px solid ${delConfirm ? c.red : c.border}`,
                        color: delConfirm ? "#fff" : c.red,
                        fontSize: 12, fontWeight: 700,
                        cursor: deleting ? "not-allowed" : "pointer",
                        fontFamily: "var(--font-montserrat)",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {deleting ? "…" : delConfirm ? "Подтвердить" : "Удалить"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: c.redSft, border: `1px solid ${c.red}`,
                fontSize: 13, color: c.red, fontWeight: 600,
              }}>{error}</div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <footer style={{
          padding: "16px 24px",
          borderTop: `1px solid ${c.border}`,
          display: "flex", gap: 10, justifyContent: "flex-end",
          flexShrink: 0, background: c.bgSoft, borderRadius: "0 0 24px 24px",
        }}>
          <button type="button" onClick={onClose} style={{
            padding: "11px 20px", borderRadius: 12,
            background: c.bg, border: `1px solid ${c.border}`,
            fontSize: 13, fontWeight: 600, color: c.txtBody,
            fontFamily: "var(--font-montserrat)", cursor: "pointer",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = c.bgSoft; }}
            onMouseLeave={e => { e.currentTarget.style.background = c.bg; }}
          >
            Отмена
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{
            padding: "11px 24px", borderRadius: 12,
            background: saving ? c.primarySft : c.primary,
            border: "none", color: saving ? c.primary : "#fff",
            fontSize: 13, fontWeight: 700,
            fontFamily: "var(--font-montserrat)",
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: saving ? "none" : "0 6px 18px -4px rgba(123,97,255,0.45)",
            transition: "all 0.15s",
          }}>
            {saving ? "Сохраняем…" : mode === "create" ? "Создать" : "Сохранить"}
          </button>
        </footer>
      </div>
    </>
  );
}
