import { NextResponse } from "next/server";
import { db } from "@/db";
import { masters } from "@/db/schema";
import { eq } from "drizzle-orm";


// GET /api/masters - получить список всех активных мастеров
export async function GET() {
  try {
    const allMasters = await db
      .select()
      .from(masters)
      .where(eq(masters.isActive, true));

    return NextResponse.json(allMasters);
  } catch (error) {
    console.error("Error fetching masters:", error);
    return NextResponse.json(
      { error: "Failed to fetch masters" },
      { status: 500 }
    );
  }
}

// PATCH /api/masters - обновить мастера (имя, роль)
export async function PATCH(request: Request) {
  try {

    const body = await request.json();
    const { id, fullName, specialization, showOnSite, photoUrl } = body || {};

    const idNum = Number(id);
    if (!id || Number.isNaN(idNum)) {
      return NextResponse.json({ error: "Некорректный id мастера" }, { status: 400 });
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

// DELETE /api/masters?id=... - деактивировать мастера
export async function DELETE(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const idNum = Number(id);

    if (!id || Number.isNaN(idNum)) {
      return NextResponse.json({ error: "Некорректный id мастера" }, { status: 400 });
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

// POST /api/masters - создать нового мастера (используется в админ-панели)
export async function POST(request: Request) {
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

