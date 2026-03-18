"use client";

import { useEffect, useState } from "react";

const ADMINS = [
  { id: "anna", label: "Анна Немыкина", password: "Anna Nemykina" },
  { id: "anastasia", label: "Анастасия Матвеева", password: "Anastasia Matveeva" },
  { id: "nataliya", label: "Наталья Глазова", password: "Nataliya Glazova" },
];

interface Props {
  children: React.ReactNode;
}

export default function AdminAuthGate({ children }: Props) {
  const [currentAdmin, setCurrentAdmin] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(ADMINS[0]?.id ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("pc_admin_name");
    if (stored) {
      setCurrentAdmin(stored);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);

    const admin = ADMINS.find((a) => a.id === selectedId);
    if (!admin) {
      setError("Выберите администратора");
      return;
    }

    if (password.trim() !== admin.password) {
      setError("Неверный пароль");
      return;
    }

    const displayName = admin.label;
    setCurrentAdmin(displayName);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pc_admin_name", displayName);
    }
    setPassword("");
  }

  // Даже если не авторизован, контент страницы рендерится, но перекрывается модальным слоем
  return (
    <>
      {children}
      {!currentAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0B0C]">
          <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141417] p-6 shadow-2xl text-sm">
            <h2 className="text-xl font-semibold mb-2 text-center">Вход в админ-панель</h2>
            <p className="text-xs text-gray-400 mb-4 text-center">
              Выберите администратора и введите пароль, чтобы продолжить работу с расписанием.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-gray-300 text-xs">Администратор</label>
                <select
                  className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {ADMINS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-gray-300 text-xs">Пароль</label>
                <input
                  type="password"
                  className="w-full rounded-md bg-black/40 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(true)}
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 text-center mt-1">{error}</p>
              )}

              <button
                type="submit"
                className="w-full mt-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Войти
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
