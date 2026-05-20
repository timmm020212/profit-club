import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { services, serviceVariants, materials, serviceVariantMaterials } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureVariantOwned(salonId: number, serviceId: number, variantId: number) {
  const [v] = await dbRetry(() => db
    .select({ id: serviceVariants.id })
    .from(serviceVariants)
    .innerJoin(services, eq(services.id, serviceVariants.serviceId))
    .where(and(
      eq(serviceVariants.id, variantId),
      eq(serviceVariants.serviceId, serviceId),
      eq(services.salonId, salonId),
    ))
  );
  return !!v;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr, vid: vidStr } = await params;
    const serviceId = Number(idStr);
    const variantId = Number(vidStr);
    if (!serviceId || !variantId) return NextResponse.json({ error: "bad ids" }, { status: 400 });
    const owned = await ensureVariantOwned(session.salonId, serviceId, variantId);
    if (!owned) return NextResponse.json({ error: "variant not found" }, { status: 404 });

    const rows = await dbRetry(() => db
      .select({
        materialId: serviceVariantMaterials.materialId,
        materialName: materials.name,
        materialUnit: materials.unit,
        quantity: serviceVariantMaterials.quantity,
      })
      .from(serviceVariantMaterials)
      .innerJoin(materials, eq(materials.id, serviceVariantMaterials.materialId))
      .where(eq(serviceVariantMaterials.variantId, variantId))
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Recipe GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr, vid: vidStr } = await params;
    const serviceId = Number(idStr);
    const variantId = Number(vidStr);
    if (!serviceId || !variantId) return NextResponse.json({ error: "bad ids" }, { status: 400 });
    const owned = await ensureVariantOwned(session.salonId, serviceId, variantId);
    if (!owned) return NextResponse.json({ error: "variant not found" }, { status: 404 });

    const body = await req.json();
    const items: { materialId: number; quantity: number }[] = Array.isArray(body?.items) ? body.items : [];
    const cleaned = items
      .map(i => ({ materialId: Number(i.materialId), quantity: Number(i.quantity) }))
      .filter(i => Number.isFinite(i.materialId) && i.materialId > 0
                && Number.isFinite(i.quantity) && i.quantity > 0);

    // Dedup check
    const seen = new Set<number>();
    for (const i of cleaned) {
      if (seen.has(i.materialId)) return NextResponse.json({ error: "duplicate materialId" }, { status: 400 });
      seen.add(i.materialId);
    }

    // Validate every material belongs to this salon
    if (cleaned.length > 0) {
      const ids = cleaned.map(i => i.materialId);
      const ownedMaterials = await dbRetry(() => db
        .select({ id: materials.id })
        .from(materials)
        .where(and(eq(materials.salonId, session.salonId), inArray(materials.id, ids)))
      );
      if (ownedMaterials.length !== ids.length) {
        return NextResponse.json({ error: "some materials not found" }, { status: 400 });
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(serviceVariantMaterials)
        .where(eq(serviceVariantMaterials.variantId, variantId));
      if (cleaned.length > 0) {
        await tx
          .insert(serviceVariantMaterials)
          .values(cleaned.map(i => ({
            salonId: session.salonId,
            variantId,
            materialId: i.materialId,
            quantity: i.quantity.toFixed(2),
          })));
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Recipe PUT:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
