"use client";

import { useState, useEffect, useCallback } from "react";
import MasterHeader from "./MasterHeader";
import MasterWeekView, { formatDayLabel } from "./MasterWeekView";
import MasterDaySchedule from "./MasterDaySchedule";
import MasterTabBar from "./MasterTabBar";

interface Master {
  id: number;
  fullName: string;
  specialization: string;
  photoUrl: string | null;
}

interface Appointment {
  id: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
}

interface WorkSlot {
  workDate: string;
  startTime: string;
  endTime: string;
  isConfirmed: boolean;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftWeek(dateStr: string, offset: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + offset * 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MasterApp() {
  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workSlots, setWorkSlots] = useState<WorkSlot[]>([]);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg?.initData) {
      setError("Откройте через Telegram");
      setLoading(false);
      return;
    }
    tg.ready();
    tg.expand();
    try { tg.setHeaderColor("#FFFFFF"); } catch {}
    try { tg.setBackgroundColor("#FAFAFA"); } catch {}

    fetch("/api/master/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: tg.initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid && data.master) {
          setMaster(data.master);
        } else {
          setError(data.error || "Вы не зарегистрированы как мастер");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Ошибка авторизации");
        setLoading(false);
      });
  }, []);

  const fetchSchedule = useCallback(
    async (date: string) => {
      if (!master) return;
      try {
        const res = await fetch(
          `/api/master/schedule?masterId=${master.id}&date=${date}`
        );
        const data = await res.json();
        if (data.week) setWeekDates(data.week);
        if (data.appointments) setAppointments(data.appointments);
        if (data.workSlots) setWorkSlots(data.workSlots);
      } catch (e) {
        console.error("Schedule fetch error:", e);
      }
    },
    [master]
  );

  useEffect(() => {
    if (master) fetchSchedule(selectedDate);
  }, [master, selectedDate, fetchSchedule]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-8">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">🔒</div>
          <div className="text-gray-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!master) return null;

  const appointmentCounts: Record<string, number> = {};
  for (const apt of appointments) {
    appointmentCounts[apt.appointmentDate] =
      (appointmentCounts[apt.appointmentDate] || 0) + 1;
  }

  const dayAppointments = appointments.filter(
    (a) => a.appointmentDate === selectedDate
  );
  const daySlot = workSlots.find(
    (s) => s.workDate === selectedDate && s.isConfirmed
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <MasterHeader
        fullName={master.fullName}
        specialization={master.specialization}
        photoUrl={master.photoUrl}
      />
      <MasterWeekView
        weekDates={weekDates}
        selectedDate={selectedDate}
        appointmentCounts={appointmentCounts}
        onSelectDate={setSelectedDate}
        onPrevWeek={() => setSelectedDate(weekDates.length ? shiftWeek(weekDates[0], -1) : shiftWeek(selectedDate, -1))}
        onNextWeek={() => setSelectedDate(weekDates.length ? shiftWeek(weekDates[0], 1) : shiftWeek(selectedDate, 1))}
      />
      <MasterDaySchedule
        dayLabel={formatDayLabel(selectedDate)}
        appointments={dayAppointments}
        workSlot={daySlot ? { startTime: daySlot.startTime, endTime: daySlot.endTime } : null}
      />
      <MasterTabBar />
    </div>
  );
}
