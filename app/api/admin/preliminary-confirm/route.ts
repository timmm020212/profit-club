import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masters } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";

    for (const id of ids) {
      await db.update(appointments).set({ status: "confirmed" }).where(eq(appointments.id, id));

      try {
        const [apt] = await db.select({
          masterId: appointments.masterId,
          serviceId: appointments.serviceId,
          clientName: appointments.clientName,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          appointmentDate: appointments.appointmentDate,
        }).from(appointments).where(eq(appointments.id, id));
        if (!apt) continue;

        const [master] = await db.select({ telegramId: masters.telegramId }).from(masters).where(eq(masters.id, apt.masterId));
        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));

        if (master?.telegramId) {
          await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: master.telegramId,
              text: `✅ Запись подтверждена\n\n💇 ${svc?.name || "Услуга"} — ${apt.clientName}\n⏰ ${apt.startTime}–${apt.endTime}\n📅 ${apt.appointmentDate}`,
            }),
          }).catch(() => {});
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, confirmed: ids.length });
  } catch (error) {
    console.error("preliminary-confirm error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
