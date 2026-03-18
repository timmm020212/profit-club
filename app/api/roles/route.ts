import { NextResponse } from "next/server";
import { db } from "@/db";
import { masters } from "@/db/schema-sqlite";
import { eq } from "drizzle-orm";


// PATCH /api/roles - переименование роли (specialization) во всех мастерах
export async function PATCH(request: Request) {
  try {

    const body = await request.json();
    const { oldName, newName } = body as { oldName?: string; newName?: string };

    const trimmedOld = (oldName || "").trim();
    const trimmedNew = (newName || "").trim();

    if (!trimmedOld || !trimmedNew) {
      return NextResponse.json({ error: "Укажите старое и новое название роли" }, { status: 400 });
    }

    if (trimmedOld === trimmedNew) {
      return NextResponse.json({ error: "Новое название роли совпадает со старым" }, { status: 400 });
    }

    const result = await db
      .update(masters)
      .set({ specialization: trimmedNew })
      .where(eq(masters.specialization, trimmedOld))
      .returning({ id: masters.id });

    return NextResponse.json({ updated: result.length });
  } catch (error) {
    console.error("Error updating role name:", error);
    return NextResponse.json(
      { error: "Не удалось изменить название роли" },
      { status: 500 },
    );
  }
}

// DELETE /api/roles?name=... - попытка удалить роль
// Сейчас мы запрещаем удаление, если есть мастера с такой ролью.
export async function DELETE(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const name = (searchParams.get("name") || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Не указано название роли" }, { status: 400 });
    }

    const rows = await db
      .select({ id: masters.id })
      .from(masters)
      .where(eq(masters.specialization, name));

    if (rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "Нельзя удалить роль, которая используется мастерами. Сначала измените роль у всех мастеров.",
        },
        { status: 400 },
      );
    }

    // Явного хранения ролей отдельно от мастеров нет, поэтому если роль не используется,
    // фактически удалять в БД нечего. Возвращаем успешный ответ, чтобы UI мог убрать её
    // из локального списка пользовательских ролей.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Не удалось удалить роль" },
      { status: 500 },
    );
  }
}
