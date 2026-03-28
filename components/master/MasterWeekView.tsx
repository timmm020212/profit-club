"use client";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

interface MasterWeekViewProps {
  weekDates: string[];
  selectedDate: string;
  appointmentCounts: Record<string, number>;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

function formatWeekLabel(dates: string[]): string {
  if (dates.length < 7) return "";
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[6] + "T00:00:00");
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} — ${last.getDate()} ${MONTH_NAMES[first.getMonth()]}`;
  }
  return `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} — ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`;
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekday = d.toLocaleDateString("ru-RU", { weekday: "long" });
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${day} ${month}`;
}

export { formatDayLabel };

export default function MasterWeekView({
  weekDates,
  selectedDate,
  appointmentCounts,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
}: MasterWeekViewProps) {
  return (
    <div className="px-5 pt-4">
      <div className="flex items-center justify-between mb-3.5">
        <button
          onClick={onPrevWeek}
          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-sm"
        >
          ‹
        </button>
        <span className="text-[13px] font-semibold text-gray-900 tracking-wide">
          {formatWeekLabel(weekDates)}
        </span>
        <button
          onClick={onNextWeek}
          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 text-sm"
        >
          ›
        </button>
      </div>

      <div className="flex gap-1 mb-4">
        {weekDates.map((date, i) => {
          const d = new Date(date + "T00:00:00");
          const dayNum = d.getDate();
          const isSelected = date === selectedDate;
          const hasAppointments = (appointmentCounts[date] || 0) > 0;

          return (
            <button
              key={date}
              onClick={() => onSelectDate(date)}
              className={`flex-1 text-center py-2 rounded-[10px] transition-colors ${
                isSelected
                  ? "text-white"
                  : "bg-white border border-gray-200"
              }`}
              style={isSelected ? { background: "#B2223C" } : undefined}
            >
              <div
                className="text-[10px] font-medium"
                style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "#888" }}
              >
                {DAY_NAMES[i]}
              </div>
              <div
                className="text-[15px] font-semibold"
                style={{ color: isSelected ? "#fff" : "#1A1A1A" }}
              >
                {dayNum}
              </div>
              <div
                className="w-[5px] h-[5px] rounded-full mx-auto mt-1"
                style={{
                  background: isSelected
                    ? "rgba(255,255,255,0.5)"
                    : hasAppointments
                    ? "#B2223C"
                    : "#ddd",
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
