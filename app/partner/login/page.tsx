"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("partner", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("Неверный email или пароль");
      setLoading(false);
      return;
    }

    router.push("/partner/dashboard");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0",
    borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#111", outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #ececf0" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.15em", color: "#1a1a2e", marginBottom: 28 }}>BEAUTYBOOK</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Вход в кабинет</h1>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Для партнёров платформы</p>
        {error && (
          <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase" as const, letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Пароль</label>
            <input type="password" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} style={inputStyle} />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Входим..." : "Войти →"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#aaa" }}>
          Нет аккаунта?{" "}
          <a href="/partner/join" style={{ color: "#1a1a2e", fontWeight: 600, textDecoration: "none" }}>Зарегистрироваться</a>
        </p>
      </div>
    </div>
  );
}
