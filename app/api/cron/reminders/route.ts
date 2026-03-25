import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masters, reminderSent, botNotificationTemplates } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
}

async function getTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
  try {
    const rows = await db.select({
      messageTemplate: botNotificationTemplates.messageTemplate,
      isEnabled: botNotificationTemplates.isEnabled,
    }).from(botNotificationTemplates).where(eq(botNotificationTemplates.slug, slug)).limit(1);
    if (rows.length > 0) return { template: rows[0].messageTemplate, enabled: rows[0].isEnabled };
  } catch {}
  return null;
}

function renderTpl(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return NextResponse.json({ error: "No bot token" }, { status: 500 });

    const now = new Date();
    const allAppointments = await db.select({
      id: appointments.id, appointmentDate: appointments.appointmentDate, startTime: appointments.startTime,
      clientTelegramId: appointments.clientTelegramId, serviceId: appointments.serviceId, masterId: appointments.masterId,
    }).from(appointments).where(eq(appointments.status, "confirmed"));

    let sent = 0;
    for (const apt of allAppointments) {
      if (!apt.clientTelegramId?.trim()) continue;
      const aptDt = new Date(`${apt.appointmentDate}T${apt.startTime}:00`);
      const diffH = (aptDt.getTime() - now.getTime()) / 3600000;

      let type: "24hour" | "2hour" | null = null;
      if (diffH >= 23.5 && diffH <= 24.5) type = "24hour";
      else if (diffH >= 1.5 && diffH <= 2.5) type = "2hour";
      if (!type) continue;

      const existing = await db.select().from(reminderSent)
        .where(and(eq(reminderSent.appointmentId, apt.id), eq(reminderSent.reminderType, type)));
      if (existing.length > 0) continue;

      const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
      const [mst] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt.masterId));

      const slug = type === "24hour" ? "reminder_24h" : "reminder_2h";
      const tpl = await getTemplate(slug);
      if (tpl && !tpl.enabled) continue;

      const vars = { date: formatDateRu(apt.appointmentDate), startTime: apt.startTime, serviceName: svc?.name || "\u0423\u0441\u043B\u0443\u0433\u0430", masterName: mst?.fullName || "\u041C\u0430\u0441\u0442\u0435\u0440" };
      const msg = tpl ? renderTpl(tpl.template, vars)
        : type === "24hour"
          ? `\u23F0 Напоминание\n\n\u{1F4C5} Завтра, ${vars.date}, ${vars.startTime}\n\u{1F487} ${vars.serviceName}\n\u{1F469} ${vars.masterName}\n\u{1F4CD} Profit Club`
          : `\u23F0 Скоро запись!\n\n\u{1F4C5} Сегодня, ${vars.startTime}\n\u{1F487} ${vars.serviceName}\n\u{1F469} ${vars.masterName}\n\u{1F4CD} Profit Club`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: apt.clientTelegramId, text: msg,
          reply_markup: { inline_keyboard: [[{ text: "\u274C Отменить запись", callback_data: `cancel_apt_${apt.id}` }]] },
        }),
      });

      await db.insert(reminderSent).values({ appointmentId: apt.id, sentAt: new Date().toISOString(), reminderType: type });
      sent++;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    console.error("[cron/reminders] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
