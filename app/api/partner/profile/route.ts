import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const [salon] = await db.select().from(salons).where(eq(salons.id, session.salonId));
    return NextResponse.json(salon || {});
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { name, city, address, phone, description } = await request.json();
    const [updated] = await db.update(salons)
      .set({ name, city, address, phone, description })
      .where(eq(salons.id, session.salonId))
      .returning();
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
