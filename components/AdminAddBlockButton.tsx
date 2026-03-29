"use client";

import { useState } from "react";
import AdminAddBlockModal from "./AdminAddBlockModal";

interface Props {
  masters: { id: number; fullName: string }[];
  services: { id: number; name: string }[];
  date: string;
  prefillMasterId?: number;
  prefillStartTime?: string;
}

export default function AdminAddBlockButton({ masters, services, date, prefillMasterId, prefillStartTime }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-3 py-1.5 text-xs font-medium text-violet-300 hover:bg-violet-500/15 transition-all">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
        </svg>
        Добавить
      </button>
      <AdminAddBlockModal isOpen={open} onClose={() => setOpen(false)} masters={masters} services={services}
        date={date} prefillMasterId={prefillMasterId} prefillStartTime={prefillStartTime} />
    </>
  );
}
