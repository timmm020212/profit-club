"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Users, Calendar, Clock, Gift } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

interface ModernCalendarProps {
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  selectedTime?: string
  onTimeSelect?: (time: string) => void
  participants?: number
  onParticipantsChange?: (count: number) => void
  mode?: "booking" | "gift"
  onModeChange?: (mode: "booking" | "gift") => void
}

export function ModernCalendar({
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeSelect,
  participants = 1,
  onParticipantsChange,
  mode = "booking",
  onModeChange
}: ModernCalendarProps) {
  const [showCalendar, setShowCalendar] = React.useState(false)
  const [showTimePicker, setShowTimePicker] = React.useState(false)

  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", 
    "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
  ]

  const handleDateClick = (date: Date | undefined) => {
    if (date) {
      onDateSelect?.(date)
      setShowCalendar(false)
      setShowTimePicker(true)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Вкладки */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => onModeChange?.("booking")}
          className={cn(
            "flex-1 py-4 px-6 text-center font-medium transition-all duration-200 relative",
            mode === "booking"
              ? "text-gray-900 bg-gray-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
          )}
        >
          Бронирование
          {mode === "booking" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button
          onClick={() => onModeChange?.("gift")}
          className={cn(
            "flex-1 py-4 px-6 text-center font-medium transition-all duration-200 relative",
            mode === "gift"
              ? "text-gray-900 bg-gray-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50/50"
          )}
        >
          Подарок
          {mode === "gift" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Выбор участников */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-gray-900 font-medium">Участники</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onParticipantsChange?.(Math.max(1, participants - 1))}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600 font-medium">−</span>
            </button>
            <span className="w-8 text-center font-medium text-gray-900">{participants}</span>
            <button
              onClick={() => onParticipantsChange?.(participants + 1)}
              className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600 font-medium">+</span>
            </button>
          </div>
        </div>

        {/* Выбор даты */}
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white"
        >
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-gray-900">
              {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: ru }) : "Дата"}
            </span>
          </div>
          <ChevronRight className={cn(
            "w-5 h-5 text-gray-400 transition-transform duration-200",
            showCalendar && "rotate-90"
          )} />
        </button>

        {/* Календарь */}
        {showCalendar && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateClick}
              locale={ru}
              required={false}
              disabled={(date) => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return date < today
              }}
              className="modern-calendar"
              classNames={{
                months: "flex flex-col space-y-4",
                month: "space-y-4",
                caption: "flex justify-between items-center pb-2",
                caption_label: "text-lg font-semibold text-gray-900",
                nav: "flex gap-2",
                nav_button: "w-8 h-8 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-colors",
                nav_button_previous: "",
                nav_button_next: "",
                table: "w-full space-y-2",
                head_row: "flex",
                head_cell: "text-xs font-medium text-gray-500 w-10 text-center",
                row: "flex w-full",
                cell: "text-center p-0",
                day: "w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center text-sm font-medium transition-colors cursor-pointer",
                day_selected: "bg-blue-500 text-white hover:bg-blue-600",
                day_today: "bg-gray-100 text-gray-900 font-semibold",
                day_outside: "text-gray-300",
                day_disabled: "text-gray-300 cursor-not-allowed",
              }}
            />
          </div>
        )}

        {/* Выбор времени */}
        <button
          onClick={() => setShowTimePicker(!showTimePicker)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors bg-white"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <span className="text-gray-900">{selectedTime || "Время"}</span>
          </div>
          <ChevronRight className={cn(
            "w-5 h-5 text-gray-400 transition-transform duration-200",
            showTimePicker && "rotate-90"
          )} />
        </button>

        {/* Выбор времени */}
        {showTimePicker && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-4 gap-2">
              {timeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => {
                    onTimeSelect?.(time)
                    setShowTimePicker(false)
                  }}
                  className={cn(
                    "py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                    selectedTime === time
                      ? "bg-blue-500 text-white"
                      : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Сводка */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Участник</span>
            <span className="text-gray-900 font-medium">{participants} чел.</span>
          </div>
        </div>

        {/* Кнопка действия */}
        <button
          className={cn(
            "w-full py-4 rounded-xl font-medium transition-all duration-200",
            selectedDate && selectedTime
              ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
          disabled={!selectedDate || !selectedTime}
        >
          {selectedDate && selectedTime ? "Продолжить" : "Выберите время"}
        </button>
      </div>

      <style jsx>{`
        .modern-calendar .rdp-head_cell {
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .modern-calendar .rdp-day {
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
