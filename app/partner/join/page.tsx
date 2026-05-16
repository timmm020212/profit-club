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

export default function PartnerJoinPage() {
  const router = useRouter();
  const [form, setForm] = useState({ salonName: "", city: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/partner/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Ошибка регистрации"); setLoading(false); return; }
    const result = await signIn("partner", { email: form.email, password: form.password, redirect: false });
    if (result?.error) { setError("Регистрация прошла, но войти не удалось."); setLoading(false); return; }
    router.push("/partner/dashboard");
  }

  const inp = (key: string): React.CSSProperties => ({
    ...inputBase,
    borderColor: focused === key ? "rgba(200,169,110,0.5)" : border,
    transition: "border-color 0.2s",
  });

  const fields = [
    { key: "salonName", label: "Название салона", placeholder: "Студия красоты Анны", type: "text", required: true },
    { key: "city",      label: "Город",            placeholder: "Москва",               type: "text", required: false },
    { key: "email",     label: "Email",             placeholder: "you@salon.ru",         type: "email", required: true },
    { key: "password",  label: "Пароль (мин. 8 символов)", placeholder: "••••••••",    type: "password", required: true },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#08080D",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div style={{ position: "fixed", width: 600, height: 600, borderRadius: "50%", pointerEvents: "none",
        background: "radial-gradient(circle, rgba(200,169,110,0.04) 0%, transparent 70%)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

      <div style={{
        width: "100%", maxWidth: 400, background: "#111120",
        borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)",
        padding: "36px 32px", boxShadow: "0 32px 80px rgba(0,0,0,0.5)", position: "relative",
      }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: "var(--font-playfair)", fontSize: 12, letterSpacing: "0.22em", color: gold, textTransform: "uppercase", marginBottom: 18 }}>BeautyBook</div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 700, color: txtPri, margin: 0, lineHeight: 1.2 }}>Регистрация салона</h1>
          <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSec, margin: "8px 0 0" }}>Создайте аккаунт и начните принимать онлайн-записи</p>
        </div>

        {error && (
          <div style={{ background: "rgba(178,34,60,0.10)", border: "1px solid rgba(178,34,60,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#E8556E", fontFamily: "var(--font-montserrat)" }}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: gold, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-montserrat)", marginBottom: 6 }}>{f.label}</label>
              <input
                type={f.type} required={f.required}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                minLength={f.key === "password" ? 8 : undefined}
                style={inp(f.key)}
              />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{
            background: crimGrd, color: "#fff", border: "none", borderRadius: 10,
            padding: "13px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)", letterSpacing: "0.04em",
            opacity: loading ? 0.65 : 1, marginTop: 4, transition: "opacity 0.2s",
          }}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться →"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: txtSec, fontFamily: "var(--font-montserrat)" }}>
          Уже есть аккаунт?{" "}
          <Link href="/partner/login" style={{ color: gold, fontWeight: 600, textDecoration: "none" }}>Войти</Link>
        </p>
      </div>
    </div>
  );
}
