import { NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const { name, description, price, duration, imageUrl, executorRole, badgeText, badgeType, category } = body;

    if (!name) return NextResponse.json({ error: "name обязателен" }, { status: 400 });

    const updated = await db
      .update(services)
      .set({
        name,
        description: description || "",
        price: price || null,
        duration: Number(duration) || 60,
        imageUrl: imageUrl || null,
        executorRole: executorRole || null,
        badgeText: badgeText || null,
        badgeType: badgeType || null,
        ...(category !== undefined ? { category } : {}),
      } as any)
      .where(eq(services.id, id))
      .returning();

    if (!updated.length) return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (e) {
    console.error("PUT /api/services/[id] error:", e);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });

    await db.delete(services).where(eq(services.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE /api/services/[id] error:", e);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
