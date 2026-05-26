import { NextResponse } from "next/server";
import { db, dbRetry } from "@/db/index-postgres";
import { masters, salons } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAdminSession } from "@/lib/requireAdminSession";


// GET /api/masters[?salon=slug] - активные мастера салона (для публичной страницы — только showOnSite=true)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const salonSlug = searchParams.get("salon");

    // Resolve salonId from slug; default to 1 (legacy Profit Club) if absent
    let salonId = 1;
    if (salonSlug) {
      const salonRow = await dbRetry(() =>
        db.select({ id: salons.id }).from(salons).where(eq(salons.slug, salonSlug)).limit(1)
      );
      if (salonRow.length === 0) {
        // unknown slug → return empty list rather than leak other salons' masters
        return NextResponse.json([]);
      }
      salonId = salonRow[0].id;
    }

    const conditions = salonSlug
      // public booking flow → filter by showOnSite as well
      ? and(eq(masters.isActive, true), eq(masters.showOnSite, true), eq(masters.salonId, salonId))
      : eq(masters.isActive, true);

    const allMasters = await dbRetry(() =>
      db.select().from(masters).where(conditions)
    );

    return NextResponse.json(allMasters);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching masters:", msg);
    return NextResponse.json(
      { error: "Failed to fetch masters", detail: msg },
      { status: 500 }
    );
  }
}

// PATCH /api/masters - обновить мастера (имя, роль). Требует admin session + scope по salonId.
export async function PATCH(request: Request) {
  const { session, response } = await requireAdminSession("masters");
  if (response) return response;
  const sessionSalonId = session?.user?.salonId ?? null;
  try {
    const body = await request.json();
    const { id, fullName, specialization, showOnSite, photoUrl } = body || {};

    const idNum = Number(id);
    if (!id || Number.isNaN(idNum)) {
      return NextResponse.json({ error: "Некорректный id мастера" }, { status: 400 });
    }

    // Ownership check for salon admins: master must belong to their salon.
    if (sessionSalonId) {
      const [existing] = await db.select({ id: masters.id, salonId: masters.salonId })
        .from(masters).where(eq(masters.id, idNum));
      if (!existing) return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
      if (existing.salonId !== sessionSalonId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const updateData: Partial<{ fullName: string; specialization: string; showOnSite: boolean; photoUrl: string | null }> = {};

    if (typeof fullName === "string" && fullName.trim()) {
      updateData.fullName = fullName.trim();
    }
    if (typeof specialization === "string" && specialization.trim()) {
      updateData.specialization = specialization.trim();
    }
    if (typeof showOnSite === "boolean") {
      updateData.showOnSite = showOnSite;
    }
    if (typeof photoUrl === "string") {
      updateData.photoUrl = photoUrl.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Нет данных для обновления" }, { status: 400 });
    }

    const [updated] = await db
      .update(masters)
      .set(updateData as any)
      .where(eq(masters.id, idNum))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating master:", error);
    return NextResponse.json(
      { error: "Failed to update master" },
      { status: 500 },
    );
  }
}

// DELETE /api/masters?id=... - деактивировать мастера. Admin only + scope по salonId.
export async function DELETE(request: Request) {
  const { session, response } = await requireAdminSession("masters");
  if (response) return response;
  const sessionSalonId = session?.user?.salonId ?? null;
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const idNum = Number(id);

    if (!id || Number.isNaN(idNum)) {
      return NextResponse.json({ error: "Некорректный id мастера" }, { status: 400 });
    }

    // Ownership check for salon admins
    if (sessionSalonId) {
      const [existing] = await db.select({ id: masters.id, salonId: masters.salonId })
        .from(masters).where(eq(masters.id, idNum));
      if (!existing) return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
      if (existing.salonId !== sessionSalonId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const [updated] = await db
      .update(masters)
      .set({ isActive: false })
      .where(eq(masters.id, idNum))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting (deactivating) master:", error);
    return NextResponse.json(
      { error: "Failed to delete master" },
      { status: 500 },
    );
  }
}

// POST /api/masters - создать нового мастера (админ-панель). Сетит salonId из сессии.
export async function POST(request: Request) {
  const { session, response } = await requireAdminSession("masters");
  if (response) return response;
  const sessionSalonId = session?.user?.salonId ?? null;
  try {
    const body = await request.json();
    const {
      fullName,
      specialization,
      phone,
      telegramId,
      staffPassword,
      showOnSite,
      photoUrl,
    } = body || {};

    if (!fullName || !specialization) {
      return NextResponse.json(
        { error: "fullName и specialization обязательны" },
        { status: 400 },
      );
    }

    const trimmedFullName = String(fullName).trim();
    const trimmedSpec = String(specialization).trim();
    const trimmedPhone = phone ? String(phone).trim() : null;
    const trimmedTelegramId = telegramId ? String(telegramId).trim() : null;

    if (!trimmedFullName || !trimmedSpec) {
      return NextResponse.json(
        { error: "Некорректные данные мастера" },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(masters)
      .values({
        fullName: trimmedFullName,
        specialization: trimmedSpec,
        phone: trimmedPhone || null,
        telegramId: trimmedTelegramId || null,
        staffPassword: staffPassword ? String(staffPassword).trim() : null,
        photoUrl: photoUrl ? String(photoUrl).trim() : null,
        isActive: true,
        showOnSite: showOnSite !== false,
        createdAt: new Date().toISOString(),
        // Bind master to the admin's salon. Legacy global admin (no salonId)
        // creates in salon=1 (the default Profit Club tenant) for back-compat.
        salonId: sessionSalonId ?? 1,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating master:", error);
    return NextResponse.json(
      { error: "Failed to create master" },
      { status: 500 },
    );
  }
}

