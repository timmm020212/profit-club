"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BeautyBookLogo from "@/components/BeautyBookLogo";

// ────────── design tokens — sage-cream editorial (synced with /partner/join) ──────────
const c = {
  bg:          "#FAF6F0",
  cardBg:      "#FFFFFF",
  border:      "#E5E0D6",
  borderSoft:  "#F0EBE1",
  txtDark:     "#1F2A1B",
  txtBody:     "#4F5947",
  txtMute:     "#7A8472",
  accent:      "#4A6741",
  accentDk:    "#3A5232",
  accentSft:   "#E8EDE3",
  danger:      "#A04141",
  dangerSft:   "#F4E4E4",
};

type FormState = { email: string; password: string };

export default function PartnerLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [focused, setFocused] = useState<keyof FormState | null>(null);
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setErrorDetail("");
    try {
      const result = await signIn("partner", {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
      });
      if (!result?.ok) {
        setError("Неверный email или пароль");
        setLoading(false);
        return;
      }
      router.push("/partner/dashboard");
    } catch (err) {
      setError("Ошибка сети. Попробуйте ещё раз.");
      setErrorDetail(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: c.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "var(--font-inter), Inter, -apple-system, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative — matches /partner/join */}
      <div aria-hidden style={{
        position: "absolute", top: 40, right: 40, width: 180, height: 180,
        backgroundImage: `radial-gradient(${c.accentSft} 1.2px, transparent 1.2px)`,
        backgroundSize: "14px 14px",
        opacity: 0.7,
        pointerEvents: "none",
      }} />
      <div aria-hidden style={{
        position: "absolute", bottom: -40, left: -40, width: 220, height: 220,
        border: `1px solid ${c.border}`,
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ marginBottom: 32, display: "flex", justifyContent: "center" }}>
          <BeautyBookLogo
            variant="horizontal"
            size={26}
            accent={c.accent}
            text={c.txtDark}
          />
        </div>

        {/* Card */}
        <div style={{
          background: c.cardBg, borderRadius: 16,
          border: `1px solid ${c.border}`,
          padding: "40px 36px 32px",
          boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
        }}>
          <h1 style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontSize: 26, fontWeight: 700,
            color: c.txtDark, margin: 0,
            lineHeight: 1.2, letterSpacing: "-0.01em",
          }}>
            Вход
          </h1>

          <p style={{
            fontSize: 14, color: c.txtMute, margin: "10px 0 28px",
            lineHeight: 1.5,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}>
            Партнёрский кабинет — войдите в свой аккаунт салона.
          </p>

          {error && (
            <div style={{
              background: c.dangerSft,
              border: `1px solid ${c.danger}`,
              borderRadius: 8, padding: "10px 14px",
              marginBottom: 18,
              fontSize: 13, color: c.danger, fontWeight: 500,
              lineHeight: 1.45,
              fontFamily: "var(--font-inter), Inter, sans-serif",
            }}>
              {error}
              {errorDetail && (
                <div style={{
                  marginTop: 6, paddingTop: 6,
                  borderTop: `1px solid ${c.danger}33`,
                  fontSize: 11, fontWeight: 400, opacity: 0.85,
                  wordBreak: "break-word",
                }}>
                  <span style={{ fontWeight: 600 }}>Тех. детали:</span> {errorDetail}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <UnderlineField
              label="Email"
              type="email"
              value={form.email}
              onChange={v => setForm(p => ({ ...p, email: v }))}
              focused={focused === "email"}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              required
              autoComplete="email"
              placeholder="you@salon.ru"
            />

            <UnderlineField
              label="Пароль"
              type="password"
              value={form.password}
              onChange={v => setForm(p => ({ ...p, password: v }))}
              focused={focused === "password"}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />

            <button type="submit" disabled={loading}
              style={{
                marginTop: 14,
                background: loading ? c.txtMute : c.txtDark,
                color: "#fff", border: "none",
                borderRadius: 10, padding: "14px 22px",
                fontSize: 15, fontWeight: 600, letterSpacing: "0",
                fontFamily: "var(--font-inter), Inter, sans-serif",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.16s",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = c.accent; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = c.txtDark; }}
            >
              {loading ? "Входим…" : "Войти"}
            </button>
          </form>

          <div style={{
            marginTop: 24, paddingTop: 18,
            borderTop: `1px solid ${c.borderSoft}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 12, color: c.txtMute,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}>
            <span>Нет аккаунта?</span>
            <Link href="/partner/join" style={{
              color: c.accent, fontWeight: 700, textDecoration: "none",
              borderBottom: `1.5px solid ${c.accent}`,
              paddingBottom: 1,
            }}>Зарегистрироваться</Link>
          </div>
        </div>

        <p style={{
          fontSize: 11, color: c.txtMute, textAlign: "center",
          marginTop: 20, lineHeight: 1.5,
          fontFamily: "var(--font-inter), Inter, sans-serif",
        }}>
          BeautyBook · Платформа для салонов
        </p>
      </div>
    </div>
  );
}

// ────────── reusable underline field (identical to /partner/join) ──────────
interface UnderlineFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoComplete?: string;
}

function UnderlineField({
  label, hint, value, onChange, focused,
  onFocus, onBlur, type = "text",
  required, minLength, placeholder, autoComplete,
}: UnderlineFieldProps) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <label style={{
          fontSize: 12, color: c.txtBody, fontWeight: 500,
          letterSpacing: "0",
          fontFamily: "var(--font-inter), Inter, sans-serif",
        }}>
          {label}
          {required && <span style={{ color: c.accent, marginLeft: 3, fontWeight: 700 }}>*</span>}
        </label>
        {hint && (
          <span style={{
            fontSize: 11, color: c.txtMute,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}>{hint}</span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "transparent",
          border: "none",
          borderBottom: "2px solid",
          borderBottomColor: focused ? c.accent : c.border,
          borderRadius: 0,
          padding: "10px 0 9px",
          fontSize: 16, color: c.txtDark,
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontWeight: 400,
          outline: "none",
          transition: "border-bottom-color 0.18s",
        }}
      />
    </div>
  );
}
