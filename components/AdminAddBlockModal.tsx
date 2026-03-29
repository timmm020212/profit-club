"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  masters: { id: number; fullName: string }[];
  services: { id: number; name: string }[];
  prefillMasterId?: number;
  prefillStartTime?: string;
  date: string;
}

export default function AdminAddBlockModal({ isOpen, onClose, masters, services, prefillMasterId, prefillStartTime, date }: Props) {
  const router = useRouter();
  const [masterId, setMasterId] = useState(prefillMasterId || 0);
  const [blockType, setBlockType] = useState("appointment");
  const [customType, setCustomType] = useState("");
  const [startTime, setStartTime] = useState(prefillStartTime || "10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefillMasterId) setMasterId(prefillMasterId);
    if (prefillStartTime) {
      setStartTime(prefillStartTime);
      const [h, m] = prefillStartTime.split(":").map(Number);
      setEndTime(`${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }, [prefillMasterId, prefillStartTime]);

  const handleSubmit = async () => {
    if (!masterId) return;
    setSaving(true);
    try {
      const finalType = blockType === "custom" ? (customType || "Другое") : blockType;
      await fetch("/api/admin/schedule-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId, date, startTime, endTime,
          blockType: finalType,
          clientName: blockType === "appointment" ? clientName : undefined,
          clientPhone: blockType === "appointment" ? clientPhone : undefined,
          serviceId: blockType === "appointment" && serviceId ? serviceId : undefined,
          comment: comment || undefined,
        }),
      });
      router.refresh();
      onClose();
      setBlockType("appointment"); setCustomType(""); setClientName(""); setClientPhone(""); setServiceId(0); setComment("");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0F0F13] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-base font-semibold text-zinc-100">Добавить в расписание</h2>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Мастер</label>
            <select value={masterId} onChange={(e) => setMasterId(Number(e.target.value))}
              className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100">
              <option value={0}>Выберите мастера</option>
              {masters.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Тип</label>
            <div className="flex gap-2">
              {[{ key: "appointment", label: "📋 Запись" }, { key: "break", label: "☕ Перерыв" }, { key: "custom", label: "📌 Другое" }].map((t) => (
                <button key={t.key} onClick={() => setBlockType(t.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors border ${blockType === t.key ? "bg-violet-600/20 border-violet-500/30 text-violet-300" : "bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:bg-white/[0.06]"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {blockType === "custom" && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Название</label>
              <input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Например: Обучение..."
                className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100" />
            </div>
          )}
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
          {blockType === "appointment" && (
            <>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Имя клиента</label>
                <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Имя клиента"
                  className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Телефон</label>
                <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="+7 900 123-45-67"
                  className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100" />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Услуга</label>
                <select value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100">
                  <option value={0}>Выберите услугу</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Комментарий</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Необязательно..." rows={2}
              className="w-full rounded-lg bg-[#1C1C22] border border-white/[0.08] px-3 py-2 text-sm text-zinc-100 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/[0.07] bg-white/[0.03] text-sm text-zinc-300 hover:bg-white/[0.07]">Отмена</button>
          <button onClick={handleSubmit} disabled={saving || !masterId}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Создаём..." : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}
