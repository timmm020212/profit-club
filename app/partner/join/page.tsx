"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const accent = "#9B4A62";
const txtDark = "#2D2520", txtSoft = "#B0A49A";
const border = "#E4DDD5";

const inputSt = (focused: boolean): React.CSSProperties => ({
  width: "100%", background: "#FFFCF8", border: `1px solid ${focused ? accent : border}`,
  borderRadius: 8, padding: "11px 14px", fontSize: 13, color: txtDark,
  fontFamily: "var(--font-montserrat)", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s",
});

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

  const fields = [
    { key: "salonName", label: "Название салона", placeholder: "Студия красоты Анны", type: "text", required: true },
    { key: "city",      label: "Город",            placeholder: "Москва",               type: "text", required: false },
    { key: "email",     label: "Email",             placeholder: "you@salon.ru",         type: "email", required: true },
    { key: "password",  label: "Пароль (мин. 8 символов)", placeholder: "••••••••",    type: "password", required: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F2EE", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-montserrat)", fontSize: 22, fontWeight: 700, color: txtDark, letterSpacing: "0.04em" }}>BeautyBook</div>
          <div style={{ width: 32, height: 2, background: accent, margin: "12px auto 0" }} />
        </div>

        <div style={{ background: "#FFFCF8", borderRadius: 12, border: `1px solid ${border}`, padding: "36px 32px" }}>
          <h1 style={{ fontFamily: "var(--font-montserrat)", fontSize: 24, fontWeight: 700, color: txtDark, margin: "0 0 4px" }}>Регистрация</h1>
          <p style={{ fontFamily: "var(--font-montserrat)", fontSize: 12, color: txtSoft, margin: "0 0 28px", letterSpacing: "0.01em" }}>Создайте аккаунт салона</p>

          {error && (
            <div style={{ border: `1px solid ${accent}`, borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: accent, fontFamily: "var(--font-montserrat)" }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: "block", fontSize: 9, fontFamily: "var(--font-montserrat)", color: txtSoft, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 7 }}>{f.label}</label>
                <input
                  type={f.type} required={f.required}
                  placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  onFocus={() => setFocused(f.key)} onBlur={() => setFocused(null)}
                  minLength={f.key === "password" ? 8 : undefined}
                  style={inputSt(focused === f.key)}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} style={{
              background: loading ? "#ccc" : accent, color: "#fff", border: "none",
              borderRadius: 8, padding: "12px 22px", fontSize: 13, fontWeight: 600,
              fontFamily: "var(--font-montserrat)", cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.04em", marginTop: 4, transition: "background 0.2s",
            }}>{loading ? "Создаём аккаунт..." : "Зарегистрироваться"}</button>
          </form>

          <p style={{ textAlign: "center", marginTop: 22, fontSize: 12, color: txtSoft, fontFamily: "var(--font-montserrat)" }}>
            Уже есть аккаунт?{" "}
            <Link href="/partner/login" style={{ color: accent, fontWeight: 600, textDecoration: "none" }}>Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
