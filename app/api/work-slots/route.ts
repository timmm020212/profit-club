import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlots, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export const dynamic = "force-dynamic";

// GET /api/work-slots?masterId=1&date=2024-12-25 - получить доступные слоты времени
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    const date = searchParams.get("date"); // Формат: YYYY-MM-DD

    // Формируем условия фильтрации
    const conditions: any[] = [];

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

    // Показываем только подтверждённые мастером рабочие дни
    conditions.push(eq(workSlots.isConfirmed, true));

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
      })
      .from(workSlots)
      .innerJoin(masters, eq(workSlots.masterId, masters.id))
      .where(conditions.length ? and(...conditions) : undefined);

    // Фильтр: показываем только будущие даты
    const today = new Date().toISOString().split("T")[0];
    const filteredSlots = slots.filter((slot) => slot.workDate >= today);

    // Сортируем по дате и времени
    filteredSlots.sort((a, b) => {
      if (a.workDate !== b.workDate) {
        return a.workDate.localeCompare(b.workDate);
      }
      return a.startTime.localeCompare(b.startTime);
    });

    return NextResponse.json(filteredSlots);
  } catch (error) {
    console.error("Error fetching work slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch work slots" },
      { status: 500 }
    );
  }
}

// PATCH /api/work-slots?id=1 - обновить рабочий день мастера
export async function PATCH(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slotId = id ? Number(id) : NaN;

    if (!slotId || Number.isNaN(slotId)) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { workDate, startTime, endTime, adminName } = body as {
      workDate?: string;
      startTime?: string;
      endTime?: string;
      adminName?: string;
    };

    if (!workDate && !startTime && !endTime) {
      return NextResponse.json(
        { error: "Нет данных для обновления" },
        { status: 400 }
      );
    }

    const updateData: Partial<{ workDate: string; startTime: string; endTime: string }> = {};

    if (workDate !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(workDate)) {
        return NextResponse.json(
          { error: "Неверный формат даты" },
          { status: 400 }
        );
      }
      updateData.workDate = workDate;
    }

    let existing: any[] = [];

    if (startTime !== undefined || endTime !== undefined) {
      const timeRegex = /^\d{2}:\d{2}$/;
      const newStart = startTime ?? undefined;
      const newEnd = endTime ?? undefined;

      if ((newStart && !timeRegex.test(newStart)) || (newEnd && !timeRegex.test(newEnd))) {
        return NextResponse.json(
          { error: "Неверный формат времени" },
          { status: 400 }
        );
      }

      // Для проверки длительности нам нужны финальные значения start/end
      existing = await db
        .select()
        .from(workSlots)
        .where(eq(workSlots.id, slotId));

      if (!existing.length) {
        return NextResponse.json({ error: "Рабочий день не найден" }, { status: 404 });
      }

      const current = existing[0];
      const finalStart = newStart ?? current.startTime;
      const finalEnd = newEnd ?? current.endTime;

      const [sh, sm] = finalStart.split(":").map((v: string) => parseInt(v, 10));
      const [eh, em] = finalEnd.split(":").map((v: string) => parseInt(v, 10));
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;

      if (
        Number.isNaN(startMinutes) ||
        Number.isNaN(endMinutes) ||
        endMinutes <= startMinutes
      ) {
        return NextResponse.json(
          { error: "Время окончания должно быть больше времени начала" },
          { status: 400 }
        );
      }

      if (newStart !== undefined) updateData.startTime = newStart;
      if (newEnd !== undefined) updateData.endTime = newEnd;
    }

    const updated = await db
      .update(workSlots)
      .set(updateData)
      .where(eq(workSlots.id, slotId))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: "Рабочий день не найден" }, { status: 404 });
    }

    const updatedSlot = updated[0];

    try {
      // TODO: Restore telegram notifications when bot is available
      // await notifyMasterWorkDayUpdated({
      //   masterId: updatedSlot.masterId,
      //   workDate: updatedSlot.workDate,
      //   startTime: updatedSlot.startTime,
      //   endTime: updatedSlot.endTime,
      //   adminName,
      //   workSlotId: updatedSlot.id,
      //   prevWorkDate: existing ? existing[0].workDate : undefined,
      //   prevStartTime: existing ? existing[0].startTime : undefined,
      //   prevEndTime: existing ? existing[0].endTime : undefined,
      // });
      console.log("Master work day updated (telegram notifications disabled)");
    } catch (e) {
      console.error("Failed to send master work day updated notification", e);
    }

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error("Error updating work slot:", error);
    return NextResponse.json(
      { error: "Failed to update work slot" },
      { status: 500 }
    );
  }
}

// DELETE /api/work-slots?id=1 - удалить рабочий день мастера
export async function DELETE(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slotId = id ? Number(id) : NaN;

    if (!slotId || Number.isNaN(slotId)) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const adminName = session?.user?.name || "Администратор";

    // Получаем данные слота до удаления чтобы уведомить мастера
    const existing = await db
      .select()
      .from(workSlots)
      .where(eq(workSlots.id, slotId));

    if (!existing.length) {
      return NextResponse.json({ error: "Рабочий день не найден" }, { status: 404 });
    }

    const slot = existing[0];

    const deleted = await db
      .delete(workSlots)
      .where(eq(workSlots.id, slotId))
      .returning();

    if (!deleted.length) {
      return NextResponse.json({ error: "Рабочий день не найден" }, { status: 404 });
    }

    // Уведомляем мастера об удалении рабочего дня
    try {
      const masterInfo = await db
        .select()
        .from(masters)
        .where(eq(masters.id, slot.masterId))
        .limit(1);

      if (masterInfo.length && masterInfo[0].telegramId) {
        const mastersBotToken = process.env.MASTERS_BOT_TOKEN;
        if (mastersBotToken) {
          const dateObj = new Date(slot.workDate + "T00:00:00");
          const formattedDate = dateObj.toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          const message =
            `❌ *Рабочий день отменён*\n\n` +
            `👤 Администратор: ${adminName}\n` +
            `📅 Дата: ${formattedDate}\n` +
            `⏰ Время: ${slot.startTime} — ${slot.endTime}\n\n` +
            `Ваш рабочий день был удалён.`;

          await fetch(`https://api.telegram.org/bot${mastersBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: masterInfo[0].telegramId,
              text: message,
              parse_mode: "Markdown",
            }),
          });
        }
      }
    } catch (e) {
      console.error("Failed to send delete notification to master", e);
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

// POST /api/work-slots - создать рабочий день мастера
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const adminName = session?.user?.name || "Администратор";

    const body = await request.json();
    const { masterId, workDate, startTime, endTime } = body as {
      masterId?: number;
      workDate?: string;
      startTime?: string;
      endTime?: string;
    };

    if (!masterId || !workDate || !startTime || !endTime) {
      return NextResponse.json(
        { error: "masterId, workDate, startTime и endTime обязательны" },
        { status: 400 }
      );
    }

    // Простая валидация форматов
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!dateRegex.test(workDate) || !timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "Неверный формат даты или времени" },
        { status: 400 }
      );
    }

    const [sh, sm] = startTime.split(":").map((v) => parseInt(v, 10));
    const [eh, em] = endTime.split(":").map((v) => parseInt(v, 10));
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (isNaN(startMinutes) || isNaN(endMinutes) || endMinutes <= startMinutes) {
      return NextResponse.json(
        { error: "Время окончания должно быть больше времени начала" },
        { status: 400 }
      );
    }

    // Проверяем, что мастер существует
    const masterRows = await db
      .select()
      .from(masters)
      .where(eq(masters.id, masterId));

    if (!masterRows.length) {
      return NextResponse.json({ error: "Мастер не найден" }, { status: 404 });
    }

    // Запрещаем создавать второй рабочий день этому мастеру на ту же дату
    // (исключаем отклонённые мастером — на них можно пересоздать)
    const existingSlots = await db
      .select()
      .from(workSlots)
      .where(and(eq(workSlots.masterId, masterId), eq(workSlots.workDate, workDate)));

    const activeSlots = existingSlots.filter(s => s.adminUpdateStatus !== "rejected");

    if (activeSlots.length > 0) {
      return NextResponse.json(
        { error: "На выбранную дату у мастера уже есть рабочий день. Измените его в разделе «Рабочие дни мастеров»." },
        { status: 400 }
      );
    }

    // Удаляем отклонённые слоты на эту дату чтобы не мусорить
    const rejectedSlots = existingSlots.filter(s => s.adminUpdateStatus === "rejected");
    for (const rs of rejectedSlots) {
      await db.delete(workSlots).where(eq(workSlots.id, rs.id));
    }

    const inserted = await db
      .insert(workSlots)
      .values({
        masterId,
        workDate,
        startTime,
        endTime,
        createdBy: adminName,
        isConfirmed: false,
        adminUpdateStatus: 'pending',
        createdAt: new Date().toISOString(),
      })
      .returning();

    // Отправляем уведомление мастеру о новом рабочем дне
    try {
      // Получаем информацию о мастере для уведомления
      const masterInfo = await db
        .select()
        .from(masters)
        .where(eq(masters.id, masterId))
        .limit(1);

      if (masterInfo.length && masterInfo[0].telegramId) {
        const mastersBotToken = process.env.MASTERS_BOT_TOKEN;
        if (mastersBotToken) {
          const dateObj = new Date(workDate + "T00:00:00");
          const formattedDate = dateObj.toLocaleDateString("ru-RU", {
            weekday: "long",
            day: "numeric", 
            month: "long",
            year: "numeric",
          });

          const message = `📅 *Новый рабочий день*\n\n` +
            `👤 Администратор: ${adminName || 'admin'}\n` +
            `📅 Дата: ${formattedDate}\n` +
            `⏰ Время: ${startTime} - ${endTime}\n\n` +
            `Пожалуйста, подтвердите или отклоните этот рабочий день.`;

          const keyboard = {
            inline_keyboard: [
              [
                { text: "✅ Подтвердить", callback_data: `confirm_${inserted[0].id}` },
                { text: "❌ Отклонить", callback_data: `reject_${inserted[0].id}` }
              ]
            ]
          };

          const response = await fetch(`https://api.telegram.org/bot${mastersBotToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: masterInfo[0].telegramId,
              text: message,
              parse_mode: 'Markdown',
              reply_markup: keyboard,
            }),
          });

          if (response.ok) {
            console.log(`✅ Notification sent to master ${masterInfo[0].fullName}`);
          } else {
            const error = await response.json();
            console.error('❌ Failed to send telegram notification:', error);
          }
        } else {
          console.log('❌ MASTERS_BOT_TOKEN not set');
        }
      } else {
        console.log(`❌ Master ${masterId} not found or no telegram ID`);
      }
    } catch (e) {
      console.error("Failed to send master work day notification", e);
      // Не ломаем API из-за ошибки бота
    }

    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Error creating work slot:", error);
    return NextResponse.json(
      { error: "Failed to create work slot" },
      { status: 500 }
    );
  }
}