import { db } from "../../db/index-postgres";
import { appointments, services, masters, scheduleBlocks } from "../../db/schema-postgres";
import { eq, and } from "drizzle-orm";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function getMastersBotToken(): string {
  return process.env.MASTERS_BOT_TOKEN || "";
}

function getMoscowDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + 3 * 60 * 60 * 1000);
}

function nowStr(): string {
  const d = getMoscowDate();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function currentMinutes(): number {
  const d = getMoscowDate();
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

async function sendMasterMessage(chatId: string, text: string, buttons?: any) {
  const body: any = { chat_id: chatId, text };
  if (buttons) body.reply_markup = { inline_keyboard: buttons };
  await fetch(`https://api.telegram.org/bot${getMastersBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function sendClientMessage(chatId: string, text: string, buttons?: any) {
  const body: any = { chat_id: chatId, text };
  if (buttons) body.reply_markup = { inline_keyboard: buttons };
  await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function notifyAdmin(text: string) {
  const adminId = process.env.ADMIN_TELEGRAM_ID;
  if (!adminId || adminId === "123456789") return;
  await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: adminId, text }),
  });
}

export async function checkStatusTransitions(): Promise<void> {
  try {
    const today = nowStr();
    const nowMin = currentMinutes();

    // 1. confirmed → in_progress (startTime reached today)
    const confirmedToday = await db.select({
      id: appointments.id,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      clientName: appointments.clientName,
      clientTelegramId: appointments.clientTelegramId,
      serviceId: appointments.serviceId,
      masterId: appointments.masterId,
    }).from(appointments)
      .where(and(
        eq(appointments.appointmentDate, today),
        eq(appointments.status, "confirmed"),
      ));

    for (const apt of confirmedToday) {
      const aptMin = timeToMin(apt.startTime);
      if (nowMin >= aptMin) {
        await db.update(appointments)
          .set({ status: "in_progress" })
          .where(eq(appointments.id, apt.id));

        const [master] = await db.select({ telegramId: masters.telegramId, fullName: masters.fullName })
          .from(masters).where(eq(masters.id, apt.masterId));
        const [svc] = await db.select({ name: services.name })
          .from(services).where(eq(services.id, apt.serviceId));

        if (master?.telegramId) {
          await sendMasterMessage(master.telegramId,
            `🔔 Запись началась!\n\n💇 ${svc?.name || "Услуга"} — ${apt.clientName}\n⏰ ${apt.startTime}–${apt.endTime}`,
            [[{ text: "✅ Завершить запись", callback_data: `complete_apt_${apt.id}` }]],
          );
        }
        console.log(`[status-tracker] apt ${apt.id} → in_progress`);
      }
    }

    // 2. in_progress → completed_by_master (15 min after endTime, auto)
    const inProgress = await db.select({
      id: appointments.id,
      endTime: appointments.endTime,
      clientName: appointments.clientName,
      clientTelegramId: appointments.clientTelegramId,
      serviceId: appointments.serviceId,
      masterId: appointments.masterId,
      startTime: appointments.startTime,
    }).from(appointments)
      .where(and(
        eq(appointments.appointmentDate, today),
        eq(appointments.status, "in_progress"),
      ));

    for (const apt of inProgress) {
      const endMin = timeToMin(apt.endTime);
      if (nowMin >= endMin + 15) {
        const now = new Date().toISOString();
        await db.update(appointments)
          .set({ status: "completed_by_master", completedByMasterAt: now })
          .where(eq(appointments.id, apt.id));

        const [svc] = await db.select({ name: services.name })
          .from(services).where(eq(services.id, apt.serviceId));

        const [aptSource] = await db.select({ source: appointments.source }).from(appointments).where(eq(appointments.id, apt.id));
        if (aptSource?.source === "admin") {
          // Direct appointment — skip client, go straight to completed
          await db.update(appointments)
            .set({ status: "completed" })
            .where(eq(appointments.id, apt.id));
          console.log(`[status-tracker] apt ${apt.id} → completed (direct, no client confirm)`);
        } else if (apt.clientTelegramId) {
          await sendClientMessage(apt.clientTelegramId,
            `✅ Ваша запись завершена\n\n💇 ${svc?.name || "Услуга"}\n⏰ ${apt.startTime}–${apt.endTime}\n\nПодтвердите завершение:`,
            [
              [{ text: "✅ Подтверждаю", callback_data: `confirm_complete_${apt.id}` }],
              [{ text: "❌ Не согласен", callback_data: `dispute_complete_${apt.id}` }],
            ],
          );
        }
        console.log(`[status-tracker] apt ${apt.id} → completed_by_master (auto)`);
      }
    }

    // 3. completed_by_master → completed (1 hour after completedByMasterAt)
    const awaitingConfirm = await db.select({
      id: appointments.id,
      completedByMasterAt: appointments.completedByMasterAt,
      clientName: appointments.clientName,
      serviceId: appointments.serviceId,
      masterId: appointments.masterId,
      startTime: appointments.startTime,
    }).from(appointments)
      .where(eq(appointments.status, "completed_by_master"));

    for (const apt of awaitingConfirm) {
      if (!apt.completedByMasterAt) continue;
      const completedAt = new Date(apt.completedByMasterAt).getTime();
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (completedAt <= hourAgo) {
        await db.update(appointments)
          .set({ status: "completed", autoCompleted: true })
          .where(eq(appointments.id, apt.id));

        const [svc] = await db.select({ name: services.name })
          .from(services).where(eq(services.id, apt.serviceId));
        const [master] = await db.select({ fullName: masters.fullName })
          .from(masters).where(eq(masters.id, apt.masterId));

        await notifyAdmin(
          `⚠️ Запись завершена автоматически — клиент не подтвердил\n\n💇 ${svc?.name || "Услуга"}\n👤 ${apt.clientName}\n👩 ${master?.fullName || "Мастер"}\n⏰ ${apt.startTime}`,
        );
        console.log(`[status-tracker] apt ${apt.id} → completed (auto, client no response)`);
      }
    }
    // 4. Schedule blocks: scheduled → active (startTime reached)
    const scheduledBlocks = await db.select({
      id: scheduleBlocks.id,
      startTime: scheduleBlocks.startTime,
      endTime: scheduleBlocks.endTime,
      blockType: scheduleBlocks.blockType,
    }).from(scheduleBlocks)
      .where(and(
        eq(scheduleBlocks.blockDate, today),
        eq(scheduleBlocks.status, "scheduled"),
      ));

    for (const block of scheduledBlocks) {
      if (nowMin >= timeToMin(block.startTime)) {
        await db.update(scheduleBlocks)
          .set({ status: "active" })
          .where(eq(scheduleBlocks.id, block.id));
        console.log(`[status-tracker] block ${block.id} (${block.blockType}) → active`);
      }
    }

    // 5. Schedule blocks: active → finished (endTime reached)
    const activeBlocks = await db.select({
      id: scheduleBlocks.id,
      endTime: scheduleBlocks.endTime,
      blockType: scheduleBlocks.blockType,
    }).from(scheduleBlocks)
      .where(and(
        eq(scheduleBlocks.blockDate, today),
        eq(scheduleBlocks.status, "active"),
      ));

    for (const block of activeBlocks) {
      if (nowMin >= timeToMin(block.endTime)) {
        await db.update(scheduleBlocks)
          .set({ status: "finished" })
          .where(eq(scheduleBlocks.id, block.id));
        console.log(`[status-tracker] block ${block.id} (${block.blockType}) → finished`);
      }
    }
  } catch (err) {
    console.error("[status-tracker] Error:", err);
  }
}
