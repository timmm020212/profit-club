import { NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  try {
    const todayAppointments = await db
      .select()
      .from(appointments)
      .where(and(
        eq(appointments.salonId, session.salonId),
        eq(appointments.appointmentDate, todayStr)
      ));

    const total = todayAppointments.length;
    const confirmed = todayAppointments.filter(a => a.status === "confirmed").length;
    const cancelled = todayAppointments.filter(a => a.status === "cancelled").length;

    return NextResponse.json({ todayTotal: total, confirmed, cancelled, date: todayStr });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dashboard error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
