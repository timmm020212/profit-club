import { db } from "../../db";
import { appointments, services, masters, reminderSent, workSlots, scheduleOptimizations, optimizationMoves, adminSettings } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { formatDateRu } from "./utils";

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || "8568554790:AAEHlp0un2EoHLGSJlE2G-suTZKp5seXz30";
}

async function sendTelegramMessage(
  chatId: string,
  text: string,
  appointmentId: number
): Promise<void> {
  await fetch(`https://api.telegram.org/bot${getBotToken()}/sendMessage`, {
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

async function checkAutoOptimization(): Promise<void> {
  try {
    const { computeOptimization } = await import("../../lib/optimize-schedule");
    const allMasters = await db.select().from(masters).where(eq(masters.isActive, true));

    // Check today and next 7 days
    const now = new Date();
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    const botToken = getBotToken();

    for (const master of allMasters) {
      for (const dateStr of dates) {
        try {
          // Need confirmed workSlot
          const slots = await db.select().from(workSlots)
            .where(and(eq(workSlots.masterId, master.id), eq(workSlots.workDate, dateStr), eq(workSlots.isConfirmed, true)));
          if (!slots.length) continue;

          // Check existing optimizations
          const existing = await db.select().from(scheduleOptimizations)
            .where(and(eq(scheduleOptimizations.masterId, master.id), eq(scheduleOptimizations.workDate, dateStr)));
          const active = existing.filter(e => e.status !== "completed");

          // If there's a draft that hasn't been sent yet — send it now
          const unsent = active.find(e => e.status === "draft");
          if (unsent) {
            const delay = await getOptimizeDelay();
            const createdMs = new Date(unsent.createdAt).getTime();
            const elapsed = (Date.now() - createdMs) / 60000;
            if (elapsed >= delay) {
              // Send proposals for this draft
              const pendingMoves = await db.select().from(optimizationMoves)
                .where(and(eq(optimizationMoves.optimizationId, unsent.id), eq(optimizationMoves.clientResponse, "pending")));

              for (const move of pendingMoves) {
                const apt = await db.select().from(appointments).where(eq(appointments.id, move.appointmentId)).limit(1);
                if (!apt.length || !apt[0].clientTelegramId) continue;
                const [svc] = await db.select().from(services).where(eq(services.id, apt[0].serviceId));
                const dateObj = new Date(dateStr + "T00:00:00");
                const fDate = dateObj.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });

                try {
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      chat_id: apt[0].clientTelegramId,
                      text: `🔄 Предложение о переносе\n\n💇 ${svc?.name || "Услуга"}\n👩 ${master.fullName}\n\n❌ Текущее время: ${move.oldStartTime}–${move.oldEndTime}\n✅ Предлагаемое: ${move.newStartTime}–${move.newEndTime}\n\nЭто позволит оптимизировать расписание мастера.`,
                      reply_markup: {
                        inline_keyboard: [[
                          { text: "✅ Согласиться", callback_data: `opt_accept_${move.id}` },
                          { text: "❌ Оставить как есть", callback_data: `opt_decline_${move.id}` },
                        ]],
                      },
                    }),
                  });
                  await db.update(optimizationMoves).set({ sentAt: new Date().toISOString() }).where(eq(optimizationMoves.id, move.id));
                } catch {}
              }

              await db.update(scheduleOptimizations).set({ status: "sent", sentAt: new Date().toISOString() }).where(eq(scheduleOptimizations.id, unsent.id));
              console.log(`[auto-optimize] Sent draft proposals for ${master.fullName} on ${dateStr}`);
            }
            continue;
          }

          // Skip if already sent/active
          if (active.length > 0) continue;

          // Need 2+ appointments
          const appts = await db.select().from(appointments)
            .where(and(eq(appointments.masterId, master.id), eq(appointments.appointmentDate, dateStr), eq(appointments.status, "confirmed")));
          if (appts.length < 2) continue;

          // Get service durations
          const svcIds = [...new Set(appts.map(a => a.serviceId))];
          const svcMap = new Map<number, number>();
          for (const sid of svcIds) {
            const [svc] = await db.select({ duration: services.duration }).from(services).where(eq(services.id, sid));
            if (svc) svcMap.set(sid, svc.duration);
          }

          const moves = computeOptimization(
            appts.map(a => ({
              id: a.id,
              startTime: a.startTime,
              endTime: a.endTime,
              duration: svcMap.get(a.serviceId) || 60,
            })),
            slots[0].startTime,
            slots[0].endTime,
            dateStr,
          );

          if (moves.length === 0) continue;

          // Save optimization
          const [opt] = await db.insert(scheduleOptimizations).values({
            masterId: master.id,
            workDate: dateStr,
            status: "sent",
            createdAt: new Date().toISOString(),
            sentAt: new Date().toISOString(),
          }).returning();

          // Save moves and send proposals to clients immediately
          for (const move of moves) {
            const [saved] = await db.insert(optimizationMoves).values({
              optimizationId: opt.id,
              appointmentId: move.appointmentId,
              oldStartTime: move.oldStartTime,
              oldEndTime: move.oldEndTime,
              newStartTime: move.newStartTime,
              newEndTime: move.newEndTime,
              clientResponse: "pending",
              sentAt: new Date().toISOString(),
            }).returning();

            // Send proposal to client
            const apt = appts.find(a => a.id === move.appointmentId);
            if (apt?.clientTelegramId && botToken) {
              const [svc] = await db.select().from(services).where(eq(services.id, apt.serviceId));
              const dateObj = new Date(dateStr + "T00:00:00");
              const fDate = dateObj.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "long" });

              const text =
                `🔄 Предложение о переносе\n\n` +
                `💇 ${svc?.name || "Услуга"}\n` +
                `👩 ${master.fullName}\n\n` +
                `❌ Текущее время: ${move.oldStartTime}–${move.oldEndTime}\n` +
                `✅ Предлагаемое: ${move.newStartTime}–${move.newEndTime}\n\n` +
                `Это позволит оптимизировать расписание мастера.`;

              try {
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: apt.clientTelegramId,
                    text,
                    reply_markup: {
                      inline_keyboard: [[
                        { text: "✅ Согласиться", callback_data: `opt_accept_${saved.id}` },
                        { text: "❌ Оставить как есть", callback_data: `opt_decline_${saved.id}` },
                      ]],
                    },
                  }),
                });
              } catch {}
            }
          }

          console.log(`[auto-optimize] Sent ${moves.length} proposals for ${master.fullName} on ${dateStr}`);
        } catch (err) {
          console.error(`[auto-optimize] Error for master ${master.id} on ${dateStr}:`, err);
        }
      }
    }
  } catch (e) {
    console.error("[auto-optimize] Error:", e);
  }
}

async function getOptimizeDelay(): Promise<number> {
  try {
    const rows = await db.select().from(adminSettings).where(eq(adminSettings.key, "autoOptimizeDelayMinutes"));
    if (rows.length > 0 && rows[0].value) {
      const val = parseInt(rows[0].value);
      if (val > 0) return val;
    }
  } catch {}
  return 5; // default 5 minutes
}

export function startReminderLoop(): void {
  console.log("[reminders] Loop started");

  // Reminders: every 5 min
  checkAndSendReminders();
  setInterval(checkAndSendReminders, 5 * 60 * 1000);

  // Auto-optimize: configurable interval from DB, re-reads each cycle
  async function optimizeLoop() {
    const delay = await getOptimizeDelay();
    console.log(`[auto-optimize] Next check in ${delay} min`);
    setTimeout(async () => {
      try {
        await checkAutoOptimization();
      } catch (e) {
        console.error("[auto-optimize] Loop error:", e);
      }
      optimizeLoop();
    }, delay * 60 * 1000);
  }
  optimizeLoop();
}
