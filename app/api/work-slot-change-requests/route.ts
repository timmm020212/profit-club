import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlotChangeRequests, workSlots, masters } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export const dynamic = "force-dynamic";

// GET /api/work-slot-change-requests - список запросов на изменение рабочего дня (pending)
export async function GET() {
  try {

    const rows = await db
      .select({
        id: workSlotChangeRequests.id,
        workSlotId: workSlotChangeRequests.workSlotId,
        masterId: workSlotChangeRequests.masterId,
        suggestedWorkDate: workSlotChangeRequests.suggestedWorkDate,
        suggestedStartTime: workSlotChangeRequests.suggestedStartTime,
        suggestedEndTime: workSlotChangeRequests.suggestedEndTime,
        status: workSlotChangeRequests.status,
        type: workSlotChangeRequests.type,
        createdAt: workSlotChangeRequests.createdAt,
        masterName: masters.fullName,
        masterSpecialization: masters.specialization,
      })
      .from(workSlotChangeRequests)
      .leftJoin(masters, eq(workSlotChangeRequests.masterId, masters.id))
      .where(and(
        eq(workSlotChangeRequests.status, "pending"),
        ne(workSlotChangeRequests.type, "admin_update")
      ));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching work slot change requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch work slot change requests" },
      { status: 500 }
    );
  }
}

async function notifyMaster(telegramId: string, changeRequestId: number, suggestedWorkDate: string, suggestedStartTime: string, suggestedEndTime: string, adminName?: string) {
  const token = process.env.MASTERS_BOT_TOKEN;
  if (!token || !telegramId) return;
  const text =
    `📋 <b>Администратор предлагает изменить ваш рабочий день:</b>\n\n` +
    (adminName ? `👤 Администратор: <b>${adminName}</b>\n` : "") +
    `📅 Дата: <b>${suggestedWorkDate}</b>\n` +
    `⏰ Время: <b>${suggestedStartTime} — ${suggestedEndTime}</b>\n\n` +
    `Подтвердите или отклоните изменение:`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: telegramId,
      text,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Подтвердить", callback_data: `confirm_request_${changeRequestId}` },
          { text: "❌ Отклонить",   callback_data: `reject_request_${changeRequestId}` },
        ]],
      },
    }),
  });
}

// POST /api/work-slot-change-requests - создать запрос на изменение
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      workSlotId,
      masterId,
      suggestedWorkDate,
      suggestedStartTime,
      suggestedEndTime,
      mode,
      type,
    } = body;

    if (!workSlotId || !masterId || !suggestedWorkDate || !suggestedStartTime || !suggestedEndTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const resolvedType = mode === "create_from_admin" ? "admin_update" : (type || "time_change");

    const created = await db
      .insert(workSlotChangeRequests)
      .values({
        workSlotId,
        masterId,
        suggestedWorkDate,
        suggestedStartTime,
        suggestedEndTime,
        type: resolvedType,
        status: "pending",
      })
      .returning();

    // Если запрос от администратора — уведомить мастера в Telegram
    if (mode === "create_from_admin") {
      const session = await getServerSession(authOptions);
      const adminName = session?.user?.name || "Администратор";
      const masterRows = await db
        .select({ telegramId: masters.telegramId })
        .from(masters)
        .where(eq(masters.id, Number(masterId)))
        .limit(1);
      const telegramId = masterRows[0]?.telegramId;
      if (telegramId) {
        await notifyMaster(telegramId, created[0].id, suggestedWorkDate, suggestedStartTime, suggestedEndTime, adminName);
      }
    }

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error("Error creating work slot change request:", error);
    return NextResponse.json(
      { error: "Failed to create work slot change request" },
      { status: 500 }
    );
  }
}

// PATCH /api/work-slot-change-requests?id=1&action=accept|reject - принять или отклонить запрос
export async function PATCH(request: Request) {
  try {

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const id = searchParams.get("id");
    const action = searchParams.get("action"); // accept или reject

    if (!id || !action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const requestId = Number(id);
    if (isNaN(requestId)) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400 }
      );
    }

    // Получаем запрос
    const requests = await db
      .select()
      .from(workSlotChangeRequests)
      .where(eq(workSlotChangeRequests.id, requestId));

    if (!requests.length) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    const changeRequest = requests[0];

    // Обновляем статус запроса
    await db
      .update(workSlotChangeRequests)
      .set({ status: action })
      .where(eq(workSlotChangeRequests.id, requestId));

    if (action === "accept") {
      // Применяем изменения к рабочему слоту
      await db
        .update(workSlots)
        .set({
          workDate: changeRequest.suggestedWorkDate,
          startTime: changeRequest.suggestedStartTime,
          endTime: changeRequest.suggestedEndTime,
          adminUpdateStatus: "accepted",
          isConfirmed: true,
        })
        .where(eq(workSlots.id, changeRequest.workSlotId));
    } else {
      // Отклоняем запрос, возвращаем статус слота в normal
      await db
        .update(workSlots)
        .set({ adminUpdateStatus: "rejected" })
        .where(eq(workSlots.id, changeRequest.workSlotId));
    }

    // Уведомляем мастера о решении администратора (только для запросов от мастера)
    if (changeRequest.type !== "admin_update") {
      const session = await getServerSession(authOptions);
      const adminName = session?.user?.name || "Администратор";
      const masterRows = await db
        .select({ telegramId: masters.telegramId })
        .from(masters)
        .where(eq(masters.id, Number(changeRequest.masterId)))
        .limit(1);
      const telegramId = masterRows[0]?.telegramId;
      if (telegramId) {
        const token = process.env.MASTERS_BOT_TOKEN;
        if (token) {
          const isAccept = action === "accept";
          const text = isAccept
            ? `✅ <b>Администратор принял ваш запрос</b>\n\n👤 Администратор: <b>${adminName}</b>\n📅 Дата: <b>${changeRequest.suggestedWorkDate}</b>\n⏰ Время: <b>${changeRequest.suggestedStartTime} — ${changeRequest.suggestedEndTime}</b>\n\nИзменения вступили в силу.`
            : `❌ <b>Администратор отклонил ваш запрос</b>\n\n👤 Администратор: <b>${adminName}</b>\n📅 Дата: <b>${changeRequest.suggestedWorkDate}</b>\n⏰ Время: <b>${changeRequest.suggestedStartTime} — ${changeRequest.suggestedEndTime}</b>\n\nВаш рабочий день остался без изменений.`;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: telegramId, text, parse_mode: "HTML" }),
          });
        }
      }
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error("Error updating work slot change request:", error);
    return NextResponse.json(
      { error: "Failed to update work slot change request" },
      { status: 500 }
    );
  }
}
