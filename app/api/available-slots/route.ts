import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlots, masters, services, appointments, scheduleBlocks } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';

function roleTokens(value: string): string[] {
  return String(value || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

// Функция для конвертации времени "HH:MM" в минуты от начала дня
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Функция для конвертации минут обратно в "HH:MM"
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Функция для проверки пересечения временных интервалов
function timeRangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

// GET /api/available-slots?masterId=1&serviceId=1&date=2024-12-25
// Получить доступные слоты времени для записи с учетом длительности услуги и существующих записей
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    const serviceId = searchParams.get("serviceId");
    const date = searchParams.get("date"); // Формат: YYYY-MM-DD
    const debug = searchParams.get("debug") === "1";

    // Проверяем обязательные параметры
    if (!masterId || !serviceId || !date) {
      return NextResponse.json(
        { error: "Missing required parameters: masterId, serviceId, date" },
        { status: 400 }
      );
    }

    const masterIdNum = parseInt(masterId);
    const serviceIdNum = parseInt(serviceId);

    if (isNaN(masterIdNum) || isNaN(serviceIdNum)) {
      return NextResponse.json(
        { error: "Invalid masterId or serviceId" },
        { status: 400 }
      );
    }

    // Проверяем формат даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Получаем информацию об услуге (нужна длительность)
    const service = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceIdNum));

    if (service.length === 0) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const serviceDuration = service[0].duration; // в минутах
    const executorRole = (service[0] as any).executorRole as string | null | undefined;

    let roleMatched: boolean | null = null;
    let masterSpecialization: string | null = null;
    let expectedRole: string | null = null;

    if (executorRole && executorRole.trim()) {
      const masterRows = await db
        .select({ id: masters.id, specialization: masters.specialization })
        .from(masters)
        .where(eq(masters.id, masterIdNum));

      if (masterRows.length === 0) {
        if (debug) {
          return NextResponse.json({
            ok: true,
            reason: "MASTER_NOT_FOUND",
            slots: [],
          });
        }
        return NextResponse.json([]);
      }

      masterSpecialization = String(masterRows[0].specialization || "");
      expectedRole = executorRole.trim().toLowerCase();
      const tokens = roleTokens(masterSpecialization);
      // Проверяем точное совпадение или вхождение (напр. "парикмахер" ∈ "парикмахер-стилист")
      roleMatched = tokens.some(t => t === expectedRole || t.includes(expectedRole!) || expectedRole!.includes(t));
      if (!roleMatched) {
        if (debug) {
          return NextResponse.json({
            ok: true,
            reason: "ROLE_MISMATCH",
            executorRole: executorRole ?? null,
            expectedRole,
            masterSpecialization,
            masterRoleTokens: tokens,
            slots: [],
          });
        }
        return NextResponse.json([]);
      }
    }

    // Считаем разницу в днях между сегодня и запрошенной датой
    const today = new Date();
    const todayMidnight = new Date(today.toISOString().slice(0, 10) + "T00:00:00");
    const dateObj = new Date(date + "T00:00:00");
    const diffMs = dateObj.getTime() - todayMidnight.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Общие рабочие часы салона
    const salonStartMinutes = 8 * 60; // 08:00
    const salonEndMinutes = 20 * 60;  // 20:00

    // Получаем рабочие дни мастера (подтверждённые), если они есть
    const workDay = await db
      .select()
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterIdNum),
          eq(workSlots.workDate, date),
          eq(workSlots.isConfirmed, true)
        )
      );

    console.log(`[available-slots] masterId=${masterIdNum}, date=${date}, workDay found:`, workDay.length, "diffDays=", diffDays);

    let workStart: number;
    let workEnd: number;

    if (diffDays <= 1) {
      // Сегодня / завтра: работаем строго по подтверждённому рабочему дню
      if (workDay.length === 0) {
        console.log(`[available-slots] No work day for master ${masterIdNum} on ${date} (strict mode)`);
        if (debug) {
          return NextResponse.json({
            ok: true,
            reason: "NO_CONFIRMED_WORKDAY_STRICT",
            diffDays,
            date,
            masterId: masterIdNum,
            serviceId: serviceIdNum,
            serviceDuration,
            executorRole: executorRole ?? null,
            masterSpecialization,
            roleMatched,
            slots: [],
          });
        }
        return NextResponse.json([]);
      }
      const workDayData = workDay[0];
      workStart = timeToMinutes(workDayData.startTime);
      workEnd = timeToMinutes(workDayData.endTime);
    } else {
      // Дата через 2+ дней: только по подтверждённому рабочему дню
      if (workDay.length > 0) {
        const workDayData = workDay[0];
        workStart = timeToMinutes(workDayData.startTime);
        workEnd = timeToMinutes(workDayData.endTime);
      } else {
        // Нет рабочего дня — нет слотов
        console.log(`[available-slots] No work day for master ${masterIdNum} on ${date} (no confirmed slot)`);
        if (debug) {
          return NextResponse.json({
            ok: true,
            reason: "NO_CONFIRMED_WORKDAY",
            diffDays,
            date,
            masterId: masterIdNum,
            serviceId: serviceIdNum,
            serviceDuration,
            executorRole: executorRole ?? null,
            masterSpecialization,
            roleMatched,
            slots: [],
          });
        }
        return NextResponse.json([]);
      }
    }

    // Получаем все существующие записи мастера на эту дату (только подтвержденные)
    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterIdNum),
          eq(appointments.appointmentDate, date),
          eq(appointments.status, "confirmed")
        )
      );

    const blocks = await db.select({
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
    }).from(scheduleBlocks)
      .where(and(
        eq(scheduleBlocks.masterId, masterIdNum),
        eq(scheduleBlocks.blockDate, date),
      ));

    // Генерируем доступные слоты
    // Слот создается каждые 30 минут (можно настроить)
    const slotInterval = 30; // минут
    const availableSlots: { startTime: string; endTime: string }[] = [];

    // Начинаем с начала рабочего дня
    let currentTime = workStart;

    while (currentTime + serviceDuration <= workEnd) {
      const slotStart = currentTime;
      const slotEnd = currentTime + serviceDuration;

      // Проверяем, не пересекается ли этот слот с существующими записями
      let isAvailable = true;

      for (const appointment of existingAppointments) {
        const appointmentStart = timeToMinutes(appointment.startTime);
        const appointmentEnd = timeToMinutes(appointment.endTime);

        // Если есть пересечение - слот недоступен
        if (
          timeRangesOverlap(
            slotStart,
            slotEnd,
            appointmentStart,
            appointmentEnd
          )
        ) {
          isAvailable = false;
          break;
        }
      }

      const blockOverlap = blocks.some((b: any) =>
        timeRangesOverlap(slotStart, slotEnd, timeToMinutes(b.startTime), timeToMinutes(b.endTime))
      );
      if (blockOverlap) continue;

      if (isAvailable) {
        availableSlots.push({
          startTime: minutesToTime(slotStart),
          endTime: minutesToTime(slotEnd),
        });
      }

      // Переходим к следующему слоту
      currentTime += slotInterval;
    }

    // Сортируем слоты по времени
    availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));

    console.log(`[available-slots] Returning ${availableSlots.length} slots for master ${masterIdNum} on ${date}`);

    if (debug) {
      return NextResponse.json({
        ok: true,
        reason: "OK",
        diffDays,
        date,
        masterId: masterIdNum,
        serviceId: serviceIdNum,
        serviceDuration,
        executorRole: executorRole ?? null,
        masterSpecialization,
        roleMatched,
        workStartMinutes: workStart,
        workEndMinutes: workEnd,
        confirmedWorkDayCount: workDay.length,
        existingAppointmentsCount: existingAppointments.length,
        slots: availableSlots,
      });
    }

    return NextResponse.json(availableSlots);
  } catch (error) {
    console.error("Error calculating available slots:", error);
    return NextResponse.json(
      { error: "Failed to calculate available slots" },
      { status: 500 }
    );
  }
}

