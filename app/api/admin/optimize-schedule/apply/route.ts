import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  scheduleOptimizations,
  optimizationMoves,
  appointments,
  masters,
} from "@/db/schema";
import { eq } from "drizzle-orm";


export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org/bot";

// POST — apply accepted moves to appointments
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

    // Load accepted moves
    const moves = await db
      .select()
      .from(optimizationMoves)
      .where(eq(optimizationMoves.optimizationId, optimizationId));

    const acceptedMoves = moves.filter((m) => m.clientResponse === "accepted");

    if (acceptedMoves.length === 0) {
      return NextResponse.json(
        { error: "No accepted moves to apply" },
        { status: 400 }
      );
    }

    // Apply each accepted move to the appointment
    const applied = [];
    for (const move of acceptedMoves) {
      await db
        .update(appointments)
        .set({
          startTime: move.newStartTime,
          endTime: move.newEndTime,
        })
        .where(eq(appointments.id, move.appointmentId));

      applied.push({
        moveId: move.id,
        appointmentId: move.appointmentId,
        newStartTime: move.newStartTime,
        newEndTime: move.newEndTime,
      });
    }

    // Notify master about the changes
    const [master] = await db
      .select()
      .from(masters)
      .where(eq(masters.id, optimization.masterId));

    if (master?.telegramId) {
      const botToken = process.env.TELEGRAM_MASTERS_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

      if (botToken) {
        const changesText = applied
          .map(
            (a) => `• Запись #${a.appointmentId}: ${a.newStartTime}–${a.newEndTime}`
          )
          .join("\n");

        const text =
          `📋 Расписание обновлено\n\n` +
          `Дата: ${optimization.workDate}\n` +
          `Изменённые записи:\n${changesText}\n\n` +
          `Клиенты подтвердили перенос.`;

        try {
          await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: master.telegramId,
              text,
            }),
          });
        } catch (err) {
          console.error("Failed to notify master:", err);
        }
      }
    }

    // Mark optimization as completed
    await db
      .update(scheduleOptimizations)
      .set({ status: "completed" })
      .where(eq(scheduleOptimizations.id, optimizationId));

    return NextResponse.json({
      optimizationId,
      status: "completed",
      appliedMoves: applied,
    });
  } catch (error) {
    console.error("optimize-schedule/apply POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
