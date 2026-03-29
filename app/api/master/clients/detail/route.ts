import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masterClientNotes } from "@/db/schema-postgres";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    const phone = searchParams.get("phone") || "";
    if (!masterId || !phone) return NextResponse.json({ error: "masterId and phone required" }, { status: 400 });

    const appts = await db
      .select({
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        serviceId: appointments.serviceId,
        clientName: appointments.clientName,
        clientTelegramId: appointments.clientTelegramId,
      })
      .from(appointments)
      .where(and(eq(appointments.masterId, masterId), eq(appointments.clientPhone, phone)))
      .orderBy(desc(appointments.id));

    const allServices = await db.select({ id: services.id, name: services.name, price: services.price }).from(services);
    const svcMap: Record<number, { name: string; price: string }> = {};
    for (const s of allServices) svcMap[s.id] = { name: s.name, price: s.price || "0" };

    const visits = appts.map((a) => ({
      date: a.appointmentDate,
      time: a.startTime,
      serviceName: svcMap[a.serviceId]?.name || "Услуга",
      price: parseInt(svcMap[a.serviceId]?.price || "0") || 0,
    }));

    const [noteRow] = await db
      .select({ note: masterClientNotes.note })
      .from(masterClientNotes)
      .where(and(eq(masterClientNotes.masterId, masterId), eq(masterClientNotes.clientIdentifier, phone)));

    return NextResponse.json({
      name: appts[0]?.clientName || "",
      phone,
      telegramId: appts[0]?.clientTelegramId || null,
      visits,
      note: noteRow?.note || "",
    });
  } catch (error) {
    console.error("Client detail error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
