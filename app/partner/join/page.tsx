"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function PartnerJoinPage() {
  const router = useRouter();
  const [form, setForm] = useState({ salonName: "", city: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // 1. Register
    const res = await fetch("/api/partner/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Ошибка регистрации");
      setLoading(false);
      return;
    }

    // 2. Sign in via NextAuth
    const result = await signIn("partner", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Регистрация прошла, но войти не удалось. Попробуйте войти.");
      setLoading(false);
      return;
    }

    router.push("/partner/dashboard");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0",
    borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#111", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase",
    letterSpacing: "0.05em", display: "block", marginBottom: 4,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #ececf0" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.15em", color: "#1a1a2e", marginBottom: 24 }}>BEAUTYBOOK</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Регистрация салона</h1>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Создайте аккаунт и начните принимать онлайн-записи</p>
        {error && (
          <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Название салона *</label>
            <input
              type="text"
              placeholder="Студия красоты Анны"
              value={form.salonName}
              onChange={e => setForm(p => ({ ...p, salonName: e.target.value }))}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Город</label>
            <input
              type="text"
              placeholder="Москва"
              value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              placeholder="you@salon.ru"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Пароль * (мин. 8 символов)</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              minLength={8}
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12,
              padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer",
              marginTop: 8, opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться →"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#aaa" }}>
          Уже есть аккаунт?{" "}
          <a href="/partner/login" style={{ color: "#1a1a2e", fontWeight: 600, textDecoration: "none" }}>Войти</a>
        </p>
      </div>
    </div>
  );
}
