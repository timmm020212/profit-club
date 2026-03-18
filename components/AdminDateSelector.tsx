"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

const DAYS_RU = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WINDOW = 7;
const STEP = 3;

export default function AdminDateSelector({ currentDate }: { currentDate: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const today = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // windowStart — отдельный параметр, не привязан к выбранной дате
  const windowStart = params.get("start") ?? (() => {
    // По умолчанию: показываем окно так, чтобы выбранная дата была по центру
    return addDays(currentDate, -Math.floor(WINDOW / 2));
  })();

  const days = useMemo(() => {
    return Array.from({ length: WINDOW }, (_, i) => {
      const dateStr = addDays(windowStart, i);
      const d = new Date(dateStr + "T00:00:00");
      return { dateStr, day: d.getDate(), weekday: DAYS_RU[d.getDay()] };
    });
  }, [windowStart]);

  function navigate(newStart: string, newDate?: string) {
    const date = newDate ?? currentDate;
    router.push(`/admin?date=${date}&start=${newStart}`);
  }

  return (
    <div className="flex items-center gap-1 select-none">
      <button
        type="button"
        onClick={() => navigate(addDays(windowStart, -STEP))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.07] transition-all flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
      </button>

      <div className="flex items-center gap-0.5">
        {days.map(({ dateStr, day, weekday }) => {
          const isActive = dateStr === currentDate;
          const isToday = dateStr === today;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => navigate(windowStart, dateStr)}
              className={`relative flex flex-col items-center justify-center rounded-xl w-10 h-14 transition-all duration-150 ${
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              }`}
            >
              <span className={`text-[10px] font-medium uppercase tracking-wide mb-0.5 ${isActive ? "text-violet-300" : "text-zinc-600"}`}>
                {weekday}
              </span>
              <span className="text-sm font-bold leading-none">{day}</span>
              {isToday && !isActive && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-violet-500" />
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => navigate(addDays(windowStart, STEP))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.07] transition-all flex-shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06L7.28 11.78a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
}
