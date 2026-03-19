import { db } from "../../db";
import { appointments, services, masters, reminderSent } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateRu } from "./utils";

const BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  "8568554790:AAEHlp0un2EoHLGSJlE2G-suTZKp5seXz30";

async function sendTelegramMessage(
  chatId: string,
  text: string,
  appointmentId: number
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "❌ Отменить запись",
              callback_data: `cancel_apt_${appointmentId}`,
            },
          ],
        ],
      },
    }),
  });
}

async function checkAndSendReminders(): Promise<void> {
  try {
    const now = new Date();

    const allAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        clientTelegramId: appointments.clientTelegramId,
        serviceId: appointments.serviceId,
        masterId: appointments.masterId,
        status: appointments.status,
      })
      .from(appointments)
      .where(eq(appointments.status, "confirmed"));

    for (const apt of allAppointments) {
      try {
        if (!apt.clientTelegramId || apt.clientTelegramId.trim() === "") {
          continue;
        }

        const appointmentDateTime = new Date(
          `${apt.appointmentDate}T${apt.startTime}:00`
        );
        const diffHours =
          (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        let reminderType: "24hour" | "2hour" | null = null;
        if (diffHours >= 23.92 && diffHours <= 24.08) {
          reminderType = "24hour";
        } else if (diffHours >= 1.92 && diffHours <= 2.08) {
          reminderType = "2hour";
        }

        if (!reminderType) {
          continue;
        }

        // Check if reminder already sent
        const existing = await db
          .select()
          .from(reminderSent)
          .where(
            and(
              eq(reminderSent.appointmentId, apt.id),
              eq(reminderSent.reminderType, reminderType)
            )
          );

        if (existing.length > 0) {
          continue;
        }

        // Fetch service and master names
        const [serviceRow] = await db
          .select({ name: services.name })
          .from(services)
          .where(eq(services.id, apt.serviceId));

        const [masterRow] = await db
          .select({ fullName: masters.fullName })
          .from(masters)
          .where(eq(masters.id, apt.masterId));

        const serviceName = serviceRow?.name ?? "Услуга";
        const masterName = masterRow?.fullName ?? "Мастер";

        let message: string;
        if (reminderType === "24hour") {
          message =
            `⏰ Напоминание о записи\n\n` +
            `📅 Завтра, ${formatDateRu(apt.appointmentDate)}, ${apt.startTime}\n` +
            `💇 ${serviceName}\n` +
            `👩 ${masterName}\n` +
            `📍 Profit Club`;
        } else {
          message =
            `⏰ Скоро запись!\n\n` +
            `📅 Сегодня, ${apt.startTime}\n` +
            `💇 ${serviceName}\n` +
            `👩 ${masterName}\n` +
            `📍 Profit Club`;
        }

        await sendTelegramMessage(apt.clientTelegramId, message, apt.id);

        await db.insert(reminderSent).values({
          appointmentId: apt.id,
          sentAt: new Date().toISOString(),
          reminderType,
        });

        console.log(
          `[reminders] Sent ${reminderType} reminder for appointment ${apt.id}`
        );
      } catch (err) {
        console.error(
          `[reminders] Error processing appointment ${apt.id}:`,
          err
        );
      }
    }
  } catch (err) {
    console.error("[reminders] Error in checkAndSendReminders:", err);
  }
}

export function startReminderLoop(): void {
  console.log("[reminders] Loop started, checking every 5 minutes");
  checkAndSendReminders();
  setInterval(checkAndSendReminders, 5 * 60 * 1000);
}
