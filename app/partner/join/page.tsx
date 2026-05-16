"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function JoinForm() {
  const params = useSearchParams();
  const router = useRouter();
  const invite = params.get("invite") || "";
  const [form, setForm] = useState({ email: "", password: "", ownerName: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/partner/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken: invite, ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Ошибка"); setLoading(false); return; }
    setLoading(false);
    router.push("/partner/tariff");
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Регистрация партнёра</h1>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Создайте аккаунт для управления салоном</p>
        {!invite && <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>Неверная ссылка. Обратитесь к менеджеру.</div>}
        {error && <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { key: "ownerName", label: "ФИО владельца", type: "text", placeholder: "Иванова Анна Сергеевна", required: false },
            { key: "phone", label: "Телефон", type: "tel", placeholder: "+7 (___) ___-__-__", required: false },
            { key: "email", label: "Email (для входа)", type: "email", placeholder: "email@salon.ru", required: true },
            { key: "password", label: "Пароль", type: "password", placeholder: "Минимум 8 символов", required: true },
          ].map(f => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                required={f.required}
                style={inputStyle}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading || !invite}
            style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8, opacity: (loading || !invite) ? 0.6 : 1 }}
          >
            {loading ? "Регистрация..." : "Создать аккаунт →"}
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

export default function PartnerJoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f7f7fa" }} />}>
      <JoinForm />
    </Suspense>
  );
}
