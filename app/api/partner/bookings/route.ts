import { NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { appointments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  try {
    const rows = await dbRetry(() => db
      .select()
      .from(appointments)
      .where(eq(appointments.salonId, session.salonId))
      .orderBy(desc(appointments.createdAt))
      .limit(100)
    );
    return NextResponse.json(rows);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Bookings error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
