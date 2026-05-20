"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [changedBanner, setChangedBanner] = useState(false);

  // Read ?changed=1 from window.location (avoids useSearchParams() prerender boundary issue)
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("changed=1")) {
      setChangedBanner(true);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      username: username.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push("/admin");
    } else {
      setError("Неверный логин или пароль");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#070709", fontFamily: "var(--font-montserrat)" }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
            style={{
              background: "linear-gradient(135deg, #2D2952, #1A1830)",
              boxShadow: "0 12px 30px rgba(45, 41, 82, 0.35)",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              B
            </span>
          </div>
          <div className="text-white text-base font-semibold">BeautyBook</div>
          <div className="text-zinc-500 text-xs mt-0.5">Панель администратора</div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: "#0D0D10",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h1 className="text-white text-lg font-semibold mb-1">Вход</h1>
          <p className="text-zinc-500 text-xs mb-5">
            Используйте логин и пароль, выданный владельцем салона
          </p>

          {changedBanner && (
            <div
              className="mb-4 rounded-lg px-3 py-2.5 text-xs font-semibold"
              style={{
                background: "rgba(31,180,106,0.12)",
                color: "#86EFAC",
                border: "1px solid rgba(31,180,106,0.25)",
              }}
            >
              ✓ Пароль обновлён. Войдите с новым паролем.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5"
                style={{ letterSpacing: "0.08em" }}
              >
                Логин
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
                placeholder="ivan"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5"
                style={{ letterSpacing: "0.08em" }}
              >
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  color: "#FCA5A5",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-bold transition-all"
              style={{
                background: loading ? "rgba(123,97,255,0.4)" : "#7B61FF",
                color: "#fff",
                cursor: loading || !username.trim() || !password ? "not-allowed" : "pointer",
                opacity: !username.trim() || !password ? 0.6 : 1,
                boxShadow: !loading ? "0 8px 24px -6px rgba(123, 97, 255, 0.5)" : "none",
              }}
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
            <p className="text-zinc-600 text-[11px]">
              Нет логина? Обратитесь к владельцу салона
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
