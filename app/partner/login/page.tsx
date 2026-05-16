"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const gold = "#C8A96E", crimGrd = "linear-gradient(135deg, #B2223C, #E8556E)";
const txtPri = "#EDE8DF", txtSec = "#8888A0", border = "rgba(255,255,255,0.10)";
const inputBase: React.CSSProperties = {
  width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${border}`,
  borderRadius: 10, padding: "11px 14px", fontSize: 13, color: txtPri, outline: "none",
  fontFamily: "var(--font-montserrat)", boxSizing: "border-box",
};

export default function PartnerLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await signIn("partner", { email: form.email, password: form.password, redirect: false });
    if (result?.error) { setError("Неверный email или пароль"); setLoading(false); return; }
    router.push("/partner/dashboard");
  }

  const inp = (key: string): React.CSSProperties => ({
    ...inputBase,
    borderColor: focused === key ? "rgba(200,169,110,0.5)" : border,
    transition: "border-color 0.2s",
  });

  return (
    <div style={{
      minHeight: "100vh", background: "#08080D", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      {/* Ambient orb */}
      <div style={{
        position: "fixed", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(178,34,60,0.06) 0%, transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)", pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 380, position: "relative",
        background: "#111120", borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.07)",
        padding: "36px 32px", boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: "var(--font-playfair)", fontSize: 12, letterSpacing: "0.22em",
            color: gold, textTransform: "uppercase", marginBottom: 20,
          }}>BeautyBook</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 26, fontWeight: 700, color: txtPri, margin: 0, lineHeight: 1.2 }}>
            Вход в кабинет
          </h1>
          <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSec, marginTop: 8, margin: "8px 0 0" }}>
            Для партнёров платформы
          </p>
        </div>

        {error && (
          <div style={{
            background: "rgba(178,34,60,0.10)", border: "1px solid rgba(178,34,60,0.25)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 20,
            fontSize: 12, color: "#E8556E", fontFamily: "var(--font-montserrat)",
          }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 6 }}>Email</label>
            <input type="email" required value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
              style={inp("email")} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 6 }}>Пароль</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
              style={inp("password")} />
          </div>
          <button type="submit" disabled={loading} style={{
            background: crimGrd, color: "#fff", border: "none", borderRadius: 10,
            padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)", letterSpacing: "0.04em",
            opacity: loading ? 0.65 : 1, marginTop: 4,
            transition: "opacity 0.2s",
          }}>
            {loading ? "Входим..." : "Войти →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: txtSec, fontFamily: "var(--font-montserrat)" }}>
          Нет аккаунта?{" "}
          <Link href="/partner/join" style={{ color: gold, fontWeight: 600, textDecoration: "none" }}>Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}
