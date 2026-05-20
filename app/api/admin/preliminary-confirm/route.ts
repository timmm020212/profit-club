import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdminSession";
import { db } from "@/db";
import { appointments, services, masters } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { session, response } = await requireAdminSession("bookings");
  if (response) return response;
  const salonId = session.user.salonId ?? null;
  try {
    const { ids } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";

    for (const id of ids) {
      // Ownership pre-check before mutation
      const [appt] = await db
        .select({ id: appointments.id, salonId: appointments.salonId })
        .from(appointments)
        .where(eq(appointments.id, id));
      if (!appt) return NextResponse.json({ error: "not found" }, { status: 404 });
      if (salonId && appt.salonId !== salonId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
