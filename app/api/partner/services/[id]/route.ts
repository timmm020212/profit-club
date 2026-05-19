import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { services } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function normalizePrice(input: unknown): string | null {
  if (input === null || input === undefined || input === "") return null;
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return null;
  return `${digits} ₽`;
}

const VALID_BADGES = new Set(["accent", "discount", "dark", "light"]);

async function getOwnedService(id: number, salonId: number) {
  return await dbRetry(async () => {
    const [row] = await db
      .select({ id: services.id, salonId: services.salonId })
      .from(services)
      .where(and(eq(services.id, id), eq(services.salonId, salonId)))
      .limit(1);
    return row;
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Неверный id" }, { status: 400 });
  }

  try {
    const owned = await getOwnedService(id, session.salonId);
    if (!owned) {
      return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name, price, duration, description, imageUrl,
      category, executorRole, badgeText, badgeType,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }

    const normalizedBadgeType = badgeType
      ? VALID_BADGES.has(String(badgeType).toLowerCase())
        ? String(badgeType).toLowerCase()
        : null
      : null;

    const [updated] = await dbRetry(() => db.update(services)
      .set({
        name: name.trim(),
        price: normalizePrice(price),
        duration: duration ? Math.max(5, Number(duration)) : 60,
        description: description?.toString().trim() || "",
        imageUrl: imageUrl?.toString().trim() || null,
        category: category?.toString().trim() || null,
        executorRole: executorRole?.toString().trim() || null,
        badgeText: badgeText?.toString().trim() || null,
        badgeType: normalizedBadgeType,
      })
      .where(and(eq(services.id, id), eq(services.salonId, session.salonId)))
      .returning()
    );

    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Service PATCH error:", msg);
    return NextResponse.json({ error: "Не удалось обновить", detail: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Неверный id" }, { status: 400 });
  }

  try {
    const owned = await getOwnedService(id, session.salonId);
    if (!owned) {
      return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });
    }

    await dbRetry(() => db.delete(services).where(
      and(eq(services.id, id), eq(services.salonId, session.salonId))
    ));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Service DELETE error:", msg);
    return NextResponse.json({ error: "Не удалось удалить", detail: msg }, { status: 500 });
  }
}
