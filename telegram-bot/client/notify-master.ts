import { formatDateRu } from "./utils";

const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || "";

async function sendToMaster(chatId: string, text: string) {
  if (!MASTERS_BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${MASTERS_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("[notify-master] Error:", e);
  }
}

export async function notifyMasterNewAppointment(opts: {
  masterTelegramId: string | null;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}) {
  if (!opts.masterTelegramId) return;
  const date = formatDateRu(opts.appointmentDate);
  const phone = opts.clientPhone ? `\n📞 ${opts.clientPhone}` : "";
  const text =
    `📌 Новая запись\n\n` +
    `👤 ${opts.clientName}${phone}\n` +
    `💇 ${opts.serviceName}\n` +
    `📅 ${date}, ${opts.startTime}–${opts.endTime}`;
  await sendToMaster(opts.masterTelegramId, text);
}

export async function notifyMasterCancellation(opts: {
  masterTelegramId: string | null;
  clientName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
}) {
  if (!opts.masterTelegramId) return;
  const date = formatDateRu(opts.appointmentDate);
  const text =
    `❌ Запись отменена\n\n` +
    `👤 ${opts.clientName}\n` +
    `💇 ${opts.serviceName}\n` +
    `📅 ${date}, ${opts.startTime}–${opts.endTime}`;
  await sendToMaster(opts.masterTelegramId, text);
}
