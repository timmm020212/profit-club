import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, masters, services, workSlots } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idNum = parseInt(params.id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid appointment id" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: appointments.id,
        masterId: appointments.masterId,
        serviceId: appointments.serviceId,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        status: appointments.status,
        masterName: masters.fullName,
        serviceName: services.name,
      })
      .from(appointments)
      .innerJoin(masters, eq(appointments.masterId, masters.id))
      .innerJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.id, idNum));

    if (!rows.length) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const mastersList = await db.select().from(masters);
    const servicesList = await db.select().from(services);

    return NextResponse.json({
      appointment: rows[0],
      masters: mastersList,
      services: servicesList,
    });
  } catch (error) {
    console.error("Error fetching appointment for miniapp:", error);
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idNum = parseInt(params.id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ error: "Invalid appointment id" }, { status: 400 });
    }

    const body = await request.json();
    const { masterId, appointmentDate, startTime, status } = body as {
      masterId?: number;
      appointmentDate?: string;
      startTime?: string;
      status?: string;
    };

    // Handle cancellation separately
    if (status === "cancelled") {
      const existingRows = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, idNum));

      if (!existingRows.length) {
        return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
      }

      const appt = existingRows[0];

      // 2-hour cancellation rule
      const apptDateTime = new Date(appt.appointmentDate + "T" + appt.startTime + ":00");
      const now = new Date();
      const diffMs = apptDateTime.getTime() - now.getTime();
      const twoHoursMs = 2 * 60 * 60 * 1000;
      if (diffMs < twoHoursMs) {
        return NextResponse.json(
          { error: "Отменить запись можно не позднее чем за 2 часа до начала" },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(appointments)
        .set({ status: "cancelled" })
        .where(eq(appointments.id, idNum))
        .returning();

      return NextResponse.json({ appointment: updated });
    }

    if (!masterId || !appointmentDate || !startTime) {
      return NextResponse.json(
        { error: "masterId, appointmentDate и startTime обязательны" },
        { status: 400 }
      );
    }

    const existingRows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, idNum));

    if (!existingRows.length) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const currentAppointment = existingRows[0];

    // Проверка ограничения по времени: минимум 3 часа до начала новой записи
    const appointmentDateTime = new Date(appointmentDate + "T" + startTime + ":00");
    const now = new Date();
    const diffMs = appointmentDateTime.getTime() - now.getTime();
    const threeHoursMs = 3 * 60 * 60 * 1000;
    if (diffMs < threeHoursMs) {
      return NextResponse.json(
        { error: "Редактировать запись можно не позднее чем за 3 часа до начала" },
        { status: 400 }
      );
    }

    // Проверяем, что услуга существует (для duration)
    const serviceRows = await db
      .select()
      .from(services)
      .where(eq(services.id, currentAppointment.serviceId));

    if (!serviceRows.length) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const service = serviceRows[0];

    // Пересчитываем время окончания по длительности услуги
    const [hours, minutes] = startTime.split(":").map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + service.duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, "0")}:${endMins
      .toString()
      .padStart(2, "0")}`;

    // Проверяем рабочий день мастера
    const workDayRows = await db
      .select()
      .from(workSlots)
      .where(
        and(eq(workSlots.masterId, masterId), eq(workSlots.workDate, appointmentDate))
      );

    if (!workDayRows.length) {
      return NextResponse.json(
        { error: "Мастер не работает в выбранный день" },
        { status: 400 }
      );
    }

    const workDay = workDayRows[0];

    if (startTime < workDay.startTime || endTime > workDay.endTime) {
      return NextResponse.json(
        { error: "Время записи выходит за пределы рабочего дня мастера" },
        { status: 400 }
      );
    }

    // Проверяем пересечения с другими записями мастера на этот день
    const sameDayAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterId),
          eq(appointments.appointmentDate, appointmentDate),
          eq(appointments.status, "confirmed")
        )
      );

    function timeRangesOverlap(
      start1: string,
      end1: string,
      start2: string,
      end2: string
    ): boolean {
      return start1 < end2 && start2 < end1;
    }

    for (const a of sameDayAppointments) {
      if (a.id === idNum) continue;
      if (timeRangesOverlap(startTime, endTime, a.startTime, a.endTime)) {
        return NextResponse.json(
          { error: "Выбранное время уже занято" },
          { status: 400 }
        );
      }
    }

    const updated = await db
      .update(appointments)
      .set({
        masterId,
        appointmentDate,
        startTime,
        endTime,
      })
      .where(eq(appointments.id, idNum))
      .returning();

    const updatedRow = updated[0];

    const masterRows = await db
      .select()
      .from(masters)
      .where(eq(masters.id, updatedRow.masterId));

    const masterName = masterRows[0]?.fullName || "Мастер";

    return NextResponse.json({
      appointment: {
        ...updatedRow,
        masterName,
      },
    });
  } catch (error) {
    console.error("Error updating appointment from miniapp:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
