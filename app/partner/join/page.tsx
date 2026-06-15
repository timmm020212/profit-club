"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ────────── design tokens — sage-cream editorial ──────────
const c = {
  bg:          "#FAF6F0",      // warm cream background
  cardBg:      "#FFFFFF",
  border:      "#E5E0D6",      // hairline warm border
  borderSoft:  "#F0EBE1",
  txtDark:     "#1F2A1B",      // deep olive-black
  txtBody:     "#4F5947",
  txtMute:     "#7A8472",      // sage gray
  accent:      "#4A6741",      // muted sage — distinctive, calm
  accentDk:    "#3A5232",
  accentSft:   "#E8EDE3",      // very pale sage
  danger:      "#A04141",      // dusty red, not bright
  dangerSft:   "#F4E4E4",
};

// Top Russian cities (population-ordered, ~80 entries).
const CITIES = [
  "Москва","Санкт-Петербург","Новосибирск","Екатеринбург","Казань","Нижний Новгород",
  "Челябинск","Самара","Омск","Ростов-на-Дону","Уфа","Красноярск","Воронеж","Пермь",
  "Волгоград","Краснодар","Саратов","Тюмень","Тольятти","Ижевск","Барнаул","Ульяновск",
  "Иркутск","Хабаровск","Ярославль","Владивосток","Махачкала","Томск","Оренбург",
  "Кемерово","Новокузнецк","Рязань","Астрахань","Пенза","Липецк","Тула","Киров",
  "Чебоксары","Калининград","Курск","Брянск","Магнитогорск","Тверь","Иваново",
  "Ставрополь","Сочи","Севастополь","Симферополь","Калуга","Грозный","Якутск","Сургут",
  "Владимир","Чита","Череповец","Архангельск","Подольск","Орёл","Курган","Смоленск",
  "Белгород","Великий Новгород","Псков","Майкоп","Норильск","Петрозаводск","Кострома",
  "Нальчик","Стерлитамак","Дзержинск","Шахты","Нижневартовск","Сыктывкар","Кисловодск",
  "Пятигорск","Минеральные Воды","Анапа","Геленджик","Ессентуки","Армавир","Таганрог",
  "Балаково","Уссурийск","Энгельс","Бийск","Прокопьевск","Рыбинск","Балашиха","Химки",
  "Мытищи","Люберцы","Королёв",
];

// ────────── form ──────────
type FormState = { salonName: string; city: string; email: string; password: string };

export default function PartnerJoinPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ salonName: "", city: "", email: "", password: "" });
  const [focused, setFocused] = useState<keyof FormState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // city autocomplete
  const [citySuggOpen, setCitySuggOpen] = useState(false);
  const [cityHighlight, setCityHighlight] = useState(0);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const cityListRef  = useRef<HTMLDivElement>(null);

  const citySuggestions = useMemo(() => {
    const q = form.city.trim().toLowerCase();
    if (!q) return [];
    return CITIES.filter(name => name.toLowerCase().includes(q)).slice(0, 6);
  }, [form.city]);

  // Close suggestions on click outside
  useEffect(() => {
    if (!citySuggOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        cityInputRef.current && !cityInputRef.current.contains(t) &&
        cityListRef.current  && !cityListRef.current.contains(t)
      ) setCitySuggOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [citySuggOpen]);

  function selectCity(name: string) {
    setForm(p => ({ ...p, city: name }));
    setCitySuggOpen(false);
    setCityHighlight(0);
  }

  function onCityKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!citySuggOpen || citySuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCityHighlight(h => Math.min(h + 1, citySuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCityHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectCity(citySuggestions[cityHighlight]);
    } else if (e.key === "Escape") {
      setCitySuggOpen(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) { setError("Пароль минимум 8 символов"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/partner/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Не удалось зарегистрироваться. Попробуйте ещё раз.");
        setLoading(false);
        return;
      }
      const signed = await signIn("partner", {
        email: form.email, password: form.password, redirect: false,
      });
      if (signed?.error) {
        setError("Аккаунт создан, но автовход не сработал. Войдите вручную.");
        setLoading(false);
        return;
      }
      router.push("/partner/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети. Попробуйте ещё раз.");
      setLoading(false);
    }
  }

  // ────────── render ──────────
  return (
    <div style={{
      minHeight: "100vh", background: c.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: "var(--font-montserrat)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative dot grid in the corner — subtle texture, no gradient */}
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

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        {/* Wordmark */}
        <div style={{
          marginBottom: 32,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            display: "inline-block", width: 32, height: 32, borderRadius: 8,
            background: c.accent,
            color: "#fff",
            fontFamily: "var(--font-playfair)",
            fontSize: 18, fontWeight: 600, fontStyle: "italic",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            lineHeight: 1,
          }}>B</span>
          <span style={{
            fontSize: 14, fontWeight: 600, color: c.txtDark,
            letterSpacing: "0.02em",
          }}>BeautyBook</span>
        </div>

        {/* Card */}
        <div style={{
          background: c.cardBg, borderRadius: 16,
          border: `1px solid ${c.border}`,
          padding: "40px 36px 32px",
          boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
        }}>
          {/* Pretitle */}
          <div style={{
            fontSize: 10, color: c.accent, fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            marginBottom: 14,
          }}>Партнёр</div>

          {/* H1 — serif, editorial */}
          <h1 style={{
            fontFamily: "var(--font-playfair)",
            fontSize: 38, fontWeight: 400,
            color: c.txtDark, margin: 0,
            lineHeight: 1.05, letterSpacing: "-0.015em",
          }}>
            Регистрация<br />
            <span style={{ fontStyle: "italic", color: c.accent }}>салона</span>
          </h1>

          <p style={{
            fontSize: 13, color: c.txtMute, margin: "16px 0 30px",
            lineHeight: 1.55, maxWidth: 320,
          }}>
            Создайте аккаунт салона за минуту. Все настройки — потом, сейчас только основное.
          </p>

          {error && (
            <div style={{
              background: c.dangerSft,
              border: `1px solid ${c.danger}`,
              borderRadius: 8, padding: "10px 14px",
              marginBottom: 18,
              fontSize: 12, color: c.danger, fontWeight: 600,
              lineHeight: 1.4,
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <UnderlineField
              label="Название салона"
              value={form.salonName}
              onChange={v => setForm(p => ({ ...p, salonName: v }))}
              focused={focused === "salonName"}
              onFocus={() => setFocused("salonName")}
              onBlur={() => setFocused(null)}
              required
              placeholder="Студия Анны"
            />

            {/* City with autocomplete */}
            <div style={{ position: "relative" }}>
              <UnderlineField
                label="Город"
                value={form.city}
                onChange={v => {
                  setForm(p => ({ ...p, city: v }));
                  setCitySuggOpen(true);
                  setCityHighlight(0);
                }}
                focused={focused === "city"}
                onFocus={() => { setFocused("city"); setCitySuggOpen(true); }}
                onBlur={() => setFocused(null)}
                placeholder="Начните вводить..."
                inputRef={cityInputRef}
                onKeyDown={onCityKey}
                autoComplete="off"
              />
              {citySuggOpen && citySuggestions.length > 0 && (
                <div ref={cityListRef} role="listbox" style={{
                  position: "absolute", top: "100%", left: 0, right: 0,
                  marginTop: 4,
                  background: c.cardBg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  boxShadow: "0 8px 24px -8px rgba(31,42,27,0.18)",
                  zIndex: 5,
                }}>
                  {citySuggestions.map((name, i) => {
                    const active = i === cityHighlight;
                    return (
                      <button
                        key={name}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setCityHighlight(i)}
                        onMouseDown={e => e.preventDefault()} // keep input focused
                        onClick={() => selectCity(name)}
                        style={{
                          width: "100%", textAlign: "left",
                          padding: "10px 14px",
                          background: active ? c.accentSft : "transparent",
                          border: "none", cursor: "pointer",
                          fontFamily: "var(--font-montserrat)",
                          fontSize: 13,
                          color: active ? c.accentDk : c.txtDark,
                          fontWeight: active ? 600 : 500,
                          borderBottom: i < citySuggestions.length - 1 ? `1px solid ${c.borderSoft}` : "none",
                        }}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <UnderlineField
              label="Email"
              type="email"
              value={form.email}
              onChange={v => setForm(p => ({ ...p, email: v }))}
              focused={focused === "email"}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
              required
              placeholder="you@salon.ru"
              autoComplete="email"
            />

            <UnderlineField
              label="Пароль"
              hint="Минимум 8 символов"
              type="password"
              value={form.password}
              onChange={v => setForm(p => ({ ...p, password: v }))}
              focused={focused === "password"}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
              required
              minLength={8}
              placeholder="••••••••"
              autoComplete="new-password"
            />

            <button type="submit" disabled={loading}
              style={{
                marginTop: 14,
                background: loading ? c.txtMute : c.txtDark,
                color: "#fff", border: "none",
                borderRadius: 10, padding: "14px 22px",
                fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
                textTransform: "uppercase",
                fontFamily: "var(--font-montserrat)",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.16s",
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = c.accent; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = c.txtDark; }}
            >{loading ? "Создаём аккаунт…" : "Создать аккаунт"}</button>
          </form>

          <div style={{
            marginTop: 24, paddingTop: 18,
            borderTop: `1px solid ${c.borderSoft}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 12, color: c.txtMute,
          }}>
            <span>Уже есть аккаунт?</span>
            <Link href="/partner/login" style={{
              color: c.accent, fontWeight: 700, textDecoration: "none",
              borderBottom: `1.5px solid ${c.accent}`,
              paddingBottom: 1,
            }}>Войти</Link>
          </div>
        </div>

        <p style={{
          fontSize: 11, color: c.txtMute, textAlign: "center",
          marginTop: 20, lineHeight: 1.5,
        }}>
          Создавая аккаунт, вы принимаете правила сервиса.<br/>
          BeautyBook · Платформа для салонов
        </p>
      </div>
    </div>
  );
}

// ────────── reusable underline field ──────────
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
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

function UnderlineField({
  label, hint, value, onChange, focused,
  onFocus, onBlur, type = "text",
  required, minLength, placeholder, autoComplete,
  inputRef, onKeyDown,
}: UnderlineFieldProps) {
  return (
    <div>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        marginBottom: 6,
      }}>
        <label style={{
          fontSize: 10, color: c.txtMute, fontWeight: 700,
          letterSpacing: "0.18em", textTransform: "uppercase",
        }}>{label}{required && <span style={{ color: c.accent, marginLeft: 4 }}>·</span>}</label>
        {hint && (
          <span style={{ fontSize: 10, color: c.txtMute }}>{hint}</span>
        )}
      </div>
      <input
        ref={inputRef as React.Ref<HTMLInputElement>}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={{
          width: "100%", boxSizing: "border-box",
          background: "transparent",
          border: "none",
          borderBottom: `${focused ? 2 : 1}px solid ${focused ? c.accent : c.border}`,
          borderRadius: 0,
          padding: focused ? "9px 0 8px" : "10px 0 9px",
          fontSize: 15, color: c.txtDark,
          fontFamily: "var(--font-montserrat)",
          outline: "none",
          transition: "border-color 0.18s, border-width 0.18s",
        }}
      />
    </div>
  );
}
