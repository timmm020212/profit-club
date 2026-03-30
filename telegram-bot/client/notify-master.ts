import { formatDateRu } from "./utils";
import { db } from "../../db/index-postgres";
import { masters, botNotificationTemplates } from "../../db/schema-postgres";
import { eq } from "drizzle-orm";

async function getNotifTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
  try {
    const rows = await db.select({
      messageTemplate: botNotificationTemplates.messageTemplate,
      isEnabled: botNotificationTemplates.isEnabled,
    }).from(botNotificationTemplates)
      .where(eq(botNotificationTemplates.slug, slug))
      .limit(1);
    if (rows.length > 0) return { template: rows[0].messageTemplate, enabled: rows[0].isEnabled };
  } catch {}
  return null;
}

function renderTpl(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export interface NotificationSettings {
  newAppointments: boolean;
  cancellations: boolean;
  breaks: boolean;
  morningReminder: boolean;
}

export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  newAppointments: true,
  cancellations: true,
  breaks: true,
  morningReminder: false,
};

export async function getMasterSettings(masterTelegramId: string): Promise<NotificationSettings> {
  try {
    const rows = await db.select({ notificationSettings: masters.notificationSettings })
      .from(masters).where(eq(masters.telegramId, masterTelegramId)).limit(1);
    if (rows.length === 0 || !rows[0].notificationSettings) return NOTIFICATION_DEFAULTS;
    return { ...NOTIFICATION_DEFAULTS, ...JSON.parse(rows[0].notificationSettings) };
  } catch { return NOTIFICATION_DEFAULTS; }
}

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
  const tpl = await getNotifTemplate("master_new_appointment");
  if (tpl && !tpl.enabled) return;
  const date = formatDateRu(opts.appointmentDate);
  const phone = opts.clientPhone ? `\n📞 ${opts.clientPhone}` : "";
  const vars = {
    clientName: opts.clientName,
    clientPhone: opts.clientPhone || "",
    serviceName: opts.serviceName,
    date,
    startTime: opts.startTime,
    endTime: opts.endTime,
  };
  const text = tpl
    ? renderTpl(tpl.template, vars)
    : `📌 Новая запись\n\n👤 ${opts.clientName}${phone}\n💇 ${opts.serviceName}\n📅 ${date}, ${opts.startTime}–${opts.endTime}`;
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
  const tpl = await getNotifTemplate("master_cancellation");
  if (tpl && !tpl.enabled) return;
  const date = formatDateRu(opts.appointmentDate);
  const vars = {
    clientName: opts.clientName,
    serviceName: opts.serviceName,
    date,
    startTime: opts.startTime,
    endTime: opts.endTime,
  };
  const text = tpl
    ? renderTpl(tpl.template, vars)
    : `❌ Запись отменена\n\n👤 ${opts.clientName}\n💇 ${opts.serviceName}\n📅 ${date}, ${opts.startTime}–${opts.endTime}`;
  await sendToMaster(opts.masterTelegramId, text);

  // On cancellation, clear dedup for this date so breaks recalculate
  for (const key of sentNotifications) {
    if (key.includes(`:${opts.appointmentDate}:`)) {
      sentNotifications.delete(key);
    }
  }
}

