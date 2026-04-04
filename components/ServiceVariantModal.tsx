"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface Variant {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (variant: Variant) => void;
  serviceName: string;
  variants: Variant[];
}

export default function ServiceVariantModal({ isOpen, onClose, onSelect, serviceName, variants }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const variant = variants.find((v) => v.id === selectedId);
    if (variant) onSelect(variant);
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-[#111115] border border-white/[0.08] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-white">{serviceName}</h3>
          <p className="text-xs text-zinc-500 mt-1">Выберите вариант</p>
        </div>

        <div className="px-5 pb-3 space-y-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                selectedId === v.id
                  ? "border-[#B2223C] bg-[#B2223C]/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="text-left">
                <div className={`text-sm font-medium ${selectedId === v.id ? "text-white" : "text-zinc-300"}`}>
                  {v.name}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{v.duration} мин</div>
              </div>
              <div className={`text-sm font-bold ${selectedId === v.id ? "text-[#e8556e]" : "text-zinc-400"}`}>
                {v.price.toLocaleString()} ₽
              </div>
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-sm text-zinc-400">
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: selectedId ? "#B2223C" : "rgba(178,34,60,0.3)" }}
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
