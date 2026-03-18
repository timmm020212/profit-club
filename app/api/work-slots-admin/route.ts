import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlots, masters } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";


export const dynamic = "force-dynamic";

// GET /api/work-slots-admin - все рабочие дни (включая неподтвержденные) для админа
export async function GET(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    const date = searchParams.get("date");

    const conditions = [];

    if (masterId) {
      const masterIdNum = parseInt(masterId);
      if (!isNaN(masterIdNum)) {
        conditions.push(eq(workSlots.masterId, masterIdNum));
      }
    }

    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(date)) {
        conditions.push(eq(workSlots.workDate, date));
      }
    }

    // Показываем ВСЕ рабочие дни (включая неподтвержденные)
    const today = new Date().toISOString().split("T")[0];
    conditions.push(gte(workSlots.workDate, today));

    // Получаем слоты с объединением таблиц
    const slots = await db
      .select({
        id: workSlots.id,
        masterId: workSlots.masterId,
        masterName: masters.fullName,
        masterSpecialization: masters.specialization,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        isConfirmed: workSlots.isConfirmed,
        adminUpdateStatus: workSlots.adminUpdateStatus,
        createdBy: workSlots.createdBy,
        createdAt: workSlots.createdAt,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(workSlots.workDate, workSlots.startTime);

    // Форматируем дату для красивого отображения
    const formattedSlots = slots.map((slot) => ({
      ...slot,
      formattedDate: new Date(slot.workDate + "T00:00:00").toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    }));

    return NextResponse.json(formattedSlots, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching admin work slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch work slots" },
      { status: 500 }
    );
  }
}

// PATCH /api/work-slots-admin?id=1 - обновить статус рабочего дня
export async function PATCH(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slotId = id ? Number(id) : NaN;

    if (!slotId || Number.isNaN(slotId)) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { isConfirmed, adminUpdateStatus } = body;

    if (typeof isConfirmed !== "boolean" && !adminUpdateStatus) {
      return NextResponse.json(
        { error: "isConfirmed (boolean) or adminUpdateStatus required" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof isConfirmed === "boolean") {
      updateData.isConfirmed = isConfirmed;
    }
    if (adminUpdateStatus) {
      updateData.adminUpdateStatus = adminUpdateStatus;
    }

    const updated = await db
      .update(workSlots)
      .set(updateData)
      .where(eq(workSlots.id, slotId))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: "Рабочий день не найден" }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating work slot:", error);
    return NextResponse.json(
      { error: "Failed to update work slot" },
      { status: 500 }
    );
  }
}

// DELETE /api/work-slots-admin?id=1 - удалить рабочий день
export async function DELETE(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slotId = id ? Number(id) : NaN;

    if (!slotId || Number.isNaN(slotId)) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const deleted = await db
      .delete(workSlots)
      .where(eq(workSlots.id, slotId))
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Рабочий день не найден" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting work slot:", error);
    return NextResponse.json(
      { error: "Failed to delete work slot" },
      { status: 500 }
    );
  }
}
