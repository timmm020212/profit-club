import { Telegraf, Markup } from "telegraf";
import { eq, and, gte } from "drizzle-orm";
import { db } from "../db";
import { appointments, services, masters, workSlots } from "../db/schema";
import { bookingStates } from "./types";
import {
  timeToMinutes,
  formatDateRu,
  todayStr,
  dateStr,
} from "./utils";

function uid(ctx: any): string {
  return String(ctx.from?.id ?? "");
}

/** Check if appointment start is more than 2 hours from now */
function canModify(appointmentDate: string, startTime: string): boolean {
  const aptDate = new Date(appointmentDate + "T" + startTime + ":00");
  const now = new Date();
  const diffMs = aptDate.getTime() - now.getTime();
  return diffMs >= 2 * 60 * 60 * 1000;
}

export function registerAppointmentHandlers(bot: Telegraf<any>) {
  // ── View appointments ─────────────────────────────────────
  async function showAppointments(ctx: any) {
    try {
      const telegramId = uid(ctx);
      const today = todayStr();

      const rows = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.clientTelegramId, telegramId),
            eq(appointments.status, "confirmed"),
            gte(appointments.appointmentDate, today)
          )
        );

      if (rows.length === 0) {
        const text = "У вас нет предстоящих записей.";
        if (ctx.callbackQuery) {
          await ctx.editMessageText(text);
        } else {
          await ctx.reply(text);
        }
        return;
      }

      // Sort by date + time
      rows.sort((a, b) => {
        if (a.appointmentDate !== b.appointmentDate) {
          return a.appointmentDate < b.appointmentDate ? -1 : 1;
        }
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });

      // Fetch all needed services and masters in bulk
      const serviceIds = [...new Set(rows.map((r) => r.serviceId))];
      const masterIds = [...new Set(rows.map((r) => r.masterId))];

      const svcMap = new Map<number, { name: string; price: string | null }>();
      for (const sid of serviceIds) {
        const svcRows = await db.select().from(services).where(eq(services.id, sid));
        if (svcRows.length > 0) {
          svcMap.set(sid, { name: svcRows[0].name, price: svcRows[0].price });
        }
      }

      const masterMap = new Map<number, string>();
      for (const mid of masterIds) {
        const mRows = await db.select().from(masters).where(eq(masters.id, mid));
        if (mRows.length > 0) {
          masterMap.set(mid, mRows[0].fullName);
        }
      }

      // Send each appointment as a separate message
      for (const apt of rows) {
        const svc = svcMap.get(apt.serviceId);
        const masterName = masterMap.get(apt.masterId) || "Мастер";
        const serviceName = svc?.name || "Услуга";
        const price = svc?.price || "—";

        const text =
          `📅 ${formatDateRu(apt.appointmentDate)}, ${apt.startTime}–${apt.endTime}\n` +
          `💇 ${serviceName}\n` +
          `👩 ${masterName}\n` +
          `💰 ${price} ₽`;

        await ctx.reply(text, Markup.inlineKeyboard([
          [
            Markup.button.callback("Перенести", `reschedule_${apt.id}`),
            Markup.button.callback("Отменить", `cancel_apt_${apt.id}`),
          ],
        ]));
      }
    } catch (e) {
      console.error("[appointment-manager] showAppointments error:", e);
      try {
        await ctx.reply("Произошла ошибка при загрузке записей. Попробуйте позже.");
      } catch {}
    }
  }

  // Callback: my_appointments
  bot.action("my_appointments", async (ctx) => {
    try {
      await ctx.answerCbQuery();
    } catch {}
    await showAppointments(ctx);
  });

  // Text: "Мои записи"
  bot.hears(/^Мои записи$/i, async (ctx) => {
    await showAppointments(ctx);
  });

  // ── Cancel flow ───────────────────────────────────────────

  bot.action(/^cancel_apt_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const aptId = parseInt(ctx.match[1]);

      const aptRows = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, aptId),
            eq(appointments.clientTelegramId, uid(ctx)),
            eq(appointments.status, "confirmed")
          )
        );

      if (aptRows.length === 0) {
        await ctx.editMessageText("Запись не найдена или уже отменена.");
        return;
      }

      const apt = aptRows[0];

      if (!canModify(apt.appointmentDate, apt.startTime)) {
        await ctx.editMessageText("❌ Отмена возможна не позднее чем за 2 часа до записи.");
        return;
      }

      // Fetch service name for confirmation
      const svcRows = await db.select().from(services).where(eq(services.id, apt.serviceId));
      const serviceName = svcRows.length > 0 ? svcRows[0].name : "Услуга";

      await ctx.editMessageText(
        `Вы уверены, что хотите отменить запись?\n\n` +
        `💇 ${serviceName}\n` +
        `📅 ${formatDateRu(apt.appointmentDate)}, ${apt.startTime}–${apt.endTime}`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("Да, отменить", `cancel_confirm_${aptId}`),
            Markup.button.callback("Нет, оставить", "cancel_no"),
          ],
        ])
      );
    } catch (e) {
      console.error("[appointment-manager] cancel_apt error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  bot.action(/^cancel_confirm_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const aptId = parseInt(ctx.match[1]);

      const aptRows = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, aptId),
            eq(appointments.clientTelegramId, uid(ctx)),
            eq(appointments.status, "confirmed")
          )
        );

      if (aptRows.length === 0) {
        await ctx.editMessageText("Запись не найдена или уже отменена.");
        return;
      }

      const apt = aptRows[0];

      // Update status
      await db
        .update(appointments)
        .set({ status: "cancelled" })
        .where(eq(appointments.id, aptId));

      // Notify master
      const masterRows = await db.select().from(masters).where(eq(masters.id, apt.masterId));
      const svcRows = await db.select().from(services).where(eq(services.id, apt.serviceId));

      if (masterRows.length > 0 && masterRows[0].telegramId) {
        const { notifyMasterCancellation } = await import("./notify-master");
        await notifyMasterCancellation({
          masterTelegramId: masterRows[0].telegramId,
          clientName: apt.clientName,
          serviceName: svcRows.length > 0 ? svcRows[0].name : "Услуга",
          appointmentDate: apt.appointmentDate,
          startTime: apt.startTime,
          endTime: apt.endTime,
        });
      }

      await ctx.editMessageText("✅ Запись отменена.");
    } catch (e) {
      console.error("[appointment-manager] cancel_confirm error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  bot.action("cancel_no", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.editMessageText("Запись сохранена.");
    } catch (e) {
      console.error("[appointment-manager] cancel_no error:", e);
    }
  });

  // ── Reschedule flow ───────────────────────────────────────

  bot.action(/^reschedule_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const aptId = parseInt(ctx.match[1]);
      const telegramId = uid(ctx);

      const aptRows = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.id, aptId),
            eq(appointments.clientTelegramId, telegramId),
            eq(appointments.status, "confirmed")
          )
        );

      if (aptRows.length === 0) {
        await ctx.editMessageText("Запись не найдена или уже отменена.");
        return;
      }

      const apt = aptRows[0];

      if (!canModify(apt.appointmentDate, apt.startTime)) {
        await ctx.editMessageText("❌ Перенос возможен не позднее чем за 2 часа до записи.");
        return;
      }

      // Load service and master info
      const svcRows = await db.select().from(services).where(eq(services.id, apt.serviceId));
      const masterRows = await db.select().from(masters).where(eq(masters.id, apt.masterId));

      if (svcRows.length === 0 || masterRows.length === 0) {
        await ctx.editMessageText("Ошибка: услуга или мастер не найдены.");
        return;
      }

      const svc = svcRows[0];
      const master = masterRows[0];

      // Set booking state for reschedule
      bookingStates.set(telegramId, {
        step: "date",
        serviceId: apt.serviceId,
        serviceName: svc.name,
        serviceDuration: svc.duration,
        servicePrice: svc.price || "",
        masterId: apt.masterId,
        masterName: master.fullName,
        rescheduleFromId: apt.id,
      });

      // Show date selection (replicate from booking-flow)
      const today = new Date();
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push(dateStr(d));
      }

      const slots = await db
        .select()
        .from(workSlots)
        .where(
          and(
            eq(workSlots.masterId, apt.masterId),
            eq(workSlots.isConfirmed, true)
          )
        );

      const slotDates = new Set(slots.map((s) => s.workDate));
      const availableDates = dates.filter((d) => slotDates.has(d));

      if (availableDates.length === 0) {
        bookingStates.delete(telegramId);
        await ctx.editMessageText(
          `У мастера ${master.fullName} нет доступных дат на ближайшие 7 дней для переноса.`
        );
        return;
      }

      const buttons = availableDates.map((d) => [
        Markup.button.callback(formatDateRu(d), `book_dt_${d}`),
      ]);
      buttons.push([Markup.button.callback("« Отмена", "reschedule_cancel")]);

      await ctx.editMessageText(
        `♻️ Перенос записи\n💇 ${svc.name}\n👩 ${master.fullName}\n\n📅 Выберите новую дату:`,
        Markup.inlineKeyboard(buttons)
      );
    } catch (e) {
      console.error("[appointment-manager] reschedule error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  bot.action("reschedule_cancel", async (ctx) => {
    try {
      await ctx.answerCbQuery();
      bookingStates.delete(uid(ctx));
      await ctx.editMessageText("Перенос отменён. Запись сохранена.");
    } catch (e) {
      console.error("[appointment-manager] reschedule_cancel error:", e);
    }
  });
}
