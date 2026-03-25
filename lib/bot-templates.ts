import { db } from "@/db";
import { botNotificationTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface NotificationTemplate {
  slug: string;
  botType: "client" | "masters";
  name: string;
  messageTemplate: string;
  isEnabled: boolean;
  variables: string[];
}

export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    slug: "reminder_24h",
    botType: "client",
    name: "Напоминание за 24ч",
    messageTemplate: "⏰ Напоминание о записи\n\n📅 Завтра, {{date}}, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club",
    isEnabled: true,
    variables: ["date", "startTime", "serviceName", "masterName"],
  },
  {
    slug: "reminder_2h",
    botType: "client",
    name: "Напоминание за 2ч",
    messageTemplate: "⏰ Скоро запись!\n\n📅 Сегодня, {{startTime}}\n💇 {{serviceName}}\n👩 {{masterName}}\n📍 Profit Club",
    isEnabled: true,
    variables: ["date", "startTime", "serviceName", "masterName"],
  },
  {
    slug: "optimization_proposal",
    botType: "client",
    name: "Предложение переноса",
    messageTemplate: "🔄 Предложение о переносе\n\n💇 {{serviceName}}\n👩 {{masterName}}\n\n❌ Текущее время: {{oldTime}}\n✅ Предлагаемое: {{newTime}}\n\nЭто позволит оптимизировать расписание мастера.",
    isEnabled: true,
    variables: ["serviceName", "masterName", "oldTime", "newTime"],
  },
  {
    slug: "master_new_appointment",
    botType: "masters",
    name: "Новая запись",
    messageTemplate: "📌 Новая запись\n\n👤 {{clientName}}\n📞 {{clientPhone}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}",
    isEnabled: true,
    variables: ["clientName", "clientPhone", "serviceName", "date", "startTime", "endTime"],
  },
  {
    slug: "master_cancellation",
    botType: "masters",
    name: "Отмена записи",
    messageTemplate: "❌ Запись отменена\n\n👤 {{clientName}}\n💇 {{serviceName}}\n📅 {{date}}, {{startTime}}–{{endTime}}",
    isEnabled: true,
    variables: ["clientName", "serviceName", "date", "startTime", "endTime"],
  },
  {
    slug: "master_break",
    botType: "masters",
    name: "Перерыв",
    messageTemplate: "☕ Перерыв {{breakMinutes}} мин\n\n📅 {{date}}\n🕐 {{breakStart}}–{{breakEnd}}",
    isEnabled: true,
    variables: ["date", "breakStart", "breakEnd", "breakMinutes"],
  },
  {
    slug: "master_early_finish",
    botType: "masters",
    name: "Ранний конец смены",
    messageTemplate: "🏁 Вы свободны с {{freeFrom}}\n\n📅 {{date}}\n🕐 Последняя запись заканчивается в {{freeFrom}}\n📋 Конец смены: {{shiftEnd}}",
    isEnabled: true,
    variables: ["date", "freeFrom", "shiftEnd"],
  },
];

export async function getTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
  try {
    const rows = await db.select({
      messageTemplate: botNotificationTemplates.messageTemplate,
      isEnabled: botNotificationTemplates.isEnabled,
    }).from(botNotificationTemplates)
      .where(eq(botNotificationTemplates.slug, slug))
      .limit(1);

    if (rows.length > 0) {
      return { template: rows[0].messageTemplate, enabled: rows[0].isEnabled };
    }
  } catch (e) {
    console.error(`[bot-templates] Error loading template ${slug}:`, e);
  }

  const def = DEFAULT_TEMPLATES.find(t => t.slug === slug);
  if (def) return { template: def.messageTemplate, enabled: def.isEnabled };
  return null;
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}
