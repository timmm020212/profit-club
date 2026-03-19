"use client";

import { useState } from "react";
import AdminScheduleOptimizer from "./AdminScheduleOptimizer";

interface Props {
  masterId: number;
  workDate: string;
  masterName: string;
}

export default function AdminScheduleOptimizerButton({ masterId, workDate, masterName }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-violet-300 bg-violet-500/[0.08] hover:bg-violet-500/[0.15] border border-violet-500/15 transition-all"
        title="Оптимизировать расписание"
      >
        <span>&#9889;</span>
        <span className="hidden sm:inline">Оптимизировать</span>
      </button>

      {isOpen && (
        <AdminScheduleOptimizer
          masterId={masterId}
          workDate={workDate}
          masterName={masterName}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
