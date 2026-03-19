import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masters } from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { requireAdminSession } from "@/lib/requireAdminSession";

export const dynamic = "force-dynamic";

function parsePrice(priceStr: string | null | undefined): number {
  if (!priceStr) return 0;
  const match = priceStr.match(/(\d[\d\s]*)/);
  if (!match) return 0;
  return parseInt(match[1].replace(/\s/g, ""), 10) || 0;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const { response } = await requireAdminSession();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const period = parseInt(searchParams.get("period") || "30", 10);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period + 1);
  const startDateStr = toDateStr(startDate);

  const rows = await db
    .select({
      id: appointments.id,
      status: appointments.status,
      appointmentDate: appointments.appointmentDate,
      masterId: appointments.masterId,
      serviceId: appointments.serviceId,
      serviceName: services.name,
      servicePrice: services.price,
      serviceDuration: services.duration,
      masterName: masters.fullName,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(masters, eq(appointments.masterId, masters.id))
    .where(gte(appointments.appointmentDate, startDateStr));

  const confirmed = rows.filter((a) => a.status === "confirmed");
  const cancelled = rows.filter((a) => a.status === "cancelled");
  const pending = rows.filter((a) => a.status === "pending");

  const totalRevenue = confirmed.reduce((sum, a) => sum + parsePrice(a.servicePrice), 0);

  // Revenue by day
  const revenueByDay: Record<string, number> = {};
  confirmed.forEach((a) => {
    revenueByDay[a.appointmentDate] = (revenueByDay[a.appointmentDate] || 0) + parsePrice(a.servicePrice);
  });

  // TOP-5 services
  const serviceCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  confirmed.forEach((a) => {
    const key = String(a.serviceId);
    if (!serviceCounts[key]) serviceCounts[key] = { name: a.serviceName || "—", count: 0, revenue: 0 };
    serviceCounts[key].count++;
    serviceCounts[key].revenue += parsePrice(a.servicePrice);
  });
  const topServices = Object.values(serviceCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Master workload
  const masterStats: Record<string, { name: string; count: number; minutes: number }> = {};
  confirmed.forEach((a) => {
    const key = String(a.masterId);
    if (!masterStats[key]) masterStats[key] = { name: a.masterName || "—", count: 0, minutes: 0 };
    masterStats[key].count++;
    masterStats[key].minutes += a.serviceDuration || 0;
  });
  const masterWorkload = Object.values(masterStats).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    period,
    summary: {
      total: rows.length,
      confirmed: confirmed.length,
      cancelled: cancelled.length,
      pending: pending.length,
      totalRevenue,
      cancelledRate: rows.length > 0 ? Math.round((cancelled.length / rows.length) * 100) : 0,
    },
    revenueByDay,
    topServices,
    masterWorkload,
  });
}
