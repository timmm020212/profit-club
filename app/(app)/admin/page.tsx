import { db } from "@/db";
import { appointments, masters, services, workSlots, scheduleBlocks } from "@/db/schema";
import AdminHeader from "@/components/AdminHeader";
import AdminWorkSlotsCreator from "@/components/AdminWorkSlotsCreator";
import AdminWorkSlotsList from "@/components/AdminWorkSlotsList";
import AdminWorkSlotChangeRequests from "@/components/AdminWorkSlotChangeRequests";
import AdminDateSelector from "@/components/AdminDateSelector";
import { Suspense } from "react";
import AdminAppointmentManager from "@/components/AdminAppointmentManager";
import AdminMasterCreator from "@/components/AdminMasterCreator";
import AdminRoleCreator from "@/components/AdminRoleCreator";
import AdminScheduleOptimizerButton from "@/components/AdminScheduleOptimizerButton";
import AdminAddBlockButton from "@/components/AdminAddBlockButton";
import AdminBlockManager from "@/components/AdminBlockManager";
import AdminAutoOptimizeDelay, { AdminOptimizeDelaySettings } from "@/components/AdminAutoOptimizeDelay";
import AutoRefresh from "@/components/AutoRefresh";
import { and, eq } from "drizzle-orm";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((v) => parseInt(v, 10));
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

async function getAdminDataForDate(dateStr: string) {
  const [appointmentsData, mastersData, servicesData, workSlotsData, blocksData] = await Promise.all([
    db.select().from(appointments)
      .where(eq(appointments.appointmentDate, dateStr))
      .orderBy(appointments.startTime as any),
    db.select().from(masters).where(eq(masters.isActive, true)),
    db.select().from(services),
    db.select().from(workSlots)
      .where(eq(workSlots.workDate, dateStr))
      .orderBy(workSlots.startTime as any),
    db.select().from(scheduleBlocks)
      .where(eq(scheduleBlocks.blockDate, dateStr)),
  ]);
  return { dateStr, appointmentsData, mastersData, servicesData, workSlotsData, blocksData };
}

const MONTHS_RU = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const DAYS_RU = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const requestedDate = typeof params?.date === "string" ? params.date : undefined;
  const currentDateStr = requestedDate || todayStr;

  const { dateStr, appointmentsData, mastersData, servicesData, workSlotsData, blocksData } =
    await getAdminDataForDate(currentDateStr);

  const now = new Date();
  const todayMidnight = new Date(now.toISOString().slice(0, 10) + "T00:00:00");
  const currentDateObj = new Date(dateStr + "T00:00:00");
  const diffDays = Math.floor((currentDateObj.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  const isPrebookingDate = diffDays >= 2;
  const isToday = dateStr === todayStr;

  const mastersMap = new Map<number, any>();
  mastersData.forEach((m: any) => mastersMap.set(m.id, m));
  const servicesMap = new Map<number, any>();
  servicesData.forEach((s: any) => servicesMap.set(s.id, s));

  // Only confirmed slots appear on the timeline
  const confirmedWorkSlotsData = workSlotsData.filter((w: any) => w.isConfirmed);

  const workSlotsByMaster = new Map<number, (typeof confirmedWorkSlotsData)[number][]>();
  confirmedWorkSlotsData.forEach((w) => {
    const arr = workSlotsByMaster.get(w.masterId) || [];
    arr.push(w);
    workSlotsByMaster.set(w.masterId, arr);
  });

  const appointmentsByMaster = new Map<number, (typeof appointmentsData)[number][]>();
  appointmentsData.forEach((a) => {
    const arr = appointmentsByMaster.get(a.masterId) || [];
    arr.push(a);
    appointmentsByMaster.set(a.masterId, arr);
  });

  const problemAppointments = appointmentsData.filter((a) => {
    const masterSlots = workSlotsByMaster.get(a.masterId) || [];
    if (!masterSlots.length) return true;
    const as = timeToMinutes(a.startTime);
    const ae = timeToMinutes(a.endTime);
    return !masterSlots.some((w) => {
      const ws = timeToMinutes(w.startTime);
      const we = timeToMinutes(w.endTime);
      return as >= ws && ae <= we;
    });
  });

  // Masters working today (only confirmed slots), sorted
  const masterIdsToday = Array.from(new Set(confirmedWorkSlotsData.map((w: any) => w.masterId)));
  const mastersToday = mastersData
    .filter((m: any) => masterIdsToday.includes(m.id))
    .sort((a: any, b: any) => (a.fullName || "").localeCompare(b.fullName || ""));

  // Timeline bounds
  let minMinutes = Infinity;
  let maxMinutes = -Infinity;
  confirmedWorkSlotsData.forEach((slot: any) => {
    const start = timeToMinutes(slot.startTime);
    const end = timeToMinutes(slot.endTime);
    if (start < minMinutes) minMinutes = start;
    if (end > maxMinutes) maxMinutes = end;
  });

  const hasTimeline = mastersToday.length > 0 && minMinutes !== Infinity;
  const roundedMin = hasTimeline ? Math.floor(minMinutes / 60) * 60 : 0;
  const roundedMax = hasTimeline ? Math.ceil(maxMinutes / 60) * 60 : 0;
  const totalDuration = roundedMax - roundedMin;
  const PX_PER_MIN = 2.5;
  const timelineHeight = Math.max(totalDuration * PX_PER_MIN, 200);

  const hourLabels = hasTimeline
    ? Array.from({ length: Math.ceil(totalDuration / 60) + 1 }, (_, i) => {
        const m = roundedMin + i * 60;
        return m <= roundedMax ? { minutes: m, label: minutesToTime(m), top: (m - roundedMin) * PX_PER_MIN } : null;
      }).filter(Boolean) as { minutes: number; label: string; top: number }[]
    : [];

  // Half-hour tick marks (between hours)
  const halfHourMarks = hasTimeline
    ? Array.from({ length: Math.ceil(totalDuration / 30) + 1 }, (_, i) => {
        const m = roundedMin + i * 30;
        return m <= roundedMax && m % 60 !== 0 ? { minutes: m, top: (m - roundedMin) * PX_PER_MIN } : null;
      }).filter(Boolean) as { minutes: number; top: number }[]
    : [];

  // Date display
  const selectedDateObj = new Date(dateStr + "T00:00:00");
  const dayName = DAYS_RU[selectedDateObj.getDay()];
  const dayNum = selectedDateObj.getDate();
  const monthName = MONTHS_RU[selectedDateObj.getMonth()];

  return (
    <div className="min-h-screen bg-[#070709] text-white">
      <AutoRefresh intervalMs={5000} />
      <AdminHeader masters={mastersData as any} />

      {/* Sticky subheader: date nav + stats */}
      <div className="sticky top-14 z-30 bg-[#070709]/95 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="mx-auto max-w-screen-2xl px-4 lg:px-6">
          <div className="flex items-center gap-4 py-3 overflow-x-auto">
            <div className="flex-shrink-0">
              <Suspense fallback={null}>
                <AdminDateSelector currentDate={dateStr} />
              </Suspense>
            </div>
            <div className="h-8 w-px bg-white/[0.07] flex-shrink-0 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
              <div className="flex flex-col">
                <span className="text-xs text-zinc-600 leading-none">дата</span>
                <span className="text-sm font-medium text-zinc-300 capitalize">
                  {dayName}, {dayNum} {monthName}
                  {isToday && <span className="ml-2 text-xs font-medium text-violet-400">сегодня</span>}
                </span>
              </div>
              <div className="h-6 w-px bg-white/[0.07]" />
              <StatChip icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M4 1.75a.75.75 0 0 1 1.5 0V3h5V1.75a.75.75 0 0 1 1.5 0V3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2V1.75ZM4.5 7a.5.5 0 0 0 0 1H6a.5.5 0 0 0 0-1H4.5Zm0 2.5a.5.5 0 0 0 0 1H6a.5.5 0 0 0 0-1H4.5Zm3.5-2.5a.5.5 0 0 0 0 1h1.5a.5.5 0 0 0 0-1H8Zm0 2.5a.5.5 0 0 0 0 1h1.5a.5.5 0 0 0 0-1H8Z" clipRule="evenodd" />
                </svg>
              } value={appointmentsData.length} label="записей" />
              {problemAppointments.length > 0 && (
                <StatChip icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-red-400">
                    <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.01-1 2.588 0l6.7 11.5c.577 1-.144 2.25-1.294 2.25H1.295C.145 16-.576 14.75 0 13.75l6.7-11.5ZM8 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                  </svg>
                } value={problemAppointments.length} label="проблем" danger />
              )}
              <div className="h-6 w-px bg-white/[0.07]" />
              <AdminMasterCreator masters={mastersData as any} />
              <AdminRoleCreator masters={mastersData as any} />
              <AdminAddBlockButton
                masters={(mastersData as any[]).map((m: any) => ({ id: m.id, fullName: m.fullName }))}
                services={(servicesData as any[]).map((s: any) => ({ id: s.id, name: s.name }))}
                date={dateStr}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-screen-2xl px-4 lg:px-6 py-5">
        <div className="grid lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-5 items-start">

          {/* ===== LEFT COLUMN: SCHEDULE ===== */}
          <div className="space-y-4 min-w-0">

            {/* Problem appointments */}
            {problemAppointments.length > 0 && (
              <section className="rounded-2xl border border-red-500/20 bg-red-950/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-red-500/10 flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-red-400">
                      <path fillRule="evenodd" d="M6.701 2.25c.577-1 2.01-1 2.588 0l6.7 11.5c.577 1-.144 2.25-1.294 2.25H1.295C.145 16-.576 14.75 0 13.75l6.7-11.5ZM8 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold text-red-300">Записи вне рабочего времени</span>
                  <span className="ml-auto inline-flex items-center rounded-full bg-red-500/15 border border-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400">
                    {problemAppointments.length}
                  </span>
                </div>
                <div className="p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {problemAppointments.map((a) => (
                    <AdminAppointmentManager key={a.id} appointment={a as any} masters={mastersData as any} services={servicesData as any} />
                  ))}
                </div>
              </section>
            )}

            {/* Main schedule area */}
            {!hasTimeline && (
              <section className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] flex flex-col items-center justify-center py-20">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.06] mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-zinc-700">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                </div>
                <p className="text-base font-medium text-zinc-500">Нет рабочих дней</p>
                <p className="text-sm text-zinc-700 mt-1">Добавьте рабочий день в панели справа</p>
              </section>
            )}

            {hasTimeline && (
              <section className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-white">
                    {isPrebookingDate ? "Предварительные записи" : "Расписание"}
                  </h2>
                  <span className="text-xs text-zinc-600">
                    {mastersToday.length} {mastersToday.length === 1 ? "мастер" : mastersToday.length < 5 ? "мастера" : "мастеров"}
                  </span>
                </div>

                {/* Visual timeline */}
                <div className="overflow-x-auto">
                  <div className="flex" style={{ minWidth: `${mastersToday.length * 220 + 64}px` }}>
                    {/* Time axis */}
                    <div className="flex-shrink-0 w-16 relative" style={{ height: `${timelineHeight + 48}px` }}>
                      <div className="h-10 border-b border-white/[0.05]" />
                      <div className="relative" style={{ height: `${timelineHeight}px` }}>
                        {hourLabels.map((h) => (
                          <div
                            key={h.minutes}
                            className="absolute right-0 flex items-center justify-end pr-3 w-full"
                            style={{ top: `${h.top}px`, transform: "translateY(-50%)" }}
                          >
                            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">{h.label}</span>
                          </div>
                        ))}
                        {/* Half-hour ticks on time axis */}
                        {halfHourMarks.map((h) => (
                          <div
                            key={`half-${h.minutes}`}
                            className="absolute right-3 flex items-center justify-end"
                            style={{ top: `${h.top}px`, transform: "translateY(-50%)" }}
                          >
                            <span className="text-[9px] font-mono text-zinc-700 tabular-nums">{minutesToTime(h.minutes)}</span>
                          </div>
                        ))}
                        {/* Hour grid lines */}
                        {hourLabels.map((h) => (
                          <div
                            key={`line-${h.minutes}`}
                            className="absolute left-0 right-0 border-t border-white/[0.06]"
                            style={{ top: `${h.top}px` }}
                          />
                        ))}
                        {/* Half-hour grid lines */}
                        {halfHourMarks.map((h) => (
                          <div
                            key={`halfline-${h.minutes}`}
                            className="absolute left-0 right-0 border-t border-dashed border-white/[0.03]"
                            style={{ top: `${h.top}px` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Master columns */}
                    {mastersToday.map((master, masterIdx) => {
                      const slots = workSlotsByMaster.get(master.id) || [];
                      const apps = (appointmentsByMaster.get(master.id) || [])
                        .slice()
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));

                      return (
                        <div
                          key={master.id}
                          className={`flex-1 min-w-[200px] max-w-xs ${masterIdx > 0 ? "border-l border-white/[0.05]" : ""}`}
                        >
                          {/* Master header */}
                          <div className="h-10 border-b border-white/[0.05] px-3 flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600/20 text-violet-300 text-[10px] font-bold flex-shrink-0">
                              {(master.fullName || "?")[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-zinc-200 truncate">{master.fullName}</p>
                            </div>
                            {apps.length > 0 && (
                              <AdminScheduleOptimizerButton
                                masterId={master.id}
                                workDate={dateStr}
                                masterName={master.fullName || "Мастер"}
                              />
                            )}
                          </div>

                          {/* Timeline body */}
                          <div className="relative bg-[#0A0A0D]" style={{ height: `${timelineHeight}px` }}>
                            {/* Hour grid lines */}
                            {hourLabels.map((h) => (
                              <div
                                key={`bg-${h.minutes}`}
                                className="absolute left-0 right-0 border-t border-white/[0.06]"
                                style={{ top: `${h.top}px` }}
                              />
                            ))}
                            {/* Half-hour dashed lines */}
                            {halfHourMarks.map((h) => (
                              <div
                                key={`bghalf-${h.minutes}`}
                                className="absolute left-0 right-0 border-t border-dashed border-white/[0.03]"
                                style={{ top: `${h.top}px` }}
                              />
                            ))}

                            {/* Work slot background */}
                            {slots.map((slot, si) => {
                              const slotStart = timeToMinutes(slot.startTime);
                              const slotEnd = timeToMinutes(slot.endTime);
                              const top = (slotStart - roundedMin) * PX_PER_MIN;
                              const height = (slotEnd - slotStart) * PX_PER_MIN;
                              return (
                                <div
                                  key={si}
                                  className="absolute left-0 right-0 bg-white/[0.025]"
                                  style={{ top: `${top}px`, height: `${height}px` }}
                                />
                              );
                            })}

                            {/* Appointment cards */}
                            {apps.map((app) => {
                              const appStart = timeToMinutes(app.startTime);
                              const appEnd = timeToMinutes(app.endTime);
                              const top = (appStart - roundedMin) * PX_PER_MIN;
                              const height = (appEnd - appStart) * PX_PER_MIN;

                              return (
                                <div
                                  key={app.id}
                                  className="absolute left-1 right-1 overflow-hidden"
                                  style={{ top: `${top}px`, height: `${height}px` }}
                                >
                                  <AdminAppointmentManager
                                    appointment={app as any}
                                    masters={mastersData as any}
                                    services={servicesData as any}
                                    cardHeight={height}
                                  />
                                </div>
                              );
                            })}

                            {/* Schedule blocks (breaks, custom) */}
                            {(blocksData as any[] || [])
                              .filter((b: any) => b.masterId === master.id)
                              .map((block: any) => {
                                const bStart = timeToMinutes(block.startTime);
                                const bEnd = timeToMinutes(block.endTime);
                                const top = (bStart - roundedMin) * PX_PER_MIN;
                                const height = (bEnd - bStart) * PX_PER_MIN;
                                return (
                                  <div
                                    key={`block-${block.id}`}
                                    className="absolute left-1 right-1 overflow-hidden"
                                    style={{ top: `${top}px`, height: `${height}px` }}
                                  >
                                    <AdminBlockManager
                                      block={block as any}
                                      masters={(mastersData as any[]).map((m: any) => ({ id: m.id, fullName: m.fullName }))}
                                      cardHeight={height}
                                    />
                                  </div>
                                );
                              })}

                            {/* Break gaps between appointments */}
                            {apps.length >= 2 && apps.map((app, i) => {
                              if (i === 0) return null;
                              const prevEnd = timeToMinutes(apps[i - 1].endTime);
                              const currStart = timeToMinutes(app.startTime);
                              const gap = currStart - prevEnd;
                              if (gap <= 0 || gap >= 30) return null;
                              const top = (prevEnd - roundedMin) * PX_PER_MIN;
                              const height = gap * PX_PER_MIN;
                              return (
                                <div
                                  key={`break-${app.id}`}
                                  className="absolute left-1 right-1 rounded-lg flex flex-col items-center justify-center"
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    border: "1px dashed rgba(255,255,255,0.15)",
                                    background: "rgba(255,255,255,0.02)",
                                    color: "rgba(255,255,255,0.3)",
                                    fontSize: "10px",
                                    fontFamily: "var(--font-montserrat)",
                                  }}
                                >
                                  <span>{"\u2615"} Перерыв</span>
                                  {height >= 40 && <span>{gap} мин</span>}
                                </div>
                              );
                            })}

                            {/* End-of-shift gap: last appointment ends before shift ends */}
                            {apps.length > 0 && slots.length > 0 && (() => {
                              const lastApp = apps[apps.length - 1];
                              const lastEnd = timeToMinutes(lastApp.endTime);
                              const shiftEnd = timeToMinutes(slots[slots.length - 1].endTime);
                              const gap = shiftEnd - lastEnd;
                              if (gap <= 0 || gap >= 30) return null;
                              const top = (lastEnd - roundedMin) * PX_PER_MIN;
                              const height = gap * PX_PER_MIN;
                              return (
                                <div
                                  className="absolute left-1 right-1 rounded-lg flex flex-col items-center justify-center"
                                  style={{
                                    top: `${top}px`,
                                    height: `${height}px`,
                                    border: "1px dashed rgba(76,175,80,0.3)",
                                    background: "rgba(76,175,80,0.04)",
                                    color: "rgba(76,175,80,0.5)",
                                    fontSize: "10px",
                                    fontFamily: "var(--font-montserrat)",
                                  }}
                                >
                                  <span>🏁 Свободны с {lastApp.endTime}</span>
                                </div>
                              );
                            })()}

                            {/* Free time indicator */}
                            {apps.length === 0 && slots.length > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[11px] text-zinc-700">свободно</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* ===== RIGHT COLUMN: SIDEBAR ===== */}
          <div className="space-y-4 lg:sticky lg:top-36">
            <AdminWorkSlotChangeRequests />
            <AdminWorkSlotsCreator masters={mastersData} currentDate={dateStr} />
            {/* Auto-optimization per master */}
            <section className="rounded-2xl border border-white/[0.06] bg-[#0D0D10] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                </svg>
                <h3 className="text-xs font-semibold text-zinc-300">Авто-оптимизация</h3>
              </div>
              <div className="p-3 space-y-2">
                {(() => {
                  const mastersOnDate = confirmedWorkSlotsData
                    .map((w: any) => w.masterId)
                    .filter((id: number, i: number, arr: number[]) => arr.indexOf(id) === i);
                  if (mastersOnDate.length === 0) return <p className="text-[10px] text-zinc-600 py-2">Нет мастеров на эту дату</p>;
                  return mastersOnDate.map((mid: number) => {
                    const master = mastersData.find((m: any) => m.id === mid);
                    return (
                      <AdminAutoOptimizeDelay
                        key={`opt-${mid}-${dateStr}`}
                        masterId={mid}
                        workDate={dateStr}
                        masterName={master?.fullName || "Мастер"}
                      />
                    );
                  });
                })()}
                <div className="pt-2 border-t border-white/[0.04]">
                  <AdminOptimizeDelaySettings />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ===== FULL-WIDTH BOTTOM: WORK SLOTS LIST ===== */}
        <div className="mt-5">
          <AdminWorkSlotsList masters={mastersData as any} currentDate={dateStr} />
        </div>
      </main>
    </div>
  );
}

function StatChip({ icon, value, label, danger }: { icon: React.ReactNode; value: number; label: string; danger?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 border ${
      danger
        ? "bg-red-500/[0.06] border-red-500/15 text-red-400"
        : "bg-white/[0.04] border-white/[0.07] text-zinc-400"
    }`}>
      <span className={danger ? "text-red-400" : "text-zinc-500"}>{icon}</span>
      <span className={`text-sm font-semibold ${danger ? "text-red-300" : "text-zinc-200"}`}>{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}
