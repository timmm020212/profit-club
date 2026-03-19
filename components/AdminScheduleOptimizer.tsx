"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

interface OptimizeMove {
  id: number;
  appointmentId: number;
  clientName: string;
  serviceName: string;
  oldStartTime: string;
  oldEndTime: string;
  newStartTime: string;
  newEndTime: string;
  status: "pending" | "sent" | "accepted" | "declined";
  clientTelegramId?: string | null;
  clientTelegramUsername?: string | null;
}

interface Optimization {
  id: number;
  moves: OptimizeMove[];
}

interface Props {
  masterId: number;
  workDate: string;
  masterName: string;
  onClose: () => void;
}

export default function AdminScheduleOptimizer({ masterId, workDate, masterName, onClose }: Props) {
  const [phase, setPhase] = useState<"loading" | "results" | "error">("loading");
  const [optimization, setOptimization] = useState<Optimization | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingMoveId, setEditingMoveId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [savingMove, setSavingMove] = useState(false);

  const refreshStatuses = useCallback(async (optId: number) => {
    try {
      const res = await fetch(`/api/admin/optimize-schedule?masterId=${masterId}&workDate=${workDate}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) {
        const opt = data.find((o: any) => o.id === optId);
        if (opt) setOptimization(opt);
      }
    } catch {}
  }, [masterId, workDate]);

  const calculate = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      // Check if optimization already exists
      const checkRes = await fetch(`/api/admin/optimize-schedule?masterId=${masterId}&workDate=${workDate}`);
      const checkData = await checkRes.json();
      if (checkRes.ok && Array.isArray(checkData) && checkData.length > 0) {
        setOptimization(checkData[0]);
        setPhase("results");
        return;
      }

      const res = await fetch("/api/admin/optimize-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterId, workDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка расчёта");
      setOptimization(data.optimization || { id: 0, moves: data.moves || [] });
      setPhase("results");
    } catch (e: any) {
      setError(e?.message || "Ошибка при расчёте оптимизации");
      setPhase("error");
    }
  }, [masterId, workDate]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  // Poll for status updates every 3 seconds when sent
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (optimization?.status === "sent" || optimization?.moves.some(m => m.status === "sent")) {
      pollRef.current = setInterval(() => {
        if (optimization?.id) refreshStatuses(optimization.id);
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [optimization?.id, optimization?.status, refreshStatuses]);

  const handleEditMove = (move: OptimizeMove) => {
    setEditingMoveId(move.id);
    setEditStart(move.newStartTime);
    setEditEnd(move.newEndTime);
  };

  const handleSaveMove = async (moveId: number) => {
    setSavingMove(true);
    try {
      const res = await fetch("/api/admin/optimize-schedule/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moveId, newStartTime: editStart, newEndTime: editEnd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка сохранения");
      if (optimization) {
        setOptimization({
          ...optimization,
          moves: optimization.moves.map((m) =>
            m.id === moveId ? { ...m, newStartTime: editStart, newEndTime: editEnd } : m
          ),
        });
      }
      setEditingMoveId(null);
    } catch (e: any) {
      setError(e?.message || "Ошибка при сохранении");
    } finally {
      setSavingMove(false);
    }
  };

  const handleSendProposals = async () => {
    if (!optimization) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/optimize-schedule/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optimizationId: optimization.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка отправки");
      // Update moves to sent status and refresh
      setOptimization({
        ...optimization,
        status: "sent",
        moves: optimization.moves.map((m) => ({ ...m, status: "sent" as const })),
      } as any);
      // Refresh from server after a moment
      setTimeout(() => { if (optimization?.id) refreshStatuses(optimization.id); }, 1000);
    } catch (e: any) {
      setError(e?.message || "Ошибка при отправке предложений");
    } finally {
      setSending(false);
    }
  };

  const [applied, setApplied] = useState(false);

  const handleApplyAccepted = async () => {
    if (!optimization) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/optimize-schedule/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optimizationId: optimization.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Ошибка применения");
      setApplied(true);
      // Stop polling
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    } catch (e: any) {
      setError(e?.message || "Ошибка при применении");
    } finally {
      setApplying(false);
    }
  };

  const hasPending = optimization?.moves.some((m) => m.status === "pending");
  const hasSent = optimization?.moves.some((m) => m.status === "sent");
  const hasAccepted = optimization?.moves.some((m) => m.status === "accepted");
  const allResolved = optimization?.moves.every((m) => m.status === "accepted" || m.status === "declined");

  const statusBadge = (status: OptimizeMove["status"]) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-zinc-500/[0.08] border border-zinc-500/15 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            Черновик
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/[0.08] border border-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            <span>&#128336;</span> Ожидает
          </span>
        );
      case "accepted":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <span>&#9989;</span> Согласился
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1 rounded-lg bg-red-500/[0.08] border border-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
            <span>&#10060;</span> Отказался
          </span>
        );
    }
  };

  const formatDate = (d: string) => {
    const parts = d.split("-");
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-violet-500/20 to-transparent pointer-events-none" />

        <div className="relative rounded-2xl bg-[#0D0D11] border border-white/[0.07] shadow-2xl shadow-black/70 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.07] to-transparent pointer-events-none" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-violet-800/20 border border-violet-500/20 shadow-lg shadow-violet-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-300">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white leading-tight flex items-center gap-2">
                    <span>&#9889;</span> Оптимизация расписания
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {masterName} &middot; {formatDate(workDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent flex-shrink-0" />

          {/* Error alert */}
          {error && (
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="flex items-center gap-2.5 rounded-xl bg-red-500/[0.07] border border-red-500/15 px-3.5 py-2.5 text-xs text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                  <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0-10a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5zm0 7.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-5 overflow-y-auto flex-1">

            {/* Applied / Completed state */}
            {(applied || optimization?.status === "completed") && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-emerald-400">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-emerald-300">Оптимизировано</p>
                  <p className="text-xs text-zinc-500 mt-1">Согласованные записи перенесены</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07] transition-all"
                >
                  Закрыть
                </button>
              </div>
            )}

            {/* Loading state */}
            {phase === "loading" && !applied && optimization?.status !== "completed" && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <span className="h-8 w-8 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
                <p className="text-sm text-zinc-400">Рассчитываем оптимальное расписание...</p>
              </div>
            )}

            {/* Error state */}
            {phase === "error" && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/[0.06] border border-red-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-red-400">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-400">{error || "Произошла ошибка"}</p>
                <button
                  type="button"
                  onClick={calculate}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium text-white transition-all"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Results: no moves */}
            {phase === "results" && !applied && optimization?.status !== "completed" && optimization && optimization.moves.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-emerald-400">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-200">Расписание уже оптимально</p>
                  <p className="text-xs text-zinc-500 mt-1">Нет предложений по улучшению</p>
                </div>
              </div>
            )}

            {/* Results: moves exist */}
            {phase === "results" && !applied && optimization?.status !== "completed" && optimization && optimization.moves.length > 0 && (
              <div className="space-y-4">
                {/* Column headers */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_140px_24px_140px_80px_40px] gap-2 items-center px-3 pb-2 border-b border-white/[0.05]">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">Клиент / Услуга</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 text-center">Сейчас</span>
                  <span />
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 text-center">Предложение</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600 text-center">Статус</span>
                  <span />
                </div>

                {/* Move rows */}
                {optimization.moves.map((move) => (
                  <div key={move.id} className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                    <div className="grid sm:grid-cols-[1fr_140px_24px_140px_80px_40px] gap-2 items-center px-3 py-3">
                      {/* Client & service */}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-200 truncate">{move.clientName}</p>
                        <p className="text-[11px] text-zinc-500 truncate">{move.serviceName}</p>
                      </div>

                      {/* Old time */}
                      <div className="text-center">
                        <span className="inline-flex items-center rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-xs font-mono text-zinc-300 tabular-nums">
                          {move.oldStartTime}&ndash;{move.oldEndTime}
                        </span>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-violet-400">
                          <path fillRule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clipRule="evenodd" />
                        </svg>
                      </div>

                      {/* New time (or edit inputs) */}
                      <div className="text-center">
                        {editingMoveId === move.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className="w-[72px] rounded-lg bg-white/[0.06] border border-violet-500/30 px-1.5 py-1 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-violet-500/50"
                            />
                            <span className="text-zinc-600 text-[10px]">&ndash;</span>
                            <input
                              type="time"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className="w-[72px] rounded-lg bg-white/[0.06] border border-violet-500/30 px-1.5 py-1 text-[11px] font-mono text-zinc-100 focus:outline-none focus:border-violet-500/50"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-violet-500/[0.08] border border-violet-500/15 px-2.5 py-1 text-xs font-mono text-violet-300 tabular-nums">
                            {move.newStartTime}&ndash;{move.newEndTime}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-center">
                        {statusBadge(move.status)}
                      </div>

                      {/* Edit / save button */}
                      <div className="flex items-center justify-center">
                        {editingMoveId === move.id ? (
                          <button
                            type="button"
                            onClick={() => handleSaveMove(move.id)}
                            disabled={savingMove}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all disabled:opacity-50"
                            title="Сохранить"
                          >
                            {savingMove ? (
                              <span className="h-3 w-3 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ) : (
                          move.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleEditMove(move)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                              title="Редактировать время"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
                                <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                              </svg>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Declined: show telegram link */}
                    {move.status === "declined" && (move.clientTelegramUsername || move.clientTelegramId) && (
                      <div className="px-3 pb-2.5">
                        <a
                          href={move.clientTelegramUsername
                            ? `https://t.me/${move.clientTelegramUsername.replace(/^@/, "")}`
                            : `tg://user?id=${move.clientTelegramId}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M4.72 3.97a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06L4.72 5.03a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M13 4.5a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-.75.75H7.75a.75.75 0 0 1 0-1.5h4.5V5.25A.75.75 0 0 1 13 4.5Z" clipRule="evenodd" />
                          </svg>
                          {move.clientTelegramUsername
                            ? `@${move.clientTelegramUsername.replace(/^@/, "")}`
                            : `Telegram ID: ${move.clientTelegramId}`
                          }
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer buttons */}
          {phase === "results" && !applied && optimization?.status !== "completed" && optimization && optimization.moves.length > 0 && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent flex-shrink-0" />
              <div className="px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07] transition-all"
                >
                  Закрыть
                </button>

                {hasPending && (
                  <button
                    type="button"
                    onClick={handleSendProposals}
                    disabled={sending}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-violet-900/25"
                  >
                    {sending ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Отправляем...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M2.87 2.298a.75.75 0 0 0-.812 1.021L3.39 6.624a1 1 0 0 0 .928.626H8.25a.75.75 0 0 1 0 1.5H4.318a1 1 0 0 0-.927.626l-1.333 3.305a.75.75 0 0 0 .811 1.022l11.502-3.593a.75.75 0 0 0 0-1.42L2.87 2.298Z" />
                        </svg>
                        Отправить предложения
                      </>
                    )}
                  </button>
                )}

                {(hasSent || allResolved) && hasAccepted && (
                  <button
                    type="button"
                    onClick={handleApplyAccepted}
                    disabled={applying}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/25"
                  >
                    {applying ? (
                      <>
                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Применяем...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                        </svg>
                        Применить согласованные
                      </>
                    )}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Footer for empty/close-only states */}
          {phase === "results" && !applied && optimization?.status !== "completed" && optimization && optimization.moves.length === 0 && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent flex-shrink-0" />
              <div className="px-6 py-4 flex items-center justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07] transition-all"
                >
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
