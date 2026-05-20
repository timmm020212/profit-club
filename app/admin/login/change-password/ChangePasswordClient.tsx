"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function ChangePasswordClient() {
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    if (newP !== confirm) { setErr("Пароли не совпадают"); return; }
    if (newP.length < 8) { setErr("Новый пароль должен быть ≥ 8 символов"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldP, newPassword: newP }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Ошибка");
      }
      // After password change, JWT is invalidated → sign out and redirect.
      await signOut({ redirect: false });
      window.location.href = "/admin/login?changed=1";
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#070709", padding: 24, fontFamily: "var(--font-montserrat)",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "#0D0D10", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: 28,
      }}>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
          Смените пароль
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
          Владелец салона установил вам временный пароль. Задайте свой постоянный пароль для входа.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          <Pwd label="Текущий (временный) пароль" value={oldP} onChange={setOldP} />
          <Pwd label="Новый пароль (≥ 8 символов)" value={newP} onChange={setNewP} />
          <Pwd label="Повторите новый" value={confirm} onChange={setConfirm} />
        </div>
        {err && (
          <div style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 9,
            background: "rgba(239,68,68,0.12)", color: "#FCA5A5",
            fontSize: 13, fontWeight: 600,
          }}>{err}</div>
        )}
        <button type="button" onClick={save} disabled={saving}
          style={{
            marginTop: 18, width: "100%", height: 44,
            background: "#7B61FF", color: "#fff", border: "none", borderRadius: 11,
            fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          }}>{saving ? "Сохраняем..." : "Сохранить пароль"}</button>
      </div>
    </div>
  );
}

function Pwd({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      <input type="password" value={value} onChange={e => onChange(e.target.value)}
        style={{
          height: 44, padding: "0 14px", borderRadius: 11,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff", fontSize: 14, outline: "none",
          fontFamily: "var(--font-montserrat)",
        }} />
    </label>
  );
}
