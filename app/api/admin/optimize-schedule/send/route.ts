import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  scheduleOptimizations,
  optimizationMoves,
  appointments,
  services,
  masters,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";


export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org/bot";

// POST — send optimization proposals to clients via Telegram
export async function POST(request: Request) {
  try {

    const body = await request.json();
    const { optimizationId } = body;

    if (!optimizationId) {
      return NextResponse.json(
        { error: "optimizationId is required" },
        { status: 400 }
      );
    }

    // Load optimization
    const [optimization] = await db
      .select()
      .from(scheduleOptimizations)
      .where(eq(scheduleOptimizations.id, optimizationId));

    if (!optimization) {
      return NextResponse.json(
        { error: "Optimization not found" },
        { status: 404 }
      );
    }

    // Load pending moves with appointment+service+master data
    const movesWithData = await db
      .select({
        moveId: optimizationMoves.id,
        appointmentId: optimizationMoves.appointmentId,
        oldStartTime: optimizationMoves.oldStartTime,
        oldEndTime: optimizationMoves.oldEndTime,
        newStartTime: optimizationMoves.newStartTime,
        newEndTime: optimizationMoves.newEndTime,
        clientResponse: optimizationMoves.clientResponse,
        clientTelegramId: appointments.clientTelegramId,
        clientName: appointments.clientName,
        serviceName: services.name,
        masterName: masters.fullName,
      })
      .from(optimizationMoves)
      .leftJoin(
        appointments,
        eq(optimizationMoves.appointmentId, appointments.id)
      )
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(masters, eq(appointments.masterId, masters.id))
      .where(
        and(
          eq(optimizationMoves.optimizationId, optimizationId),
          eq(optimizationMoves.clientResponse, "pending")
        )
      );

    if (movesWithData.length === 0) {
      return NextResponse.json(
        { error: "No pending moves to send" },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_TOKEN not configured" },
        { status: 500 }
      );
    }

    const now = new Date();
    const sentAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const sendResults = [];

    for (const move of movesWithData) {
      if (!move.clientTelegramId) {
        sendResults.push({
          moveId: move.moveId,
          status: "skipped",
          reason: "no telegramId",
        });
        continue;
      }

      const text =
        `🔄 Предложение о переносе\n\n` +
        `💇 ${move.serviceName || "Услуга"}\n` +
        `👩 ${move.masterName || "Мастер"}\n\n` +
        `❌ Текущее время: ${move.oldStartTime}–${move.oldEndTime}\n` +
        `✅ Предлагаемое: ${move.newStartTime}–${move.newEndTime}\n\n` +
        `Это позволит оптимизировать расписание мастера.`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: "✅ Согласиться",
              callback_data: `opt_accept_${move.moveId}`,
            },
            {
              text: "❌ Оставить как есть",
              callback_data: `opt_decline_${move.moveId}`,
            },
          ],
        ],
      };

      try {
        const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: move.clientTelegramId,
            text,
            reply_markup: inlineKeyboard,
          }),
        });

        const result = await res.json();

        if (result.ok) {
          // Update sentAt on the move
          await db
            .update(optimizationMoves)
            .set({ sentAt })
            .where(eq(optimizationMoves.id, move.moveId));

          sendResults.push({ moveId: move.moveId, status: "sent" });
        } else {
          sendResults.push({
            moveId: move.moveId,
            status: "failed",
            reason: result.description || "Telegram API error",
          });
        }
      } catch (err) {
        sendResults.push({
          moveId: move.moveId,
          status: "failed",
          reason: String(err),
        });
      }
    }

    // Update optimization status to "sent"
    await db
      .update(scheduleOptimizations)
      .set({ status: "sent", sentAt })
      .where(eq(scheduleOptimizations.id, optimizationId));

    return NextResponse.json({
      optimizationId,
      status: "sent",
      results: sendResults,
    });
  } catch (error) {
    console.error("optimize-schedule/send POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
