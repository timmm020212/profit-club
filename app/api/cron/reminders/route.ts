import { NextResponse } from "next/server";
import { db } from "@/db";
import { appointments, services, masters, reminderSent, botNotificationTemplates, workSlots, scheduleOptimizations, optimizationMoves, adminSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { computeOptimization } from "@/lib/optimize-schedule";

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
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return NextResponse.json({ error: "No bot token" }, { status: 500 });

    // Use Moscow timezone for time calculations
    const moscowStr = new Date().toLocaleString("en-US", { timeZone: "Europe/Moscow" });
    const now = new Date(moscowStr);
    const allAppointments = await db.select({
      id: appointments.id, appointmentDate: appointments.appointmentDate, startTime: appointments.startTime,
      clientTelegramId: appointments.clientTelegramId, serviceId: appointments.serviceId, masterId: appointments.masterId,
    }).from(appointments).where(eq(appointments.status, "confirmed"));

    let sent = 0;
    for (const apt of allAppointments) {
      if (!apt.clientTelegramId?.trim()) continue;
      const aptDt = new Date(`${apt.appointmentDate}T${apt.startTime}:00`);
      const diffH = (aptDt.getTime() - now.getTime()) / 3600000;

      // Skip past appointments
      if (diffH <= 0) continue;

      let type: "24hour" | "2hour" | null = null;
      if (diffH <= 2) type = "2hour";
      else if (diffH <= 24) type = "24hour";
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

    // ── Auto-optimization ──
    let optimized = 0;
    try {
      // Check if enabled
      const enabledSetting = await db.select().from(adminSettings).where(eq(adminSettings.key, "autoOptimizeEnabled"));
      const isEnabled = !(enabledSetting.length > 0 && enabledSetting[0].value === "false");

      if (isEnabled) {
        const delayRows = await db.select().from(adminSettings).where(eq(adminSettings.key, "autoOptimizeDelayMinutes"));
        const delay = (delayRows.length > 0 && delayRows[0].value) ? parseInt(delayRows[0].value) || 5 : 5;

        const allMasters = await db.select().from(masters).where(eq(masters.isActive, true));
        const dates: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(now); d.setDate(d.getDate() + i);
          dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
        }

        for (const master of allMasters) {
          for (const dateStr of dates) {
            try {
              const existing = await db.select().from(scheduleOptimizations)
                .where(and(eq(scheduleOptimizations.masterId, master.id), eq(scheduleOptimizations.workDate, dateStr)));

              // Clean stale
              for (const opt of existing.filter(e => e.status !== "completed")) {
                const mvs = await db.select().from(optimizationMoves).where(eq(optimizationMoves.optimizationId, opt.id));
                let hasInvalid = false;
                for (const mv of mvs) {
                  const [apt] = await db.select({ id: appointments.id }).from(appointments)
                    .where(and(eq(appointments.id, mv.appointmentId), eq(appointments.status, "confirmed")));
                  if (!apt) { hasInvalid = true; break; }
                }
                if (hasInvalid || mvs.length === 0) {
                  await db.delete(optimizationMoves).where(eq(optimizationMoves.optimizationId, opt.id));
                  await db.delete(scheduleOptimizations).where(eq(scheduleOptimizations.id, opt.id));
                }
              }

              const existingAfter = await db.select().from(scheduleOptimizations)
                .where(and(eq(scheduleOptimizations.masterId, master.id), eq(scheduleOptimizations.workDate, dateStr)));

              // Send drafts that have waited long enough
              const draft = existingAfter.find(e => e.status === "draft");
              if (draft) {
                const ageMin = (Date.now() - new Date(draft.createdAt).getTime()) / 60000;
                if (ageMin >= delay) {
                  const pendingMoves = await db.select().from(optimizationMoves)
                    .where(and(eq(optimizationMoves.optimizationId, draft.id), eq(optimizationMoves.clientResponse, "pending")));

                  const optTpl = await getTemplate("optimization_proposal");
                  if (!optTpl || optTpl.enabled) {
                    for (const move of pendingMoves) {
                      const [apt] = await db.select().from(appointments).where(and(eq(appointments.id, move.appointmentId), eq(appointments.status, "confirmed")));
                      if (!apt?.clientTelegramId) continue;
                      const [svc] = await db.select().from(services).where(eq(services.id, apt.serviceId));
                      const fDate = formatDateRu(dateStr);
                      const optVars = { serviceName: svc?.name || "Услуга", masterName: master.fullName, oldTime: `${move.oldStartTime}–${move.oldEndTime}`, newTime: `${move.newStartTime}–${move.newEndTime}` };
                      const text = optTpl ? renderTpl(optTpl.template, optVars) : `🔄 Предложение о переносе\n\n💇 ${optVars.serviceName}\n👩 ${optVars.masterName}\n\n❌ Текущее: ${optVars.oldTime}\n✅ Предлагаемое: ${optVars.newTime}`;

                      try {
                        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            chat_id: apt.clientTelegramId, text,
                            reply_markup: { inline_keyboard: [[
                              { text: "✅ Согласиться", callback_data: `opt_accept_${move.id}` },
                              { text: "❌ Оставить", callback_data: `opt_decline_${move.id}` },
                            ]] },
                          }),
                        });
                        await db.update(optimizationMoves).set({ sentAt: new Date().toISOString() }).where(eq(optimizationMoves.id, move.id));
                      } catch {}
                    }
                  }
                  await db.update(scheduleOptimizations).set({ status: "sent", sentAt: new Date().toISOString() }).where(eq(scheduleOptimizations.id, draft.id));
                  optimized++;
                }
                continue;
              }

              if (existingAfter.some(e => e.status === "draft" || e.status === "sent")) continue;
              const recentCompleted = existingAfter.find(e => e.status === "completed" && (Date.now() - new Date(e.createdAt).getTime()) < 3600000);
              if (recentCompleted) continue;

              const slots = await db.select().from(workSlots)
                .where(and(eq(workSlots.masterId, master.id), eq(workSlots.workDate, dateStr), eq(workSlots.isConfirmed, true)));
              if (!slots.length) continue;

              const appts = await db.select().from(appointments)
                .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, dateStr), eq(appointments.status, "confirmed")));
              if (appts.length < 2) continue;

              const svcMap = new Map<number, number>();
              for (const a of appts) {
                if (!svcMap.has(a.serviceId)) {
                  const [s] = await db.select({ duration: services.duration }).from(services).where(eq(services.id, a.serviceId));
                  if (s) svcMap.set(a.serviceId, s.duration);
                }
              }

              const moves = computeOptimization(
                appts.map(a => ({ id: a.id, startTime: a.startTime, endTime: a.endTime, duration: svcMap.get(a.serviceId) || 60 })),
                slots[0].startTime, slots[0].endTime, dateStr,
              );
              if (moves.length === 0) continue;

              const [opt] = await db.insert(scheduleOptimizations).values({
                masterId: master.id, workDate: dateStr, status: "draft", createdAt: new Date().toISOString(),
              }).returning();

              for (const move of moves) {
                await db.insert(optimizationMoves).values({
                  optimizationId: opt.id, appointmentId: move.appointmentId,
                  oldStartTime: move.oldStartTime, oldEndTime: move.oldEndTime,
                  newStartTime: move.newStartTime, newEndTime: move.newEndTime,
                  clientResponse: "pending",
                });
              }
              optimized++;
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error("[cron/optimize] Error:", e);
    }

    return NextResponse.json({ ok: true, remindersSent: sent, optimizationsProcessed: optimized });
  } catch (error) {
    console.error("[cron/reminders] Error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
