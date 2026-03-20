import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  appointments,
  services,
  masters,
  workSlots,
  scheduleOptimizations,
  optimizationMoves,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";

import { computeOptimization } from "@/lib/optimize-schedule";
import type { AppointmentInput } from "@/lib/optimize-schedule";

export const dynamic = "force-dynamic";

// POST — compute optimization for a master on a given date
export async function POST(request: Request) {
  try {

    const body = await request.json();
    const { masterId, workDate } = body;

    if (!masterId || !workDate) {
      return NextResponse.json(
        { error: "masterId and workDate are required" },
        { status: 400 }
      );
    }

    // Get confirmed work slot for this master+date
    const slots = await db
      .select()
      .from(workSlots)
      .where(
        and(
          eq(workSlots.masterId, masterId),
          eq(workSlots.workDate, workDate),
          eq(workSlots.isConfirmed, true)
        )
      );

    if (slots.length === 0) {
      return NextResponse.json(
        { error: "No confirmed work slot found for this master and date" },
        { status: 404 }
      );
    }

    const slot = slots[0];

    // Get confirmed appointments for this master+date, join services for duration
    const rows = await db
      .select({
        id: appointments.id,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        duration: services.duration,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.masterId, masterId),
          eq(appointments.appointmentDate, workDate),
          eq(appointments.status, "confirmed")
        )
      );

    const apptInputs: AppointmentInput[] = rows.map((r) => ({
      id: r.id,
      startTime: r.startTime,
      endTime: r.endTime,
      duration: r.duration || 60,
    }));

    const moves = computeOptimization(apptInputs, slot.startTime, slot.endTime, workDate);

    if (moves.length === 0) {
      return NextResponse.json({ moves: [] });
    }

    // Save optimization record
    const now = new Date();
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    const [optimization] = await db
      .insert(scheduleOptimizations)
      .values({
        masterId,
        workDate,
        status: "draft",
        createdAt,
      })
      .returning();

    // Save all moves and enrich with client/service data
    const enrichedMoves = [];
    for (const move of moves) {
      const [saved] = await db
        .insert(optimizationMoves)
        .values({
          optimizationId: optimization.id,
          appointmentId: move.appointmentId,
          oldStartTime: move.oldStartTime,
          oldEndTime: move.oldEndTime,
          newStartTime: move.newStartTime,
          newEndTime: move.newEndTime,
          clientResponse: "pending",
        })
        .returning();

      // Get client and service info
      const apt = rows.find(r => r.id === move.appointmentId);
      const aptFull = await db.select().from(appointments).where(eq(appointments.id, move.appointmentId)).limit(1);
      const svc = aptFull.length ? await db.select().from(services).where(eq(services.id, aptFull[0].serviceId)).limit(1) : [];

      enrichedMoves.push({
        ...saved,
        clientName: aptFull[0]?.clientName || "Клиент",
        clientTelegramId: aptFull[0]?.clientTelegramId || null,
        serviceName: svc[0]?.name || "Услуга",
        status: "pending",
      });
    }

    return NextResponse.json({
      optimization: {
        id: optimization.id,
        masterId: optimization.masterId,
        workDate: optimization.workDate,
        status: optimization.status,
        moves: enrichedMoves,
      },
    });
  } catch (error) {
    console.error("optimize-schedule POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET — list optimizations with moves
export async function GET(request: Request) {
  try {

    const { searchParams } = new URL(request.url);
    const masterId = searchParams.get("masterId");
    const workDate = searchParams.get("workDate");
    const status = searchParams.get("status");

    // Build conditions
    const conditions = [];
    if (masterId) {
      conditions.push(eq(scheduleOptimizations.masterId, Number(masterId)));
    }
    if (workDate) {
      conditions.push(eq(scheduleOptimizations.workDate, workDate));
    }
    if (status) {
      conditions.push(eq(scheduleOptimizations.status, status));
    }

    const whereClause =
      conditions.length > 0 ? and(...conditions) : undefined;

    const optimizations = await db
      .select()
      .from(scheduleOptimizations)
      .where(whereClause);

    // For each optimization, load moves with appointment+service+master data
    const result = [];
    for (const opt of optimizations) {
      const movesWithData = await db
        .select({
          id: optimizationMoves.id,
          optimizationId: optimizationMoves.optimizationId,
          appointmentId: optimizationMoves.appointmentId,
          oldStartTime: optimizationMoves.oldStartTime,
          oldEndTime: optimizationMoves.oldEndTime,
          newStartTime: optimizationMoves.newStartTime,
          newEndTime: optimizationMoves.newEndTime,
          clientResponse: optimizationMoves.clientResponse,
          sentAt: optimizationMoves.sentAt,
          clientName: appointments.clientName,
          clientPhone: appointments.clientPhone,
          clientTelegramId: appointments.clientTelegramId,
          serviceName: services.name,
          serviceDuration: services.duration,
          masterName: masters.fullName,
        })
        .from(optimizationMoves)
        .leftJoin(
          appointments,
          eq(optimizationMoves.appointmentId, appointments.id)
        )
        .leftJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(masters, eq(appointments.masterId, masters.id))
        .where(eq(optimizationMoves.optimizationId, opt.id));

      // Get master name
      const [masterRow] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, opt.masterId));

      result.push({
        ...opt,
        masterName: masterRow?.fullName || "Мастер",
        moves: movesWithData
          .filter(m => m.clientName !== null) // skip moves with deleted appointments
          .map(m => ({
            ...m,
            clientName: m.clientName || "Клиент",
            serviceName: (m as any).serviceName || "Услуга",
            status: m.sentAt ? (m.clientResponse === "pending" ? "sent" : m.clientResponse) : "pending",
            clientTelegramId: (m as any).clientTelegramId || null,
          })),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("optimize-schedule GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
