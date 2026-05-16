import { NextResponse } from "next/server";
import { db } from "@/db";
import { salons, services, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [salon] = await db
    .select()
    .from(salons)
    .where(and(eq(salons.slug, slug), eq(salons.isActive, true)));

  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const salonServices = await db
    .select()
    .from(services)
    .where(eq(services.salonId, salon.id));

  const salonMasters = await db
    .select({
      id: masters.id,
      fullName: masters.fullName,
      specialization: masters.specialization,
      photoUrl: masters.photoUrl,
    })
    .from(masters)
    .where(and(eq(masters.salonId, salon.id), eq(masters.isActive, true)));

  return NextResponse.json({ salon, services: salonServices, masters: salonMasters });
}
