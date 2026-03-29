"use client";

import { useState } from "react";

interface Appointment {
  id: number;
  startTime: string;
  endTime: string;
  serviceName: string;
  clientName: string;
  clientPhone: string;
  clientTelegramId?: string;
  clientNote?: string;
}

interface WorkSlot {
  startTime: string;
  endTime: string;
}

interface MasterDayScheduleProps {
  dayLabel: string;
  appointments: Appointment[];
  workSlot: WorkSlot | null;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

interface ScheduleItem {
  type: "appointment" | "free";
  startTime: string;
  endTime: string;
  appointment?: Appointment;
}

function buildScheduleItems(appointments: Appointment[], workSlot: WorkSlot | null): ScheduleItem[] {
  if (!workSlot) {
    return appointments.map((a) => ({
      type: "appointment",
      startTime: a.startTime,
      endTime: a.endTime,
      appointment: a,
    }));
  }

  const sorted = [...appointments].sort(
    (a, b) => timeToMin(a.startTime) - timeToMin(b.startTime)
  );
  const items: ScheduleItem[] = [];
  let cursor = timeToMin(workSlot.startTime);
  const slotEnd = timeToMin(workSlot.endTime);

  for (const apt of sorted) {
    const aptStart = timeToMin(apt.startTime);
    if (aptStart > cursor && aptStart - cursor >= 30) {
      items.push({
        type: "free",
        startTime: minToTime(cursor),
        endTime: minToTime(aptStart),
      });
    }
    items.push({
      type: "appointment",
      startTime: apt.startTime,
      endTime: apt.endTime,
      appointment: apt,
    });
    cursor = Math.max(cursor, timeToMin(apt.endTime));
  }

  if (slotEnd > cursor && slotEnd - cursor >= 30) {
    items.push({
      type: "free",
      startTime: minToTime(cursor),
      endTime: minToTime(slotEnd),
    });
  }

  return items;
}

export default function MasterDaySchedule({ dayLabel, appointments, workSlot }: MasterDayScheduleProps) {
  const items = buildScheduleItems(appointments, workSlot);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="px-5 pb-24">
      <div className="text-[12px] font-semibold text-gray-900 mb-2.5 tracking-wide">
        {dayLabel}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Нет записей на этот день
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map((item, i) => {
          if (item.type === "free") {
            return (
              <div
                key={`free-${i}`}
                className="flex bg-gray-50 rounded-xl p-3.5"
                style={{ borderLeft: "3px solid #E8E8E8" }}
              >
                <div className="min-w-[48px]">
                  <div className="text-sm font-bold text-gray-300">{item.startTime}</div>
                  <div className="text-[10px] text-gray-300">{item.endTime}</div>
                </div>
                <div className="flex-1 pl-1">
                  <div className="text-xs text-gray-400">Свободное окно</div>
                </div>
              </div>
            );
          }

          const apt = item.appointment!;
          const isExpanded = expandedId === apt.id;

          return (
            <div
              key={apt.id}
              className="bg-white rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden"
              style={{ borderLeft: "3px solid #B2223C" }}
            >
              <div
                onClick={() => setExpandedId(isExpanded ? null : apt.id)}
                className="w-full flex p-3.5 text-left cursor-pointer"
              >
                <div className="min-w-[48px]">
                  <div className="text-sm font-bold text-gray-900">{apt.startTime}</div>
                  <div className="text-[10px] text-gray-400">{apt.endTime}</div>
                </div>
                <div className="flex-1 pl-1">
                  <div className="text-[13px] font-semibold text-gray-900">{apt.serviceName}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{apt.clientName}</div>
                </div>
                <div className="flex items-center text-gray-300 text-sm">
                  {isExpanded ? "▲" : "▼"}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {/* Client info */}
                  <div className="text-xs text-gray-500 mb-3">
                    <div className="font-medium text-gray-900 mb-1">{apt.clientName}</div>
                    {apt.clientPhone && (
                      <div className="text-gray-400">{apt.clientPhone}</div>
                    )}
                  </div>

                  {/* Client note */}
                  {apt.clientNote && (
                    <div className="mb-3 bg-gray-50 rounded-lg p-2.5">
                      <div className="text-[10px] text-gray-400 font-medium mb-1">Заметка</div>
                      <div className="text-[11px] text-gray-600">{apt.clientNote}</div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {apt.clientPhone && (
                      <a
                        href={`tel:${apt.clientPhone}`}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-white text-center active:opacity-80"
                        style={{ background: "#B2223C" }}
                      >
                        📞 Позвонить
                      </a>
                    )}
                    {apt.clientTelegramId && (
                      <a
                        href={`tg://user?id=${apt.clientTelegramId}`}
                        className="flex-1 py-2.5 rounded-lg text-xs font-semibold text-center border active:opacity-80"
                        style={{ color: "#B2223C", borderColor: "#B2223C" }}
                      >
                        ✈️ Telegram
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
