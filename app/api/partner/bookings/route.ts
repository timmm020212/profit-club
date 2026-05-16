import { NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  try {
    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.salonId, session.salonId))
      .orderBy(desc(appointments.createdAt))
      .limit(100);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Bookings error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
