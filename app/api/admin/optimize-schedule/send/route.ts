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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { optimizationId, sendTo = "master" } = body;

    if (!optimizationId) {
      return NextResponse.json({ error: "optimizationId is required" }, { status: 400 });
    }

    const [optimization] = await db.select().from(scheduleOptimizations)
      .where(eq(scheduleOptimizations.id, optimizationId));
    if (!optimization) {
      return NextResponse.json({ error: "Optimization not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const sendResults: any[] = [];

    if (sendTo === "master") {
      const moves = await db.select({
        moveId: optimizationMoves.id,
        appointmentId: optimizationMoves.appointmentId,
        oldStartTime: optimizationMoves.oldStartTime,
        oldEndTime: optimizationMoves.oldEndTime,
        newStartTime: optimizationMoves.newStartTime,
        newEndTime: optimizationMoves.newEndTime,
        clientResponse: optimizationMoves.clientResponse,
      }).from(optimizationMoves)
        .where(and(
          eq(optimizationMoves.optimizationId, optimizationId),
          eq(optimizationMoves.clientResponse, "pending"),
        ));

      if (moves.length === 0) {
        return NextResponse.json({ error: "No pending moves" }, { status: 400 });
      }

      const [master] = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
        .from(masters).where(eq(masters.id, optimization.masterId));

      if (!master?.telegramId) {
        return NextResponse.json({ error: "Master has no Telegram ID" }, { status: 400 });
      }

      const mastersBotToken = process.env.MASTERS_BOT_TOKEN;
      if (!mastersBotToken) {
        return NextResponse.json({ error: "MASTERS_BOT_TOKEN not configured" }, { status: 500 });
      }

      for (const move of moves) {
        const [apt] = await db.select({ clientName: appointments.clientName, serviceId: appointments.serviceId })
          .from(appointments).where(eq(appointments.id, move.appointmentId));
        const svcRows = apt ? await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId)) : [];
        const svc = svcRows[0] || null;

        const text =
          `🔄 Предложение по оптимизации\n\n` +
          `💇 ${svc?.name || "Услуга"} — ${apt?.clientName || "Клиент"}\n` +
          `❌ Сейчас: ${move.oldStartTime}–${move.oldEndTime}\n` +
          `✅ Предлагается: ${move.newStartTime}–${move.newEndTime}\n\n` +
          `Согласны на перенос?`;

        try {
          const res = await fetch(`${TELEGRAM_API}${mastersBotToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: master.telegramId,
              text,
              reply_markup: { inline_keyboard: [[
                { text: "✅ Согласен", callback_data: `opt_master_accept_${move.moveId}` },
                { text: "❌ Отклонить", callback_data: `opt_master_decline_${move.moveId}` },
              ]] },
            }),
          });
          const result = await res.json();
          if (result.ok) {
            await db.update(optimizationMoves)
              .set({ clientResponse: "awaiting_master", sentAt: now })
              .where(eq(optimizationMoves.id, move.moveId));
            sendResults.push({ moveId: move.moveId, status: "sent_to_master" });
          } else {
            sendResults.push({ moveId: move.moveId, status: "failed", reason: result.description });
          }
        } catch (err) {
          sendResults.push({ moveId: move.moveId, status: "failed", reason: String(err) });
        }
      }

      await db.update(scheduleOptimizations)
        .set({ status: "sent", sentAt: now })
        .where(eq(scheduleOptimizations.id, optimizationId));

    } else if (sendTo === "client") {
      const moves = await db.select({
        moveId: optimizationMoves.id,
        appointmentId: optimizationMoves.appointmentId,
        oldStartTime: optimizationMoves.oldStartTime,
        oldEndTime: optimizationMoves.oldEndTime,
        newStartTime: optimizationMoves.newStartTime,
        newEndTime: optimizationMoves.newEndTime,
      }).from(optimizationMoves)
        .where(and(
          eq(optimizationMoves.optimizationId, optimizationId),
          eq(optimizationMoves.clientResponse, "master_accepted"),
        ));

      if (moves.length === 0) {
        return NextResponse.json({ error: "No master-accepted moves to send" }, { status: 400 });
      }

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
      }

      for (const move of moves) {
        const [apt] = await db.select({
          clientTelegramId: appointments.clientTelegramId,
          clientName: appointments.clientName,
          serviceId: appointments.serviceId,
        }).from(appointments).where(eq(appointments.id, move.appointmentId));

        if (!apt?.clientTelegramId) {
          sendResults.push({ moveId: move.moveId, status: "skipped", reason: "no telegramId" });
          continue;
        }

        const svcRows = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
        const svc = svcRows[0] || null;
        const [master] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, optimization.masterId));

        const text =
          `🔄 Предложение о переносе\n\n` +
          `💇 ${svc?.name || "Услуга"}\n` +
          `👩 ${master?.fullName || "Мастер"}\n\n` +
          `❌ Текущее время: ${move.oldStartTime}–${move.oldEndTime}\n` +
          `✅ Предлагаемое: ${move.newStartTime}–${move.newEndTime}\n\n` +
          `Это позволит оптимизировать расписание мастера.`;

        try {
          const res = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: apt.clientTelegramId,
              text,
              reply_markup: { inline_keyboard: [[
                { text: "✅ Согласиться", callback_data: `opt_accept_${move.moveId}` },
                { text: "❌ Оставить как есть", callback_data: `opt_decline_${move.moveId}` },
              ]] },
            }),
          });
          const result = await res.json();
          if (result.ok) {
            await db.update(optimizationMoves)
              .set({ clientResponse: "sent_to_client", sentAt: now })
              .where(eq(optimizationMoves.id, move.moveId));
            sendResults.push({ moveId: move.moveId, status: "sent_to_client" });
          } else {
            sendResults.push({ moveId: move.moveId, status: "failed", reason: result.description });
          }
        } catch (err) {
          sendResults.push({ moveId: move.moveId, status: "failed", reason: String(err) });
        }
      }
    }

    return NextResponse.json({ optimizationId, sendTo, results: sendResults });
  } catch (error) {
    console.error("optimize-schedule/send POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
