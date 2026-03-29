import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments } from "@/db/schema-postgres";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    if (!masterId) return NextResponse.json({ error: "masterId required" }, { status: 400 });

    const appts = await db
      .select({
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        clientTelegramId: appointments.clientTelegramId,
        appointmentDate: appointments.appointmentDate,
      })
      .from(appointments)
      .where(eq(appointments.masterId, masterId))
      .orderBy(desc(appointments.id));

    const clientMap: Record<string, {
      name: string;
      phone: string;
      telegramId: string | null;
      visitCount: number;
      lastVisit: string;
    }> = {};

    for (const a of appts) {
      const key = a.clientPhone || a.clientName;
      if (!clientMap[key]) {
        clientMap[key] = {
          name: a.clientName,
          phone: a.clientPhone || "",
          telegramId: a.clientTelegramId || null,
          visitCount: 0,
          lastVisit: a.appointmentDate,
        };
      }
      clientMap[key].visitCount++;
      if (a.appointmentDate > clientMap[key].lastVisit) {
        clientMap[key].lastVisit = a.appointmentDate;
      }
    }

    const clients = Object.values(clientMap).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("Clients GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
