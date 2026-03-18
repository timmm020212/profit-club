"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Master } from "@/db/schema";
import { useRouter } from "next/navigation";
import AdminSelect from "@/components/ui/AdminSelect";

interface Props { masters: Master[]; }

export default function AdminMasterCreator({ masters }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [specialization, setSpecialization] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingMasterId, setEditingMasterId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRole, setEditingRole] = useState("");
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [localMasters, setLocalMasters] = useState<Master[]>(masters);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("pc_admin_roles");
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setCustomRoles(parsed.filter((r) => typeof r === "string"));
    } catch {}
    const handler = () => {
      try {
        const raw = window.localStorage.getItem("pc_admin_roles");
        const parsed = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) setCustomRoles(parsed.filter((r) => typeof r === "string"));
      } catch {}
    };
    window.addEventListener("pc_roles_updated" as any, handler);
    return () => window.removeEventListener("pc_roles_updated" as any, handler);
  }, []);

  const roleOptions = useMemo(() => {
    const rawSpecs = Array.from(new Set(masters.map((m) => m.specialization).filter(Boolean)));
    const normalized = new Set<string>();
    for (const spec of rawSpecs) {
      if (spec === "барбер, мастер депиляции") { normalized.add("барбер"); normalized.add("мастер депиляции"); continue; }
      if (spec === "мастер маникюра и педикюра, мастер депиляции") { normalized.add("мастер депиляции"); continue; }
      normalized.add(spec);
    }
    customRoles.forEach((r) => { if (r?.trim()) normalized.add(r.trim()); });
    return Array.from(normalized).sort((a, b) => a.localeCompare(b));
  }, [masters, customRoles]);

  const resetForm = () => {
    setFirstName(""); setLastName(""); setPhone(""); setTelegramId("");
    setSpecialization(""); setError(null); setSuccess(null);
  };

  const handleClose = () => { if (loading) return; setIsOpen(false); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!fullName || !specialization) {
      setError("Заполните имя и роль мастера"); return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/masters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, specialization, phone: phone || null, telegramId: telegramId || null }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось создать мастера");
      setSuccess("Мастер успешно добавлен");
      router.refresh();
      setTimeout(() => setIsOpen(false), 700);
    } catch (e: any) { setError(e?.message || "Ошибка при создании мастера"); }
    finally { setLoading(false); }
  };

  const startEditMaster = (master: Master) => {
    setEditingMasterId(master.id);
    setEditingName(master.fullName || "");
    setEditingRole(master.specialization || "");
  };

  const cancelEditMaster = () => { setEditingMasterId(null); setEditingName(""); setEditingRole(""); };

  const applyEditMaster = async () => {
    if (!editingMasterId) return;
    const name = editingName.trim(); const role = editingRole.trim();
    if (!name || !role) { setError("Имя и роль не могут быть пустыми"); return; }
    try {
      setLoading(true); setError(null);
      const res = await fetch("/api/masters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingMasterId, fullName: name, specialization: role }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось обновить мастера");
      setSuccess("Мастер обновлён");
      setEditingMasterId(null); setEditingName(""); setEditingRole("");
      router.refresh();
    } catch (e: any) { setError(e?.message || "Ошибка при обновлении"); }
    finally { setLoading(false); }
  };

  const handleDeleteMaster = async (master: Master) => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`/api/masters?id=${master.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось удалить мастера");
      setSuccess("Мастер деактивирован");
      setLocalMasters((prev) => prev.filter((m) => m.id !== master.id));
      router.refresh();
    } catch (e: any) { setError(e?.message || "Ошибка при удалении"); }
    finally { setLoading(false); }
  };

  function getInitials(name: string) {
    return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  }

  const avatarGradients = [
    "from-violet-600/50 to-violet-900/60 border-violet-500/20",
    "from-indigo-600/50 to-indigo-900/60 border-indigo-500/20",
    "from-purple-600/50 to-purple-900/60 border-purple-500/20",
    "from-fuchsia-600/50 to-fuchsia-900/60 border-fuchsia-500/20",
    "from-sky-600/50 to-sky-900/60 border-sky-500/20",
  ];

  const inp = "w-full rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/15 transition-all";

  return (
    <>
      <button
        type="button"
        onClick={() => { resetForm(); setIsOpen(true); }}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-all"
        title="Добавить мастера"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-violet-400">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
        <span className="hidden lg:inline">Мастер</span>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setIsOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <div className="relative w-full max-w-2xl">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-violet-500/20 to-transparent pointer-events-none" />

            <div className="relative rounded-2xl bg-[#0D0D11] border border-white/[0.07] shadow-2xl shadow-black/70 overflow-hidden">

              {/* ── Header ── */}
              <div className="relative px-6 pt-6 pb-5">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.07] to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-violet-800/20 border border-violet-500/20 shadow-lg shadow-violet-900/30">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-300">
                        <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-white leading-tight">Добавление мастера</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">Мастер получит доступ через staff‑бот</p>
                    </div>
                  </div>
                  <button type="button" onClick={handleClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

              {/* ── Alert ── */}
              {(error || success) && (
                <div className="px-6 pt-4">
                  {error && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-red-500/[0.07] border border-red-500/15 px-3.5 py-2.5 text-xs text-red-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-10a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  )}
                  {success && !error && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/15 px-3.5 py-2.5 text-xs text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                        <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm3.844-9.031a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5z" clipRule="evenodd" />
                      </svg>
                      {success}
                    </div>
                  )}
                </div>
              )}

              {/* ── Body ── */}
              <div className="grid md:grid-cols-[1fr_260px]">

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">Данные мастера</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Имя</label>
                      <input className={inp} type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Маргарита" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Фамилия</label>
                      <input className={inp} type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Иванова" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Телефон</label>
                      <input className={inp} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000-00-00" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-zinc-400">Telegram ID</label>
                      <input className={inp} type="text" value={telegramId} onChange={(e) => setTelegramId(e.target.value)} placeholder="1234567890" />
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.05]" />
                  <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">Доступ</p>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-zinc-400">Специализация</label>
                    <AdminSelect value={specialization} onChange={(v) => setSpecialization(String(v))} options={roleOptions.map((r) => ({ value: r, label: r }))} placeholder="Выберите роль" />
                  </div>

                  <div className="flex justify-end gap-2 pt-1 mt-auto">
                    <button type="button" onClick={handleClose} className="px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07] transition-all">
                      Отмена
                    </button>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-violet-900/25">
                      {loading ? (
                        <><span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />Сохраняем...</>
                      ) : (
                        <><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" /></svg>Добавить мастера</>
                      )}
                    </button>
                  </div>
                </form>

                {/* Masters list */}
                <div className="border-t md:border-t-0 md:border-l border-white/[0.05] px-5 py-5 flex flex-col gap-3 overflow-y-auto max-h-[420px]">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600">Мастера</p>
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.06] px-1.5 text-[10px] text-zinc-500">
                      {localMasters.length}
                    </span>
                  </div>

                  {localMasters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.05] mb-3">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-700">
                          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                        </svg>
                      </div>
                      <p className="text-xs text-zinc-600">Нет мастеров</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {localMasters.map((m, idx) => {
                        const isEditing = editingMasterId === m.id;
                        const initials = getInitials(m.fullName || "?");
                        const grad = avatarGradients[idx % avatarGradients.length];
                        return (
                          <div key={m.id} className="rounded-xl bg-white/[0.025] border border-white/[0.04] overflow-hidden">
                            {isEditing ? (
                              <div className="p-3 space-y-2">
                                <input
                                  className="w-full rounded-lg bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/15 transition-all"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  placeholder="Имя мастера"
                                />
                                <AdminSelect value={editingRole} onChange={(v) => setEditingRole(String(v))} options={roleOptions.map((r) => ({ value: r, label: r }))} placeholder="Выберите роль" />
                                <div className="flex gap-1.5">
                                  <button type="button" onClick={applyEditMaster} className="flex-1 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/20 text-[11px] text-violet-300 hover:bg-violet-600/30 transition-all">Сохранить</button>
                                  <button type="button" onClick={cancelEditMaster} className="flex-1 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-zinc-400 hover:bg-white/[0.08] transition-all">Отмена</button>
                                </div>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.03] transition-all">
                                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${grad} border text-[11px] font-semibold text-white`}>
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-zinc-200 truncate">{m.fullName}</p>
                                  <p className="text-[11px] text-zinc-600 truncate">{m.specialization}</p>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <button type="button" onClick={() => startEditMaster(m)} className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
                                      <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                                    </svg>
                                  </button>
                                  <button type="button" onClick={() => handleDeleteMaster(m)} className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
