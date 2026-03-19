"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Telegram login state
  const [tgLoading, setTgLoading] = useState(false);
  const [tgCode, setTgCode] = useState<string | null>(null);
  const [tgStatus, setTgStatus] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const status = localStorage.getItem("profit_club_user_registered");
      if (status === "verified") {
        router.push("/profile");
      }
    } catch {}
  }, [router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const saveAndRedirect = useCallback(
    (data: {
      id?: number;
      name?: string;
      phone?: string;
      telegramId?: string | null;
    }) => {
      if (data.id) localStorage.setItem("profit_club_client_id", String(data.id));
      if (data.name) localStorage.setItem("profit_club_user_name", data.name);
      if (data.phone) localStorage.setItem("profit_club_client_phone", data.phone);
      if (data.telegramId) localStorage.setItem("profit_club_telegram_id", data.telegramId);
      localStorage.setItem("profit_club_user_registered", "verified");
      window.dispatchEvent(new Event("profit_club_auth_changed"));
      router.push("/profile");
    },
    [router],
  );

  // Phone + Password submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/clients/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка при входе");
        return;
      }

      saveAndRedirect(data);
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  };

  // Telegram login
  const handleTelegramLogin = async () => {
    setTgLoading(true);
    setTgStatus("");
    setError("");

    try {
      const res = await fetch("/api/clients/telegram-login-code", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка генерации кода");
        setTgLoading(false);
        return;
      }

      setTgCode(data.code);
      setTgStatus("Ожидаем подтверждение в Telegram...");

      // Open Telegram bot in new tab
      window.open(data.botUrl, "_blank");

      // Start polling
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/clients/verify-status?code=${data.code}`,
          );
          const statusData = await statusRes.json();

          if (statusData.verified) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setTgStatus("Подтверждено!");
            saveAndRedirect({
              id: statusData.id,
              name: statusData.name,
              phone: statusData.phone,
              telegramId: statusData.telegramId,
            });
          }
        } catch {
          // Silently retry on network errors
        }
      }, 2000);
    } catch {
      setError("Ошибка сети. Попробуйте позже.");
      setTgLoading(false);
    }
  };

  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
      style={{ fontFamily: "var(--font-montserrat)" }}
    >
      {/* Title */}
      <h1
        className="mb-6 text-center text-2xl text-white"
        style={{ fontFamily: "var(--font-playfair)", fontWeight: 500 }}
      >
        Вход в аккаунт
      </h1>

      {/* Phone + Password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (999) 000-00-00"
            autoComplete="tel"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-zinc-600 focus:border-[#B2223C]/40 focus:outline-none"
            style={{ fontFamily: "var(--font-montserrat)", fontSize: 16 }}
          />
        </div>

        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            autoComplete="current-password"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-zinc-600 focus:border-[#B2223C]/40 focus:outline-none"
            style={{ fontFamily: "var(--font-montserrat)", fontSize: 16 }}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full py-3 text-sm font-medium text-white transition-all duration-200 disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #B2223C, #d4395a)",
            fontFamily: "var(--font-montserrat)",
          }}
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-xs text-zinc-500">или</span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>

      {/* Telegram login */}
      <div className="space-y-3">
        <p
          className="text-center text-sm text-zinc-400"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Войти через Telegram
        </p>

        <button
          type="button"
          onClick={handleTelegramLogin}
          disabled={tgLoading && !!tgCode}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-transparent py-3 text-sm text-white transition-all duration-200 hover:bg-white/[0.04] disabled:opacity-50"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          {/* Telegram icon */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Открыть Telegram
        </button>

        {tgStatus && (
          <p className="text-center text-xs text-zinc-400">{tgStatus}</p>
        )}
      </div>

      {/* Register link */}
      <div className="mt-6 text-center">
        <a
          href="/booking"
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          style={{ fontFamily: "var(--font-montserrat)" }}
        >
          Нет аккаунта?{" "}
          <span className="text-[#B2223C] hover:text-[#d4395a]">
            Зарегистрироваться
          </span>
        </a>
      </div>
    </div>
  );
}
