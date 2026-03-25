import { db } from "../../db/index-postgres";
import { appointments, services, masters, reminderSent, workSlots, scheduleOptimizations, optimizationMoves, adminSettings, botNotificationTemplates } from "../../db/schema-postgres";
import { eq, and } from "drizzle-orm";
import { formatDateRu } from "./utils";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "8568554790:AAEHlp0un2EoHLGSJlE2G-suTZKp5seXz30";
}

async function getTemplate(slug: string): Promise<{ template: string; enabled: boolean } | null> {
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

async function sendTelegramMessage(chatId: string, text: string, appointmentId: number): Promise<void> {
  await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId, text,
      reply_markup: { inline_keyboard: [[{ text: "❌ Отменить запись", callback_data: `cancel_apt_${appointmentId}` }]] },
    }),
  });
}

async function checkAndSendReminders(): Promise<void> {
  try {
    const now = new Date();
    const allAppointments = await db.select({
      id: appointments.id, appointmentDate: appointments.appointmentDate, startTime: appointments.startTime,
      clientTelegramId: appointments.clientTelegramId, serviceId: appointments.serviceId, masterId: appointments.masterId, status: appointments.status,
    }).from(appointments).where(eq(appointments.status, "confirmed"));

    for (const apt of allAppointments) {
      try {
        if (!apt.clientTelegramId?.trim()) continue;
        const aptDt = new Date(`${apt.appointmentDate}T${apt.startTime}:00`);
        const diffH = (aptDt.getTime() - now.getTime()) / 3600000;

        let type: "24hour" | "2hour" | null = null;
        if (diffH >= 23.92 && diffH <= 24.08) type = "24hour";
        else if (diffH >= 1.92 && diffH <= 2.08) type = "2hour";
        if (!type) continue;

        const sent = await db.select().from(reminderSent).where(and(eq(reminderSent.appointmentId, apt.id), eq(reminderSent.reminderType, type)));
        if (sent.length > 0) continue;

        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
        const [mst] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt.masterId));

        const slug = type === "24hour" ? "reminder_24h" : "reminder_2h";
        const tpl = await getTemplate(slug);
        if (tpl && !tpl.enabled) continue;

        const vars = {
          date: formatDateRu(apt.appointmentDate),
          startTime: apt.startTime,
          serviceName: svc?.name || "Услуга",
          masterName: mst?.fullName || "Мастер",
        };
        const msg = tpl
          ? renderTpl(tpl.template, vars)
          : type === "24hour"
            ? `⏰ Напоминание о записи\n\n📅 Завтра, ${vars.date}, ${vars.startTime}\n💇 ${vars.serviceName}\n👩 ${vars.masterName}\n📍 Profit Club`
            : `⏰ Скоро запись!\n\n📅 Сегодня, ${vars.startTime}\n💇 ${vars.serviceName}\n👩 ${vars.masterName}\n📍 Profit Club`;

        await sendTelegramMessage(apt.clientTelegramId, msg, apt.id);
        await db.insert(reminderSent).values({ appointmentId: apt.id, sentAt: new Date().toISOString(), reminderType: type });
        console.log(`[reminders] Sent ${type} for apt ${apt.id}`);
      } catch (err) { console.error(`[reminders] Error apt ${apt.id}:`, err); }
    }
  } catch (err) { console.error("[reminders] Error:", err); }
}

// ── Auto-optimization ────────────────────────────────────────

async function checkAutoOptimization(): Promise<void> {
  try {
    // Check if auto-optimize is enabled
    const enabledSetting = await db.select().from(adminSettings).where(eq(adminSettings.key, "autoOptimizeEnabled"));
    if (enabledSetting.length > 0 && enabledSetting[0].value === "false") return;

    const { computeOptimization } = await import("../../lib/optimize-schedule");
    const allMasters = await db.select().from(masters).where(eq(masters.isActive, true));
    const botToken = getBotToken();

    const now = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    for (const master of allMasters) {
      for (const dateStr of dates) {
        try {
          // Skip if non-completed optimization already exists
          const existing = await db.select().from(scheduleOptimizations)
            .where(and(eq(scheduleOptimizations.masterId, master.id), eq(scheduleOptimizations.workDate, dateStr)));

          // Clean up stale optimizations with invalid moves
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
              console.log(`[auto-optimize] Cleaned stale optimization ${opt.id} for ${dateStr}`);
            }
          }

          // Re-check after cleanup
          const existingAfter = await db.select().from(scheduleOptimizations)
            .where(and(eq(scheduleOptimizations.masterId, master.id), eq(scheduleOptimizations.workDate, dateStr)));

          // If draft exists — check if delay passed, then send
          const draft = existingAfter.find(e => e.status === "draft");
          if (draft) {
            const delay = await getOptimizeDelay();
            const ageMin = (Date.now() - new Date(draft.createdAt).getTime()) / 60000;
            if (ageMin >= delay) {
              // Send all pending moves
              const pendingMoves = await db.select().from(optimizationMoves)
                .where(and(eq(optimizationMoves.optimizationId, draft.id), eq(optimizationMoves.clientResponse, "pending")));

              for (const move of pendingMoves) {
                const [apt] = await db.select().from(appointments).where(and(eq(appointments.id, move.appointmentId), eq(appointments.status, "confirmed")));
                if (!apt?.clientTelegramId) continue;
                const [svc] = await db.select().from(services).where(eq(services.id, apt.serviceId));
                const fDate = new Date(dateStr + "T00:00:00").toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });
                const optTpl = await getTemplate("optimization_proposal");
                if (optTpl && !optTpl.enabled) continue;
                const optVars = {
                  serviceName: svc?.name || "Услуга",
                  masterName: master.fullName,
                  oldTime: `${move.oldStartTime}–${move.oldEndTime}`,
                  newTime: `${move.newStartTime}–${move.newEndTime}`,
                };
                const proposalText = optTpl
                  ? renderTpl(optTpl.template, optVars)
                  : `🔄 Предложение о переносе\n\n💇 ${optVars.serviceName}\n👩 ${optVars.masterName}\n\n❌ Текущее время: ${optVars.oldTime}\n✅ Предлагаемое: ${optVars.newTime}\n\nЭто позволит оптимизировать расписание мастера.`;
                try {
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: apt.clientTelegramId,
                      text: proposalText,
                      reply_markup: { inline_keyboard: [[
                        { text: "✅ Согласиться", callback_data: `opt_accept_${move.id}` },
                        { text: "❌ Оставить как есть", callback_data: `opt_decline_${move.id}` },
                      ]] },
                    }),
                  });
                  await db.update(optimizationMoves).set({ sentAt: new Date().toISOString() }).where(eq(optimizationMoves.id, move.id));
                } catch {}
              }
              await db.update(scheduleOptimizations).set({ status: "sent", sentAt: new Date().toISOString() }).where(eq(scheduleOptimizations.id, draft.id));
              console.log(`[auto-optimize] Sent proposals for ${master.fullName} on ${dateStr}`);
            }
            continue;
          }

          // Skip if any active (draft/sent) optimization exists
          if (existingAfter.some(e => e.status === "draft" || e.status === "sent")) continue;

          // Skip if recent completed exists (< 1 hour) — appointments haven't changed
          // (When appointments change, completed gets deleted by the invalidation logic)
          const recentCompleted = existingAfter.find(e => {
            if (e.status !== "completed") return false;
            const ageMs = Date.now() - new Date(e.createdAt).getTime();
            return ageMs < 3600000; // less than 1 hour old
          });
          if (recentCompleted) continue;

          // Need confirmed workSlot + 2+ appointments
          const slots = await db.select().from(workSlots)
            .where(and(eq(workSlots.masterId, master.id), eq(workSlots.workDate, dateStr), eq(workSlots.isConfirmed, true)));
          if (!slots.length) continue;

          const appts = await db.select().from(appointments)
            .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, dateStr), eq(appointments.status, "confirmed")));
          if (appts.length < 2) continue;

          // Get durations
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

          // Create as DRAFT — will be sent on next iteration after delay
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
          console.log(`[auto-optimize] Created draft for ${master.fullName} on ${dateStr} (${moves.length} moves, sending in ${await getOptimizeDelay()} min)`);
        } catch (err) { console.error(`[auto-optimize] Error master ${master.id} date ${dateStr}:`, err); }
      }
    }
  } catch (e) { console.error("[auto-optimize] Error:", e); }
}

// ── Loop ────────────────────────────────────────────────────

async function getOptimizeDelay(): Promise<number> {
  try {
    const rows = await db.select().from(adminSettings).where(eq(adminSettings.key, "autoOptimizeDelayMinutes"));
    if (rows.length > 0 && rows[0].value) { const v = parseInt(rows[0].value); if (v > 0) return v; }
  } catch {}
  return 5;
}

export function startReminderLoop(): void {
  console.log("[reminders] Loop started");
  checkAndSendReminders();
  setInterval(checkAndSendReminders, 5 * 60 * 1000);

  // Auto-optimize: check every 1 min (draft creation + delayed sending)
  checkAutoOptimization();
  setInterval(async () => {
    try { await checkAutoOptimization(); } catch (e) { console.error("[auto-optimize] error:", e); }
  }, 60 * 1000);
  console.log("[auto-optimize] Checking every 1 min");
}
