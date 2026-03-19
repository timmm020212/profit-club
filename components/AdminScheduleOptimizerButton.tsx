"use client";

import { useState, useEffect, useRef } from "react";
import AdminScheduleOptimizer from "./AdminScheduleOptimizer";

interface Props {
  masterId: number;
  workDate: string;
  masterName: string;
}

export default function AdminScheduleOptimizerButton({ masterId, workDate, masterName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [pulse, setPulse] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for accepted/declined responses when modal is closed
  useEffect(() => {
    if (isOpen) {
      // Stop polling while modal is open
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    // Poll every 5s to check for client responses
    const check = async () => {
      try {
        const res = await fetch(`/api/admin/optimize-schedule?masterId=${masterId}&workDate=${workDate}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const opt = data[0];
          const hasResponse = opt.moves?.some(
            (m: any) => m.status === "accepted" || m.status === "declined" || m.clientResponse === "accepted" || m.clientResponse === "declined"
          );
          if (hasResponse && !hasUpdate) {
            setHasUpdate(true);
            setPulse(true);
            setTimeout(() => setPulse(false), 3000);
          }
        }
      } catch {}
    };

    pollRef.current = setInterval(check, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen, masterId, workDate, hasUpdate]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUpdate(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="relative inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-violet-200 transition-all duration-300 hover:scale-[1.03] active:scale-95"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.08))",
          border: "1px solid rgba(139,92,246,0.25)",
          boxShadow: pulse
            ? "0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.15)"
            : "0 2px 8px rgba(139,92,246,0.1)",
        }}
        title="Оптимизировать расписание"
      >
        {/* Lightning icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-300">
          <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 17.25 8h-6.572l1.305-6.093Z" />
        </svg>
        <span>Оптимизировать</span>

        {/* Notification dot */}
        {hasUpdate && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="white" className="w-2.5 h-2.5">
                <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
              </svg>
            </span>
          </span>
        )}
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
