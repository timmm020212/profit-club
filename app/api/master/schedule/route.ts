import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, workSlots, services, masterClientNotes } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function getWeekDates(dateStr: string): { start: string; end: string; dates: string[] } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const curr = new Date(monday);
    curr.setDate(monday.getDate() + i);
    dates.push(
      `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}-${String(curr.getDate()).padStart(2, "0")}`
    );
  }
  return { start: dates[0], end: dates[6], dates };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    const date = searchParams.get("date") || "";

    if (!masterId || !date) {
      return NextResponse.json({ error: "masterId and date required" }, { status: 400 });
    }

    const week = getWeekDates(date);

    const weekAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        clientTelegramId: appointments.clientTelegramId,
        serviceId: appointments.serviceId,
        status: appointments.status,
        autoCompleted: appointments.autoCompleted,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterId),
          gte(appointments.appointmentDate, week.start),
          lte(appointments.appointmentDate, week.end)
        )
      );

    const weekSlots = await db
      .select({
        id: workSlots.id,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        isConfirmed: workSlots.isConfirmed,
      })
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterId),
          gte(workSlots.workDate, week.start),
          lte(workSlots.workDate, week.end)
        )
      );

    const serviceIds = [...new Set(weekAppointments.map((a) => a.serviceId))];
    const serviceMap: Record<number, string> = {};
    for (const sid of serviceIds) {
      const [svc] = await db
        .select({ name: services.name })
        .from(services)
        .where(eq(services.id, sid));
      if (svc) serviceMap[sid] = svc.name;
    }

    // Fetch client notes for this master
    const clientPhones = [...new Set(weekAppointments.map((a) => a.clientPhone).filter(Boolean))];
    const noteMap: Record<string, string> = {};
    for (const phone of clientPhones) {
      const [noteRow] = await db
        .select({ note: masterClientNotes.note, clientIdentifier: masterClientNotes.clientIdentifier })
        .from(masterClientNotes)
        .where(and(eq(masterClientNotes.masterId, masterId), eq(masterClientNotes.clientIdentifier, phone!)));
      if (noteRow?.note) noteMap[noteRow.clientIdentifier] = noteRow.note;
    }

    return NextResponse.json({
      week: week.dates,
      appointments: weekAppointments.map((a) => ({
        ...a,
        serviceName: serviceMap[a.serviceId] || "Услуга",
        clientNote: (a.clientPhone && noteMap[a.clientPhone]) || "",
      })),
      workSlots: weekSlots,
    });
  } catch (error) {
    console.error("Master schedule error:", error);
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}
