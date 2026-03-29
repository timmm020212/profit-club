import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, workSlots, masters } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = parseInt(searchParams.get("masterId") || "0");
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";

    if (!masterId || !from || !to) {
      return NextResponse.json({ error: "masterId, from, to required" }, { status: 400 });
    }

    const [master] = await db
      .select({ commissionPercent: masters.commissionPercent })
      .from(masters)
      .where(eq(masters.id, masterId));

    const commissionPercent = master?.commissionPercent ?? 50;

    const appts = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        serviceId: appointments.serviceId,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.masterId, masterId),
          gte(appointments.appointmentDate, from),
          lte(appointments.appointmentDate, to),
          eq(appointments.status, "confirmed")
        )
      );

    const slots = await db
      .select({
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
      })
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterId),
          gte(workSlots.workDate, from),
          lte(workSlots.workDate, to),
          eq(workSlots.isConfirmed, true)
        )
      );

    const allServices = await db
      .select({ id: services.id, name: services.name, price: services.price })
      .from(services);
    const svcMap: Record<number, { name: string; price: number }> = {};
    for (const s of allServices) {
      svcMap[s.id] = { name: s.name, price: parseInt(s.price || "0") || 0 };
    }

    const uniqueClients = new Set(appts.map((a) => a.clientPhone).filter(Boolean));
    const totalAppointments = appts.length;

    let totalApptMinutes = 0;
    for (const a of appts) {
      totalApptMinutes += timeToMin(a.endTime) - timeToMin(a.startTime);
    }

    let totalSlotMinutes = 0;
    for (const s of slots) {
      totalSlotMinutes += timeToMin(s.endTime) - timeToMin(s.startTime);
    }

    const utilization = totalSlotMinutes > 0
      ? Math.round((totalApptMinutes / totalSlotMinutes) * 100)
      : 0;

    let totalRevenue = 0;
    const serviceStats: Record<number, { name: string; count: number; revenue: number }> = {};
    for (const a of appts) {
      const svc = svcMap[a.serviceId];
      const price = svc?.price || 0;
      totalRevenue += price;
      if (!serviceStats[a.serviceId]) {
        serviceStats[a.serviceId] = { name: svc?.name || "Услуга", count: 0, revenue: 0 };
      }
      serviceStats[a.serviceId].count++;
      serviceStats[a.serviceId].revenue += price;
    }

    const avgCheck = totalAppointments > 0 ? Math.round(totalRevenue / totalAppointments) : 0;

    const topServices = Object.values(serviceStats).sort((a, b) => b.count - a.count);

    const dailyMap: Record<string, { count: number; revenue: number; appointments: any[] }> = {};
    for (const a of appts) {
      if (!dailyMap[a.appointmentDate]) {
        dailyMap[a.appointmentDate] = { count: 0, revenue: 0, appointments: [] };
      }
      const price = svcMap[a.serviceId]?.price || 0;
      dailyMap[a.appointmentDate].count++;
      dailyMap[a.appointmentDate].revenue += price;
      dailyMap[a.appointmentDate].appointments.push({
        startTime: a.startTime,
        endTime: a.endTime,
        serviceName: svcMap[a.serviceId]?.name || "Услуга",
        clientName: a.clientName,
        price,
      });
    }

    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({ date, ...data }));

    return NextResponse.json({
      commissionPercent,
      stats: {
        uniqueClients: uniqueClients.size,
        totalAppointments,
        utilization,
        avgCheck,
        totalRevenue,
        masterEarnings: Math.round(totalRevenue * commissionPercent / 100),
      },
      topServices,
      daily,
    });
  } catch (error) {
    console.error("Master stats error:", error);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
