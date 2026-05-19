import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { masters } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function clean(s: unknown, max = 255): string | null {
  if (s === null || s === undefined) return null;
  const str = String(s).trim();
  if (!str) return null;
  return str.slice(0, max);
}

async function getOwnedMaster(id: number, salonId: number) {
  return await dbRetry(async () => {
    const [row] = await db
      .select({ id: masters.id, salonId: masters.salonId })
      .from(masters)
      .where(and(eq(masters.id, id), eq(masters.salonId, salonId)))
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
    const owned = await getOwnedMaster(id, session.salonId);
    if (!owned) {
      return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
    }

    const body = await request.json();
    const { fullName, specialization, phone, telegramId, photoUrl, showOnSite } = body;

    const cleanName = clean(fullName);
    const cleanSpec = clean(specialization);
    if (!cleanName) {
      return NextResponse.json({ error: "ФИО обязательно" }, { status: 400 });
    }
    if (!cleanSpec) {
      return NextResponse.json({ error: "Укажите специализацию" }, { status: 400 });
    }

    const [updated] = await dbRetry(() => db.update(masters)
      .set({
        fullName: cleanName,
        specialization: cleanSpec,
        phone: clean(phone, 50),
        telegramId: clean(telegramId, 50),
        photoUrl: clean(photoUrl, 500),
        showOnSite: showOnSite !== false,
      })
      .where(and(eq(masters.id, id), eq(masters.salonId, session.salonId)))
      .returning()
    );

    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Master PATCH error:", msg);
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
    const owned = await getOwnedMaster(id, session.salonId);
    if (!owned) {
      return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
    }

    // Soft delete (preserves booking history that references this master)
    await dbRetry(() => db.update(masters)
      .set({ isActive: false })
      .where(and(eq(masters.id, id), eq(masters.salonId, session.salonId)))
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Master DELETE error:", msg);
    return NextResponse.json({ error: "Не удалось удалить", detail: msg }, { status: 500 });
  }
}
