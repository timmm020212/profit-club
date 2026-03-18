"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Master } from "@/db/schema";

const ROLES_STORAGE_KEY = "pc_admin_roles";
const ROLES_EVENT_KEY = "pc_roles_updated";

interface Props { masters: Master[]; }

export default function AdminRoleCreator({ masters }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setRoleName(""); setError(null); setSuccess(null); setRoles(readRoles());
  }, [isOpen]);

  const dbRoles = useMemo(() => {
    const rawSpecs = Array.from(new Set(masters.map((m) => m.specialization).filter(Boolean)));
    const normalized = new Set<string>();
    for (const spec of rawSpecs) {
      if (spec === "барбер, мастер депиляции") { normalized.add("барбер"); normalized.add("мастер депиляции"); continue; }
      if (spec === "мастер маникюра и педикюра, мастер депиляции") { normalized.add("мастер депиляции"); continue; }
      normalized.add(spec);
    }
    return Array.from(normalized).sort((a, b) => a.localeCompare(b));
  }, [masters]);

  function readRoles(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(ROLES_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((r) => typeof r === "string") : [];
    } catch { return []; }
  }

  function writeRoles(next: string[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(ROLES_EVENT_KEY));
    setRoles(next);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const trimmed = roleName.trim();
    if (!trimmed) { setError("Введите название роли"); return; }
    if (trimmed.length > 80) { setError("Слишком длинное название"); return; }
    try {
      setLoading(true);
      const current = readRoles();
      if (current.includes(trimmed)) { setError("Такая роль уже добавлена"); return; }
      writeRoles([...current, trimmed]);
      setSuccess("Роль добавлена");
      setRoleName("");
    } catch { setError("Не удалось сохранить роль"); }
    finally { setLoading(false); }
  };

  const handleRemove = async (role: string) => {
    if (roles.includes(role)) { writeRoles(readRoles().filter((r) => r !== role)); return; }
    if (dbRoles.includes(role)) { setError("Нельзя удалить роль, которая используется мастерами"); return; }
    try {
      setLoading(true); setError(null);
      const res = await fetch(`/api/roles?name=${encodeURIComponent(role)}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось удалить роль");
      setSuccess("Роль удалена");
      if (typeof window !== "undefined") window.location.reload();
    } catch (e: any) { setError(e?.message || "Ошибка"); }
    finally { setLoading(false); }
  };

  const applyEdit = async () => {
    const trimmed = editingValue.trim();
    if (!editingRole || !trimmed) { setEditingRole(null); return; }
    if (roles.includes(editingRole)) {
      const current = readRoles();
      const idx = current.indexOf(editingRole);
      if (idx === -1) { setEditingRole(null); return; }
      if (current.includes(trimmed) && trimmed !== editingRole) { setError("Такая роль уже есть"); return; }
      current[idx] = trimmed;
      writeRoles(current);
      setEditingRole(null);
      return;
    }
    try {
      setLoading(true); setError(null);
      const res = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: editingRole, newName: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Не удалось изменить роль");
      setSuccess("Роль обновлена");
      setEditingRole(null);
      if (typeof window !== "undefined") window.location.reload();
    } catch (e: any) { setError(e?.message || "Ошибка"); }
    finally { setLoading(false); }
  };

  const allRoles = [...dbRoles, ...roles];

  const dotColors = [
    "bg-violet-400", "bg-indigo-400", "bg-purple-400",
    "bg-fuchsia-400", "bg-sky-400", "bg-cyan-400",
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] transition-all"
        title="Управление ролями"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-violet-400">
          <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h7A1.5 1.5 0 0 1 13 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 12.5v-9ZM5.5 5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5Zm0 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1h-5Zm0 2.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3Z" />
        </svg>
        <span className="hidden lg:inline">Роли</span>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setIsOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

          <div className="relative w-full max-w-md">
            <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-violet-500/20 to-transparent pointer-events-none" />

            <div className="relative rounded-2xl bg-[#0D0D11] border border-white/[0.07] shadow-2xl shadow-black/70 overflow-hidden">

              {/* Header */}
              <div className="relative px-6 pt-6 pb-5">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.07] to-transparent pointer-events-none" />
                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-violet-800/20 border border-violet-500/20 shadow-lg shadow-violet-900/30">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-300">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold text-white leading-tight">Роли мастеров</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">Управление специализациями</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { if (!loading) setIsOpen(false); }}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />

              {/* Alert */}
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

              {/* Add form */}
              <form onSubmit={handleSubmit} className="px-6 py-4">
                <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600 mb-2.5">Новая роль</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/15 transition-all"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="Например: стилист"
                  />
                  <button
                    type="submit"
                    disabled={loading || !roleName.trim()}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-violet-900/25"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                    </svg>
                    Добавить
                  </button>
                </div>
              </form>

              {/* Roles list */}
              {allRoles.length > 0 && (
                <>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                  <div className="px-6 py-4 max-h-[260px] overflow-y-auto">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-600 mb-3">
                      Все роли — {allRoles.length}
                    </p>
                    <div className="space-y-1.5">
                      {allRoles.map((role, idx) => {
                        const isEditing = editingRole === role;
                        const isCustom = roles.includes(role);
                        return (
                          <div key={role}>
                            {isEditing ? (
                              <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/[0.05] px-3.5 py-2.5">
                                <input
                                  className="flex-1 bg-transparent text-sm text-zinc-100 focus:outline-none"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") applyEdit(); if (e.key === "Escape") setEditingRole(null); }}
                                  autoFocus
                                />
                                <button type="button" onClick={applyEdit} className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-600/30 text-violet-400 hover:bg-violet-600/50 transition-all">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <button type="button" onClick={() => setEditingRole(null)} className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400 hover:bg-white/[0.1] transition-all">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                    <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="group flex items-center gap-3 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] px-3.5 py-2.5 transition-all cursor-default">
                                <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full ${dotColors[idx % dotColors.length]}`} />
                                <span className="flex-1 text-sm text-zinc-200 truncate">{role}</span>
                                {isCustom && (
                                  <span className="text-[10px] text-zinc-600 border border-white/[0.05] rounded px-1.5 py-0.5 flex-shrink-0">своя</span>
                                )}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => { setEditingRole(role); setEditingValue(role); }}
                                    className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
                                      <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemove(role)}
                                    className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                  >
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
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/[0.05] flex items-center justify-between">
                <span className="text-xs text-zinc-600">
                  {allRoles.length} {allRoles.length === 1 ? "роль" : allRoles.length < 5 ? "роли" : "ролей"}
                </span>
                <button
                  type="button"
                  onClick={() => { if (!loading) setIsOpen(false); }}
                  className="px-5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-sm text-zinc-200 font-medium transition-all"
                >
                  Закрыть
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
