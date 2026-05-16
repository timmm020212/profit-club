import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { masters } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const rows = await db.select().from(masters).where(eq(masters.salonId, session.salonId));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Masters GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { name, specialization, phone } = await request.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const [row] = await db.insert(masters).values({
      fullName: name,
      specialization: specialization || "",
      phone: phone || null,
      salonId: session.salonId,
      isActive: true,
      showOnSite: true,
      commissionPercent: 50,
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(row);
  } catch (error) {
    console.error("Masters POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
