"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const crimson = "#B2223C";
const txtDark = "#111111", txtSoft = "#AAAAAA";
const border = "#E0DDD7";

const inputSt = (focused: boolean): React.CSSProperties => ({
  width: "100%", background: "#fff", border: `1px solid ${focused ? crimson : border}`,
  borderRadius: 8, padding: "11px 14px", fontSize: 13, color: txtDark,
  fontFamily: "var(--font-montserrat)", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s",
});

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

  return (
    <div style={{ minHeight: "100vh", background: "#F8F6F2", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Brand */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 700, color: txtDark, letterSpacing: "0.04em" }}>BeautyBook</div>
          <div style={{ width: 32, height: 2, background: crimson, margin: "12px auto 0" }} />
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E8E5DF", padding: "36px 32px" }}>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 700, color: txtDark, margin: "0 0 4px" }}>Вход</h1>
          <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft, margin: "0 0 28px", letterSpacing: "0.01em" }}>Партнёрский кабинет</p>

          {error && (
            <div style={{ border: `1px solid ${crimson}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: crimson, fontFamily: "var(--font-montserrat)" }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { key: "email", label: "Email", type: "email" },
              { key: "password", label: "Пароль", type: "password" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 7 }}>{f.label}</label>
                <input type={f.type} required value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                  style={inputSt(focused === f.key)} />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              background: loading ? "#ccc" : crimson, color: "#fff", border: "none",
              borderRadius: 8, padding: "12px 22px", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-montserrat)", cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.04em", marginTop: 4, transition: "background 0.2s",
            }}>{loading ? "Входим..." : "Войти"}</button>
          </form>

          <p style={{ textAlign: "center", marginTop: 22, fontSize: 12, color: txtSoft, fontFamily: "var(--font-montserrat)" }}>
            Нет аккаунта?{" "}
            <Link href="/partner/join" style={{ color: crimson, fontWeight: 600, textDecoration: "none" }}>Зарегистрироваться</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
