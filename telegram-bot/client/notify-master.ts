import { formatDateRu, timeToMinutes } from "./utils";

function getMastersBotToken(): string {
  return process.env.MASTERS_BOT_TOKEN || "";
}

async function sendToMaster(chatId: string, text: string) {
  const token = getMastersBotToken();
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[notify-master] Telegram API error:", err);
    }
  } catch (e) {
    console.error("[notify-master] Error:", e);
  }
}

// Dedup: track sent break/earlyFinish notifications to avoid repeats
// Key format: "masterId:date:breakStart-breakEnd" or "masterId:date:earlyFinish:freeFrom"
const sentNotifications = new Set<string>();

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

  // On cancellation, clear dedup for this date so breaks recalculate
  for (const key of sentNotifications) {
    if (key.includes(`:${opts.appointmentDate}:`)) {
      sentNotifications.delete(key);
    }
  }
}

export function detectBreaks(
  appointmentsList: { startTime: string; endTime: string }[],
  slotInterval: number = 30
): { breakStart: string; breakEnd: string; breakMinutes: number }[] {
  const sorted = [...appointmentsList].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const breaks: { breakStart: string; breakEnd: string; breakMinutes: number }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const endMin = timeToMinutes(sorted[i].endTime);
    const nextStartMin = timeToMinutes(sorted[i + 1].startTime);
    const gap = nextStartMin - endMin;
    if (gap > 0 && gap < slotInterval) {
      breaks.push({
        breakStart: sorted[i].endTime,
        breakEnd: sorted[i + 1].startTime,
        breakMinutes: gap,
      });
    }
  }
  return breaks;
}

export async function notifyMasterBreak(opts: {
  masterTelegramId: string | null;
  appointmentDate: string;
  breakStart: string;
  breakEnd: string;
  breakMinutes: number;
}) {
  if (!opts.masterTelegramId) return;
  const key = `${opts.masterTelegramId}:${opts.appointmentDate}:${opts.breakStart}-${opts.breakEnd}`;
  if (sentNotifications.has(key)) return;
  sentNotifications.add(key);

  const date = formatDateRu(opts.appointmentDate);
  const text =
    `☕ Перерыв ${opts.breakMinutes} мин\n\n` +
    `📅 ${date}\n` +
    `🕐 ${opts.breakStart}–${opts.breakEnd}`;
  await sendToMaster(opts.masterTelegramId, text);
  console.log(`[notify-master] Sent break notification: ${key}`);
}

export async function notifyMasterEarlyFinish(opts: {
  masterTelegramId: string | null;
  appointmentDate: string;
  freeFrom: string;
  shiftEnd: string;
  freeMinutes: number;
}) {
  if (!opts.masterTelegramId) return;
  const key = `${opts.masterTelegramId}:${opts.appointmentDate}:earlyFinish:${opts.freeFrom}`;
  if (sentNotifications.has(key)) return;
  sentNotifications.add(key);

  const date = formatDateRu(opts.appointmentDate);
  const text =
    `🏁 Вы свободны с ${opts.freeFrom}\n\n` +
    `📅 ${date}\n` +
    `🕐 Последняя запись заканчивается в ${opts.freeFrom}\n` +
    `📋 Конец смены: ${opts.shiftEnd}`;
  await sendToMaster(opts.masterTelegramId, text);
  console.log(`[notify-master] Sent early finish notification: ${key}`);
}
