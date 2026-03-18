"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const ADMINS = [
  { username: "matveeva", name: "Анастасия Матвеева", initials: "АМ", color: "from-violet-600 to-purple-700" },
  { username: "glazova", name: "Наталья Глазова", initials: "НГ", color: "from-indigo-600 to-violet-700" },
  { username: "nemykina", name: "Анна Немыкина", initials: "АН", color: "from-fuchsia-600 to-pink-700" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedAdmin = ADMINS.find((a) => a.username === selected);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      username: selected,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push("/admin");
    } else {
      setError("Неверный пароль");
    }
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo/logo1.png"
            alt="Profit Club"
            width={140}
            height={46}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-8">
          <h1 className="text-white text-xl font-semibold mb-1">Вход в панель</h1>
          <p className="text-zinc-500 text-sm mb-6">Выберите профиль администратора</p>

          {/* Admin cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {ADMINS.map((admin) => {
              const isActive = selected === admin.username;
              return (
                <button
                  key={admin.username}
                  type="button"
                  onClick={() => { setSelected(admin.username); setError(""); setPassword(""); }}
                  className={`flex flex-col items-center gap-2.5 rounded-xl p-3.5 border transition-all duration-150 ${
                    isActive
                      ? "border-violet-500/60 bg-violet-500/10"
                      : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.14]"
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${admin.color} text-white text-sm font-bold shadow-lg`}>
                    {admin.initials}
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight ${isActive ? "text-violet-300" : "text-zinc-400"}`}>
                    {admin.name.split(" ")[0]}<br />
                    <span className="text-zinc-500">{admin.name.split(" ")[1]}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Password form */}
          {selected && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${selectedAdmin?.color} text-white text-xs font-bold`}>
                  {selectedAdmin?.initials}
                </div>
                <span className="text-sm text-violet-300">{selectedAdmin?.name}</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Пароль
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {loading ? "Вход..." : "Войти"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
