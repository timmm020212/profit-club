import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const rows = await db.select().from(services).where(eq(services.salonId, session.salonId));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Services GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await request.json();
    const { name, price, duration, description } = body;
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const [inserted] = await db.insert(services).values({
      name,
      price: price || null,
      duration: duration ? Number(duration) : 60,
      description: description || "",
      salonId: session.salonId,
    }).returning();

    return NextResponse.json(inserted);
  } catch (error) {
    console.error("Services POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
