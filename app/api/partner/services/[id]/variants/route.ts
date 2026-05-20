import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { services, serviceVariants } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureServiceOwned(salonId: number, serviceId: number) {
  const [row] = await dbRetry(() =>
    db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.salonId, salonId)))
      .limit(1)
  );
  return !!row;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { id: idStr } = await params;
  const serviceId = Number(idStr);
  if (!Number.isFinite(serviceId) || serviceId <= 0) {
    return NextResponse.json({ error: "Неверный id" }, { status: 400 });
  }

  try {
    const owned = await ensureServiceOwned(session.salonId, serviceId);
    if (!owned) return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });

    const rows = await dbRetry(() =>
      db
        .select()
        .from(serviceVariants)
        .where(eq(serviceVariants.serviceId, serviceId))
        .orderBy(asc(serviceVariants.order), asc(serviceVariants.id))
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Variants GET:", msg);
    return NextResponse.json({ error: "Не удалось получить варианты", detail: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { id: idStr } = await params;
  const serviceId = Number(idStr);
  if (!Number.isFinite(serviceId) || serviceId <= 0) {
    return NextResponse.json({ error: "Неверный id" }, { status: 400 });
  }

  try {
    const owned = await ensureServiceOwned(session.salonId, serviceId);
    if (!owned) return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });

    const body = await req.json();
    const { name, price, duration, order } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }
    const priceNum = Number(price);
    const durationNum = Number(duration);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: "Неверная цена" }, { status: 400 });
    }
    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      return NextResponse.json({ error: "Неверная длительность" }, { status: 400 });
    }

    const [inserted] = await dbRetry(() =>
      db
        .insert(serviceVariants)
        .values({
          serviceId,
          salonId: session.salonId,
          name: name.trim(),
          price: Math.round(priceNum),
          duration: Math.round(durationNum),
          order: Number.isFinite(Number(order)) ? Number(order) : 0,
        })
        .returning()
    );
    return NextResponse.json(inserted, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Variants POST:", msg);
    return NextResponse.json({ error: "Не удалось создать вариант", detail: msg }, { status: 500 });
  }
}
