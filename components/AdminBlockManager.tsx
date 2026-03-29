"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface Block {
  id: number;
  masterId: number;
  blockDate: string;
  startTime: string;
  endTime: string;
  blockType: string;
  status: string;
  comment: string | null;
}

interface Props {
  block: Block;
  masters: { id: number; fullName: string }[];
  cardHeight?: number;
}

const STATUS_COLORS: Record<string, { border: string; badge: string; label: string }> = {
  scheduled: { border: "rgba(156,163,175,0.5)", badge: "bg-zinc-500/20 text-zinc-400", label: "Запланировано" },
  active: { border: "rgba(59,130,246,0.6)", badge: "bg-blue-500/20 text-blue-400", label: "Активно" },
  finished: { border: "rgba(34,197,94,0.6)", badge: "bg-green-500/20 text-green-400", label: "Завершено" },
};

export default function AdminBlockManager({ block, masters, cardHeight }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [startTime, setStartTime] = useState(block.startTime);
  const [endTime, setEndTime] = useState(block.endTime);
  const [blockType, setBlockType] = useState(block.blockType);
  const [comment, setComment] = useState(block.comment || "");
  const [saving, setSaving] = useState(false);

  const isBreak = block.blockType === "break";
  const statusCfg = STATUS_COLORS[block.status] || STATUS_COLORS.scheduled;
  const masterName = masters.find((m) => m.id === block.masterId)?.fullName || "Мастер";

  const isTiny = (cardHeight ?? 999) < 38;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/schedule-block", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: block.id, startTime, endTime, blockType, comment: comment || null }),
      });
      router.refresh();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Удалить этот блок?")) return;
    try {
      await fetch(`/api/admin/schedule-block?id=${block.id}&type=block`, { method: "DELETE" });
      router.refresh();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const card = (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="group w-full h-full text-left rounded-lg border hover:brightness-125 transition-all duration-200 overflow-hidden"
      style={{
        borderColor: isBreak ? "rgba(59,130,246,0.3)" : "rgba(156,163,175,0.3)",
        background: isBreak ? "rgba(59,130,246,0.08)" : "rgba(156,163,175,0.08)",
        borderLeft: `2px solid ${statusCfg.border}`,
      }}
    >
      {isTiny ? (
        <div className="flex items-center h-full px-2 gap-2">
          <span className="text-[10px] font-bold tabular-nums whitespace-nowrap" style={{ color: isBreak ? "#60A5FA" : "#9CA3AF" }}>
            {block.startTime}
          </span>
          <span className="text-[10px] truncate" style={{ color: isBreak ? "#60A5FA" : "#9CA3AF" }}>
            {isBreak ? "☕ Перерыв" : `📌 ${block.blockType}`}
          </span>
        </div>
      ) : (
        <div className="px-2 py-1 h-full flex flex-col justify-center">
          <div className="flex items-center justify-between gap-1">
            <div className="text-[10px] font-medium" style={{ color: isBreak ? "#60A5FA" : "#9CA3AF" }}>
              {isBreak ? "☕ Перерыв" : `📌 ${block.blockType}`}
            </div>
            <span className={`text-[7px] font-semibold px-1 py-0.5 rounded-full ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>
          </div>
          <div className="text-[9px] tabular-nums mt-0.5" style={{ color: isBreak ? "#60A5FA" : "#9CA3AF" }}>
            {block.startTime}–{block.endTime}
          </div>
          {block.comment && (cardHeight ?? 999) > 50 && (
            <div className="text-[9px] text-zinc-500 truncate mt-0.5">{block.comment}</div>
          )}
        </div>
      )}
    </button>
  );

  const modal = isOpen ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0F0F13] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            {isBreak ? "☕ Перерыв" : `📌 ${block.blockType}`}
          </h2>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.badge}`}>
            {statusCfg.label}
          </span>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="text-sm text-zinc-400">
            Мастер: <span className="text-zinc-200">{masterName}</span>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Тип блока</label>
            <input
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Начало</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Конец</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100" />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Комментарий</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100 resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
          <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-300">
            Удалить
          </button>
          <div className="flex gap-2">
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07]">
              Отмена
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      {card}
      {modal}
    </>
  );
}
