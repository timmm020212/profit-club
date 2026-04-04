import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdminSession";
import { db } from "@/db";
import {
  scheduleOptimizations,
  optimizationMoves,
  appointments,
  masters,
  services,
  workSlots,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { optimizationId } = body;

    if (!optimizationId) {
      return NextResponse.json({ error: "optimizationId is required" }, { status: 400 });
    }

    const [optimization] = await db
      .select()
      .from(scheduleOptimizations)
      .where(eq(scheduleOptimizations.id, optimizationId));

    if (!optimization) {
      return NextResponse.json({ error: "Optimization not found" }, { status: 404 });
    }

    const moves = await db
      .select()
      .from(optimizationMoves)
      .where(eq(optimizationMoves.optimizationId, optimizationId));

    const acceptedMoves = moves.filter((m) => m.clientResponse === "accepted");

    if (acceptedMoves.length === 0) {
      return NextResponse.json({ error: "No accepted moves to apply" }, { status: 400 });
    }

    // Apply each move and collect details
    const applied: { oldStart: string; oldEnd: string; newStart: string; newEnd: string; clientName: string; serviceName: string }[] = [];

    for (const move of acceptedMoves) {
      // Get appointment details before update
      const [apt] = await db.select().from(appointments).where(eq(appointments.id, move.appointmentId));
      const [svc] = apt ? await db.select().from(services).where(eq(services.id, apt.serviceId)) : [null];

      await db
        .update(appointments)
        .set({ startTime: move.newStartTime, endTime: move.newEndTime })
        .where(eq(appointments.id, move.appointmentId));

      applied.push({
        oldStart: move.oldStartTime,
        oldEnd: move.oldEndTime,
        newStart: move.newStartTime,
        newEnd: move.newEndTime,
        clientName: apt?.clientName || "Клиент",
        serviceName: svc?.name || "Услуга",
      });
    }

    // Notify master about all changes
    const [master] = await db.select().from(masters).where(eq(masters.id, optimization.masterId));
    const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";

    if (MASTERS_BOT_TOKEN && master?.telegramId) {
      const dateObj = new Date(optimization.workDate + "T00:00:00");
      const formattedDate = dateObj.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

      // Send each move as a separate notification
      for (const a of applied) {
        const text =
          `🔄 Запись перенесена (оптимизация)\n\n` +
          `👤 ${a.clientName}\n` +
          `💇 ${a.serviceName}\n` +
          `📅 ${formattedDate}\n` +
          `❌ Было: ${a.oldStart}–${a.oldEnd}\n` +
          `✅ Стало: ${a.newStart}–${a.newEnd}`;

        try {
          await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: master.telegramId, text }),
          });
        } catch {}
      }

      // Check for breaks only adjacent to MOVED appointments
      const movedTimes = new Set(applied.map(a => a.newStart));
      const allAppts = await db
        .select({ startTime: appointments.startTime, endTime: appointments.endTime })
        .from(appointments)
        .where(
          and(
            eq(appointments.masterId, optimization.masterId),
            eq(appointments.appointmentDate, optimization.workDate),
            eq(appointments.status, "confirmed")
          )
        );

      const sorted = [...allAppts].sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (let i = 0; i < sorted.length - 1; i++) {
        // Only check gaps adjacent to moved appointments
        if (!movedTimes.has(sorted[i].startTime) && !movedTimes.has(sorted[i + 1].startTime)) continue;

        const endMin = timeToMinutes(sorted[i].endTime);
        const nextStartMin = timeToMinutes(sorted[i + 1].startTime);
        const gap = nextStartMin - endMin;
        if (gap > 0 && gap < 30) {
          const breakText =
            `☕ Перерыв ${gap} мин\n\n` +
            `📅 ${formattedDate}\n` +
            `🕐 ${sorted[i].endTime}–${sorted[i + 1].startTime}`;
          try {
            await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: master.telegramId, text: breakText }),
            });
          } catch {}
        }
      }

      // Check early finish
      const shiftSlots = await db
        .select({ endTime: workSlots.endTime })
        .from(workSlots)
        .where(
          and(
            eq(workSlots.masterId, optimization.masterId),
            eq(workSlots.workDate, optimization.workDate),
            eq(workSlots.isConfirmed, true)
          )
        );

      if (shiftSlots.length > 0 && sorted.length > 0) {
        const lastEnd = timeToMinutes(sorted[sorted.length - 1].endTime);
        const shiftEnd = timeToMinutes(shiftSlots[0].endTime);
        const allSvcs = await db.select({ duration: services.duration }).from(services);
        const minDuration = allSvcs.length > 0 ? Math.min(...allSvcs.map((s) => s.duration)) : 30;
        const freeGap = shiftEnd - lastEnd;

        if (freeGap > 0 && freeGap < minDuration) {
          const freeText =
            `🏁 Вы свободны с ${sorted[sorted.length - 1].endTime}\n\n` +
            `📅 ${formattedDate}\n` +
            `🕐 Последняя запись заканчивается в ${sorted[sorted.length - 1].endTime}\n` +
            `📋 Конец смены: ${shiftSlots[0].endTime}`;
          try {
            await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: master.telegramId, text: freeText }),
            });
          } catch {}
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
      appliedMoves: applied.length,
    });
  } catch (error) {
    console.error("optimize-schedule/apply POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
