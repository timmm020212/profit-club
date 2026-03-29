import { db } from "../../db/index-postgres";
import { appointments, services, masters } from "../../db/schema-postgres";
import { eq, and } from "drizzle-orm";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "";
}

function getMastersBotToken(): string {
  return process.env.MASTERS_BOT_TOKEN || "";
}

function nowStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
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

        if (apt.clientTelegramId) {
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
  } catch (err) {
    console.error("[status-tracker] Error:", err);
  }
}
