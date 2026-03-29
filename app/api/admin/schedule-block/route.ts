import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, scheduleBlocks, services, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TELEGRAM_API = "https://api.telegram.org/bot";

async function notifyMaster(masterTelegramId: string, text: string) {
  const token = process.env.MASTERS_BOT_TOKEN;
  if (!token || !masterTelegramId) return;
  try {
    await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: masterTelegramId, text }),
    });
  } catch {}
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });
    const blocks = await db.select().from(scheduleBlocks).where(eq(scheduleBlocks.blockDate, date));
    return NextResponse.json({ blocks });
  } catch (error) {
    console.error("schedule-block GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { masterId, date, startTime, endTime, blockType, clientName, clientPhone, serviceId, comment } = body;
    if (!masterId || !date || !startTime || !endTime || !blockType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const [master] = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
      .from(masters).where(eq(masters.id, masterId));

    if (blockType === "appointment") {
      const [newApt] = await db.insert(appointments).values({
        masterId,
        serviceId: serviceId || 0,
        appointmentDate: date,
        startTime,
        endTime,
        clientName: clientName || "Клиент",
        clientPhone: clientPhone || "",
        status: "confirmed",
        source: "admin",
        createdAt: now,
      }).returning();

      let serviceName = "Услуга";
      if (serviceId) {
        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, serviceId));
        if (svc) serviceName = svc.name;
      }

      if (master?.telegramId) {
        await notifyMaster(master.telegramId,
          `📋 Новая запись (прямая)\n\n💇 ${serviceName} — ${clientName || "Клиент"}\n⏰ ${startTime}–${endTime}\n📅 ${date}\n📝 Клиент записан напрямую${comment ? `\n💬 ${comment}` : ""}`,
        );
      }
      return NextResponse.json({ type: "appointment", id: newApt.id }, { status: 201 });
    } else {
      const [block] = await db.insert(scheduleBlocks).values({
        masterId,
        blockDate: date,
        startTime,
        endTime,
        blockType,
        status: "scheduled",
        comment: comment || null,
        createdAt: now,
      }).returning();

      if (master?.telegramId) {
        const icon = blockType === "break" ? "☕" : "📌";
        const label = blockType === "break" ? "Перерыв запланирован" : blockType;
        await notifyMaster(master.telegramId,
          `${icon} ${label}\n\n⏰ ${startTime}–${endTime}\n📅 ${date}${comment ? `\n📝 ${comment}` : ""}`,
        );
      }
      return NextResponse.json({ type: "block", id: block.id }, { status: 201 });
    }
  } catch (error) {
    console.error("schedule-block POST error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// PATCH — update block
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, startTime, endTime, blockType, comment } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updates: any = {};
    if (startTime) updates.startTime = startTime;
    if (endTime) updates.endTime = endTime;
    if (blockType) updates.blockType = blockType;
    if (comment !== undefined) updates.comment = comment;

    await db.update(scheduleBlocks).set(updates).where(eq(scheduleBlocks.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("schedule-block PATCH error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    const type = searchParams.get("type") || "block";
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (type === "appointment") {
      await db.delete(appointments).where(eq(appointments.id, id));
    } else {
      await db.delete(scheduleBlocks).where(eq(scheduleBlocks.id, id));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("schedule-block DELETE error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
