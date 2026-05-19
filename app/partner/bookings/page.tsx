import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db, dbRetry } from "@/db/index-postgres";
import { appointments, services, masters } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import BookingsClient, { Booking, ServiceLite, MasterLite } from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
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
      .limit(200)
    ).catch(() => [] as Booking[]),
    dbRetry(() => db
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
        duration: services.duration,
      })
      .from(services)
      .where(eq(services.salonId, salonId))
      .orderBy(asc(services.orderDesktop))
    ).catch(() => [] as ServiceLite[]),
    dbRetry(() => db
      .select({
        id: masters.id,
        fullName: masters.fullName,
        specialization: masters.specialization,
        photoUrl: masters.photoUrl,
      })
      .from(masters)
      .where(and(eq(masters.salonId, salonId), eq(masters.isActive, true)))
      .orderBy(asc(masters.fullName))
    ).catch(() => [] as MasterLite[]),
  ]);

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

  return (
    <BookingsClient
      initialBookings={bookings as Booking[]}
      services={servicesRows as ServiceLite[]}
      masters={mastersRows as MasterLite[]}
      todayIso={todayIso}
    />
  );
}
