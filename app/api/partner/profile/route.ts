import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    // Select all editable columns
    const [salon] = await dbRetry(() => db.select({
      id: salons.id,
      slug: salons.slug,
      name: salons.name,
      city: salons.city,
      address: salons.address,
      phone: salons.phone,
      description: salons.description,
      logoUrl: salons.logoUrl,
      tariff: salons.tariff,
      isActive: salons.isActive,
    }).from(salons).where(eq(salons.id, session.salonId)));
    return NextResponse.json(salon || {});
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Profile GET error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await request.json();
    const { name, city, address, phone, description, logoUrl } = body;

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name обязателен" }, { status: 400 });
    }

    const [updated] = await dbRetry(() => db.update(salons)
      .set({
        name: name.trim(),
        city: city ?? null,
        address: address ?? null,
        phone: phone ?? null,
        description: description ?? null,
        logoUrl: logoUrl ?? null,
      })
      .where(eq(salons.id, session.salonId))
      .returning({
        id: salons.id,
        name: salons.name,
        city: salons.city,
        address: salons.address,
        phone: salons.phone,
        description: salons.description,
        logoUrl: salons.logoUrl,
      })
    );
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Profile PATCH error:", msg);
    return NextResponse.json({ error: "Не удалось сохранить", detail: msg }, { status: 500 });
  }
}
