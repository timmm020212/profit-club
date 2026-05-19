import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db, dbRetry } from "@/db/index-postgres";
import { appointments, services, masters } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import ClientsClient, { Booking, ServiceLite, MasterLite, ClientSummary, ClientStatus } from "./ClientsClient";

export const dynamic = "force-dynamic";

function normalizePhone(p: string | null | undefined): string {
  if (!p) return "";
  return String(p).replace(/\D/g, "");
}

function priceToNumber(p: string | null | undefined): number {
  if (!p) return 0;
  return Number(String(p).replace(/\D/g, "")) || 0;
}

function daysBetween(aIso: string, bIso: string): number {
  const [ay, am, ad] = aIso.split("-").map(Number);
  const [by, bm, bd] = bIso.split("-").map(Number);
  const a = new Date(ay, am - 1, ad).getTime();
  const b = new Date(by, bm - 1, bd).getTime();
  return Math.round((b - a) / 86_400_000);
}

function statusOf(visits: number, daysSinceLast: number): ClientStatus {
  if (visits === 0) return "lost";
  if (daysSinceLast > 120) return "lost";
  if (daysSinceLast > 60)  return "sleeping";
  if (visits >= 10)        return "vip";
  if (visits >= 3)         return "regular";
  return "new";
}

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "partner" || !session.user.salonId) {
    redirect("/partner/join");
  }
  const salonId = session.user.salonId!;

  const [bookings, servicesRows, mastersRows] = await Promise.all([
    dbRetry(() => db
      .select()
      .from(appointments)
      .where(eq(appointments.salonId, salonId))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime))
      .limit(500)
    ).catch(() => [] as Booking[]),
    dbRetry(() => db
      .select({
        id: services.id, name: services.name, price: services.price, duration: services.duration,
      })
      .from(services)
      .where(eq(services.salonId, salonId))
      .orderBy(asc(services.orderDesktop))
    ).catch(() => [] as ServiceLite[]),
    dbRetry(() => db
      .select({
        id: masters.id, fullName: masters.fullName, specialization: masters.specialization, photoUrl: masters.photoUrl,
      })
      .from(masters)
      .where(and(eq(masters.salonId, salonId), eq(masters.isActive, true)))
      .orderBy(asc(masters.fullName))
    ).catch(() => [] as MasterLite[]),
  ]);

  const servicePriceMap = new Map<number, number>();
  for (const s of servicesRows as ServiceLite[]) servicePriceMap.set(s.id, priceToNumber(s.price));

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  // ─── aggregate by (phone || name) ───
  type Agg = ClientSummary & { _masterCounts: Map<number, number>; _serviceCounts: Map<number, number> };
  const map = new Map<string, Agg>();

  for (const b of bookings as Booking[]) {
    const phoneKey = normalizePhone(b.clientPhone);
    const key = phoneKey || `n:${b.clientName.toLowerCase().trim()}`;
    const cancelled = b.status === "cancelled";

    let c = map.get(key);
    if (!c) {
      c = {
        identifier: key,
        name: b.clientName,
        phone: b.clientPhone || null,
        telegramId: b.clientTelegramId || null,
        visitCount: 0,
        cancelledCount: 0,
        completedCount: 0,
        totalSpent: 0,
        avgTicket: 0,
        firstVisit: b.appointmentDate,
        lastVisit: b.appointmentDate,
        daysSinceLastVisit: 0,
        status: "new",
        topMasterId: null,
        topServiceId: null,
        _masterCounts: new Map(),
        _serviceCounts: new Map(),
      };
      map.set(key, c);
    }

    // keep best-known contact (prefer rows with phone+telegram)
    if (!c.phone && b.clientPhone) c.phone = b.clientPhone;
    if (!c.telegramId && b.clientTelegramId) c.telegramId = b.clientTelegramId;

    if (cancelled) {
      c.cancelledCount += 1;
      continue;
    }

    c.visitCount += 1;
    if (b.status === "completed") c.completedCount += 1;
    c.totalSpent += servicePriceMap.get(b.serviceId) ?? 0;

    if (b.appointmentDate < c.firstVisit) c.firstVisit = b.appointmentDate;
    if (b.appointmentDate > c.lastVisit)  c.lastVisit  = b.appointmentDate;

    c._masterCounts.set(b.masterId, (c._masterCounts.get(b.masterId) ?? 0) + 1);
    c._serviceCounts.set(b.serviceId, (c._serviceCounts.get(b.serviceId) ?? 0) + 1);
  }

  const summaries: ClientSummary[] = Array.from(map.values()).map(c => {
    const dsl = daysBetween(c.lastVisit, todayIso);
    let topMasterId: number | null = null;
    let topMasterCount = 0;
    for (const [mid, cnt] of c._masterCounts.entries()) if (cnt > topMasterCount) { topMasterId = mid; topMasterCount = cnt; }
    let topServiceId: number | null = null;
    let topServiceCount = 0;
    for (const [sid, cnt] of c._serviceCounts.entries()) if (cnt > topServiceCount) { topServiceId = sid; topServiceCount = cnt; }
    return {
      identifier: c.identifier,
      name: c.name,
      phone: c.phone,
      telegramId: c.telegramId,
      visitCount: c.visitCount,
      cancelledCount: c.cancelledCount,
      completedCount: c.completedCount,
      totalSpent: c.totalSpent,
      avgTicket: c.visitCount > 0 ? Math.round(c.totalSpent / c.visitCount) : 0,
      firstVisit: c.firstVisit,
      lastVisit: c.lastVisit,
      daysSinceLastVisit: dsl,
      status: statusOf(c.visitCount, dsl),
      topMasterId,
      topServiceId,
    };
  });

  return (
    <ClientsClient
      summaries={summaries}
      bookings={bookings as Booking[]}
      services={servicesRows as ServiceLite[]}
      masters={mastersRows as MasterLite[]}
      todayIso={todayIso}
    />
  );
}
