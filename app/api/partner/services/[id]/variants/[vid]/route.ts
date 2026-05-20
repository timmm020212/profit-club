import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { services, serviceVariants, serviceVariantMaterials } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureVariantOwned(salonId: number, serviceId: number, variantId: number) {
  const [v] = await dbRetry(() =>
    db
      .select({ id: serviceVariants.id })
      .from(serviceVariants)
      .innerJoin(services, eq(services.id, serviceVariants.serviceId))
      .where(
        and(
          eq(serviceVariants.id, variantId),
          eq(serviceVariants.serviceId, serviceId),
          eq(services.salonId, salonId)
        )
      )
  );
  return !!v;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { id: idStr, vid: vidStr } = await params;
  const serviceId = Number(idStr);
  const variantId = Number(vidStr);
  if (!serviceId || !variantId) {
    return NextResponse.json({ error: "Неверные id" }, { status: 400 });
  }

  try {
    const owned = await ensureVariantOwned(session.salonId, serviceId, variantId);
    if (!owned) return NextResponse.json({ error: "Вариант не найден" }, { status: 404 });

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Название не может быть пустым" }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (!Number.isFinite(p) || p < 0) {
        return NextResponse.json({ error: "Неверная цена" }, { status: 400 });
      }
      updateData.price = Math.round(p);
    }
    if (body.duration !== undefined) {
      const d = Number(body.duration);
      if (!Number.isFinite(d) || d <= 0) {
        return NextResponse.json({ error: "Неверная длительность" }, { status: 400 });
      }
      updateData.duration = Math.round(d);
    }
    if (body.order !== undefined) {
      updateData.order = Number(body.order) || 0;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 });
    }

    const [updated] = await dbRetry(() =>
      db
        .update(serviceVariants)
        .set(updateData)
        .where(eq(serviceVariants.id, variantId))
        .returning()
    );
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Variant PATCH:", msg);
    return NextResponse.json({ error: "Не удалось обновить вариант", detail: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { id: idStr, vid: vidStr } = await params;
  const serviceId = Number(idStr);
  const variantId = Number(vidStr);
  if (!serviceId || !variantId) {
    return NextResponse.json({ error: "Неверные id" }, { status: 400 });
  }

  try {
    const owned = await ensureVariantOwned(session.salonId, serviceId, variantId);
    if (!owned) return NextResponse.json({ error: "Вариант не найден" }, { status: 404 });

    await db.transaction(async (tx) => {
      // cascade recipe rows
      await tx
        .delete(serviceVariantMaterials)
        .where(eq(serviceVariantMaterials.variantId, variantId));
      // delete variant
      await tx
        .delete(serviceVariants)
        .where(eq(serviceVariants.id, variantId));
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Variant DELETE:", msg);
    return NextResponse.json({ error: "Не удалось удалить вариант", detail: msg }, { status: 500 });
  }
}
