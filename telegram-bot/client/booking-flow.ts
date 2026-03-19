import { Telegraf, Markup } from "telegraf";
import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { services, masters, workSlots, appointments, clients } from "../../db/schema";
import { BookingState, bookingStates } from "./types";
import {
  timeToMinutes,
  minutesToTime,
  formatDateRu,
  todayStr,
  dateStr,
  rolesMatch,
  timeRangesOverlap,
} from "./utils";
import { notifyMasterNewAppointment, notifyMasterCancellation, detectBreaks, notifyMasterBreak, notifyMasterEarlyFinish } from "./notify-master";

function uid(ctx: any): string {
  return String(ctx.from?.id ?? "");
}

function getState(ctx: any): BookingState {
  const id = uid(ctx);
  if (!bookingStates.has(id)) {
    bookingStates.set(id, { step: "category" });
  }
  return bookingStates.get(id)!;
}

export function registerBookingHandlers(bot: Telegraf<any>) {
  // ── 1. Entry: show categories ──────────────────────────────
  // Both 'book' (main menu button) and 'book_start' trigger the same flow
  async function showCategories(ctx: any) {
    try {
      const id = uid(ctx);
      bookingStates.set(id, { step: "category" });

      const allServices = await db.select().from(services);
      const categorySet = new Set<string>();
      for (const s of allServices) {
        if (s.category && s.category.trim()) {
          categorySet.add(s.category.trim());
        }
      }
      const categories = Array.from(categorySet).sort();

      if (categories.length === 0) {
        await ctx.editMessageText("Нет доступных категорий услуг.");
        return;
      }

      const buttons = categories.map((cat: string, i: number) =>
        [Markup.button.callback(cat, `book_cat_${i}`)]
      );
      buttons.push([Markup.button.callback("« Назад", "book_back_menu")]);

      const state = getState(ctx);
      (state as any)._categories = categories;

      try {
        await ctx.editMessageText(
          "📋 Выберите категорию услуг:",
          Markup.inlineKeyboard(buttons)
        );
      } catch {
        await ctx.reply(
          "📋 Выберите категорию услуг:",
          Markup.inlineKeyboard(buttons)
        );
      }
      try { await ctx.answerCbQuery(); } catch {}
    } catch (e) {
      console.error("[booking-flow] showCategories error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  }

  bot.action("book", async (ctx) => {
    await showCategories(ctx);
  });

  bot.action("book_start", async (ctx) => {
    await showCategories(ctx);
  });

  // ── 2. Category selected → show services ──────────────────
  bot.action(/^book_cat_(\d+)$/, async (ctx) => {
    try {
      const catIndex = parseInt(ctx.match[1]);
      const state = getState(ctx);
      const categories: string[] = (state as any)._categories;

      if (!categories || catIndex >= categories.length) {
        await ctx.answerCbQuery("Категория не найдена");
        return;
      }

      const categoryName = categories[catIndex];
      state.step = "service";
      state.categoryName = categoryName;

      const svcList = await db
        .select()
        .from(services)
        .where(eq(services.category, categoryName));

      if (svcList.length === 0) {
        await ctx.editMessageText(
          `В категории «${categoryName}» нет услуг.`,
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_cat")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const buttons = svcList.map((s) => [
        Markup.button.callback(
          `${s.name} — ${s.price || "?"} (${s.duration} мин)`,
          `book_svc_${s.id}`
        ),
      ]);
      buttons.push([Markup.button.callback("« Назад", "book_back_cat")]);

      await ctx.editMessageText(
        `💇 Услуги в категории «${categoryName}»:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_cat error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  // ── 3. Service selected → show matching masters ───────────
  bot.action(/^book_svc_(\d+)$/, async (ctx) => {
    try {
      const serviceId = parseInt(ctx.match[1]);
      const state = getState(ctx);

      const svcRows = await db.select().from(services).where(eq(services.id, serviceId));
      if (svcRows.length === 0) {
        await ctx.answerCbQuery("Услуга не найдена");
        return;
      }
      const svc = svcRows[0];

      state.step = "master";
      state.serviceId = svc.id;
      state.serviceName = svc.name;
      state.serviceDuration = svc.duration;
      state.servicePrice = svc.price || "";

      const allMasters = await db
        .select()
        .from(masters)
        .where(eq(masters.isActive, true));

      const matching = allMasters.filter((m) =>
        rolesMatch(svc.executorRole ?? null, m.specialization)
      );

      if (matching.length === 0) {
        await ctx.editMessageText(
          `Нет доступных мастеров для услуги «${svc.name}».`,
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_svc")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const buttons = matching.map((m) => [
        Markup.button.callback(
          `${m.fullName} — ${m.specialization}`,
          `book_mst_${m.id}`
        ),
      ]);
      buttons.push([Markup.button.callback("« Назад", "book_back_svc")]);

      await ctx.editMessageText(
        `👨‍🔧 Выберите мастера для «${svc.name}»:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_svc error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  // ── 4. Master selected → show next 7 days with confirmed workSlots ─
  bot.action(/^book_mst_(\d+)$/, async (ctx) => {
    try {
      const masterId = parseInt(ctx.match[1]);
      const state = getState(ctx);

      const masterRows = await db.select().from(masters).where(eq(masters.id, masterId));
      if (masterRows.length === 0) {
        await ctx.answerCbQuery("Мастер не найден");
        return;
      }
      const master = masterRows[0];

      state.step = "date";
      state.masterId = master.id;
      state.masterName = master.fullName;

      // Get next 7 days
      const today = new Date();
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dates.push(dateStr(d));
      }

      // Fetch confirmed work slots for these dates
      const slots = await db
        .select()
        .from(workSlots)
        .where(
          and(
            eq(workSlots.masterId, masterId),
            eq(workSlots.isConfirmed, true)
          )
        );

      const slotDates = new Set(slots.map((s) => s.workDate));
      const availableDates = dates.filter((d) => slotDates.has(d));

      if (availableDates.length === 0) {
        await ctx.editMessageText(
          `У мастера ${master.fullName} нет доступных дат на ближайшие 7 дней.`,
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_master")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const buttons = availableDates.map((d) => [
        Markup.button.callback(formatDateRu(d), `book_dt_${d}`),
      ]);
      buttons.push([Markup.button.callback("« Назад", "book_back_master")]);

      await ctx.editMessageText(
        `📅 Выберите дату для записи к ${master.fullName}:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_mst error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  // ── 5. Date selected → show available time slots ──────────
  bot.action(/^book_dt_(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    try {
      const selectedDate = ctx.match[1];
      const state = getState(ctx);

      if (!state.masterId || !state.serviceDuration) {
        await ctx.answerCbQuery("Ошибка состояния, начните заново");
        return;
      }

      state.step = "time";
      state.date = selectedDate;

      // Get confirmed work slots for this master on this date
      const workDay = await db
        .select()
        .from(workSlots)
        .where(
          and(
            eq(workSlots.masterId, state.masterId),
            eq(workSlots.workDate, selectedDate),
            eq(workSlots.isConfirmed, true)
          )
        );

      if (workDay.length === 0) {
        await ctx.editMessageText(
          "Нет рабочих слотов на эту дату.",
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_date")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const workStart = timeToMinutes(workDay[0].startTime);
      const workEnd = timeToMinutes(workDay[0].endTime);
      const duration = state.serviceDuration;

      // Get existing confirmed appointments
      const existing = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.masterId, state.masterId),
            eq(appointments.appointmentDate, selectedDate),
            eq(appointments.status, "confirmed")
          )
        );

      // Generate 30-min interval slots
      const slotInterval = 30;
      const availableSlots: { start: string; end: string }[] = [];
      let currentTime = workStart;

      while (currentTime + duration <= workEnd) {
        const slotStart = currentTime;
        const slotEnd = currentTime + duration;

        let isAvailable = true;
        for (const appt of existing) {
          const apptStart = timeToMinutes(appt.startTime);
          const apptEnd = timeToMinutes(appt.endTime);
          if (timeRangesOverlap(slotStart, slotEnd, apptStart, apptEnd)) {
            isAvailable = false;
            break;
          }
        }

        if (isAvailable) {
          availableSlots.push({
            start: minutesToTime(slotStart),
            end: minutesToTime(slotEnd),
          });
        }

        currentTime += slotInterval;
      }

      if (availableSlots.length === 0) {
        await ctx.editMessageText(
          `Нет свободного времени на ${formatDateRu(selectedDate)}.`,
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_date")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      // 2 columns layout
      const buttons: any[][] = [];
      for (let i = 0; i < availableSlots.length; i += 2) {
        const row: any[] = [
          Markup.button.callback(
            `${availableSlots[i].start}–${availableSlots[i].end}`,
            `book_tm_${availableSlots[i].start}`
          ),
        ];
        if (i + 1 < availableSlots.length) {
          row.push(
            Markup.button.callback(
              `${availableSlots[i + 1].start}–${availableSlots[i + 1].end}`,
              `book_tm_${availableSlots[i + 1].start}`
            )
          );
        }
        buttons.push(row);
      }
      buttons.push([Markup.button.callback("« Назад", "book_back_date")]);

      // Store slots for endTime lookup
      (state as any)._slots = availableSlots;

      await ctx.editMessageText(
        `🕐 Выберите время на ${formatDateRu(selectedDate)}:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_dt error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  // ── 6. Time selected → show confirmation card ─────────────
  bot.action(/^book_tm_(\d{2}:\d{2})$/, async (ctx) => {
    try {
      const startTime = ctx.match[1];
      const state = getState(ctx);

      if (!state.date || !state.masterId || !state.serviceDuration) {
        await ctx.answerCbQuery("Ошибка состояния, начните заново");
        return;
      }

      // Find endTime from stored slots
      const slots: { start: string; end: string }[] = (state as any)._slots || [];
      const slot = slots.find((s) => s.start === startTime);
      const endTime = slot
        ? slot.end
        : minutesToTime(timeToMinutes(startTime) + state.serviceDuration);

      state.step = "confirm";
      state.startTime = startTime;
      state.endTime = endTime;

      const text =
        `📌 Подтвердите запись:\n\n` +
        `💇 ${state.serviceName}\n` +
        `💰 ${state.servicePrice}\n` +
        `👨‍🔧 ${state.masterName}\n` +
        `📅 ${formatDateRu(state.date)}\n` +
        `🕐 ${startTime}–${endTime}`;

      await ctx.editMessageText(
        text,
        Markup.inlineKeyboard([
          [Markup.button.callback("✅ Подтвердить", "book_confirm")],
          [Markup.button.callback("« Назад к времени", "book_back_time")],
          [Markup.button.callback("« Отмена", "book_back_menu")],
        ])
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_tm error:", e);
      try { await ctx.answerCbQuery("Ошибка, попробуйте позже"); } catch {}
    }
  });

  // ── 7. Confirm → INSERT appointment, notify, clear state ──
  bot.action("book_confirm", async (ctx) => {
    try {
      const telegramId = uid(ctx);
      const state = getState(ctx);

      if (
        !state.masterId ||
        !state.serviceId ||
        !state.date ||
        !state.startTime ||
        !state.endTime
      ) {
        await ctx.answerCbQuery("Ошибка состояния, начните заново");
        return;
      }

      // Look up client
      const clientRows = await db
        .select()
        .from(clients)
        .where(eq(clients.telegramId, telegramId));

      const clientName = clientRows.length > 0 ? clientRows[0].name : (ctx.from?.first_name || "Клиент");
      const clientPhone = clientRows.length > 0 ? clientRows[0].phone : null;

      // If rescheduling, cancel old appointment
      if (state.rescheduleFromId) {
        const oldAppt = await db
          .select()
          .from(appointments)
          .where(eq(appointments.id, state.rescheduleFromId));

        await db
          .update(appointments)
          .set({ status: "cancelled" })
          .where(eq(appointments.id, state.rescheduleFromId));

        if (oldAppt.length > 0) {
          const oldMaster = await db
            .select()
            .from(masters)
            .where(eq(masters.id, oldAppt[0].masterId));

          const oldService = await db
            .select()
            .from(services)
            .where(eq(services.id, oldAppt[0].serviceId));

          if (oldMaster.length > 0) {
            await notifyMasterCancellation({
              masterTelegramId: oldMaster[0].telegramId,
              clientName,
              serviceName: oldService.length > 0 ? oldService[0].name : "Услуга",
              appointmentDate: oldAppt[0].appointmentDate,
              startTime: oldAppt[0].startTime,
              endTime: oldAppt[0].endTime,
            });
          }
        }
      }

      // Insert new appointment
      const now = new Date();
      const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      await db.insert(appointments).values({
        masterId: state.masterId,
        serviceId: state.serviceId,
        appointmentDate: state.date,
        startTime: state.startTime,
        endTime: state.endTime,
        clientName,
        clientPhone,
        clientTelegramId: telegramId,
        status: "confirmed",
        createdAt,
      });

      // Fetch master info
      const masterRows = await db
        .select()
        .from(masters)
        .where(eq(masters.id, state.masterId));

      // 1. Notify about breaks/early-finish FIRST
      try {
        const masterTgId = masterRows.length > 0 ? masterRows[0].telegramId : null;
        const newStart = state.startTime!;
        const newEnd = state.endTime!;
        const newStartMin = timeToMinutes(newStart);
        const newEndMin = timeToMinutes(newEnd);

        // Get all confirmed appointments on this date
        const dayAppointments = await db
          .select({ startTime: appointments.startTime, endTime: appointments.endTime })
          .from(appointments)
          .where(
            and(
              eq(appointments.masterId, state.masterId!),
              eq(appointments.appointmentDate, state.date!),
              eq(appointments.status, "confirmed")
            )
          );

        // Sort and find immediate neighbors of the new appointment
        const sorted = [...dayAppointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const newIdx = sorted.findIndex(a => a.startTime === newStart && a.endTime === newEnd);

        // Gap BEFORE this appointment (between previous appointment's end and this start)
        if (newIdx > 0) {
          const prev = sorted[newIdx - 1];
          const prevEndMin = timeToMinutes(prev.endTime);
          const gap = newStartMin - prevEndMin;
          if (gap > 0 && gap < 30) {
            await notifyMasterBreak({
              masterTelegramId: masterTgId,
              appointmentDate: state.date!,
              breakStart: prev.endTime,
              breakEnd: newStart,
              breakMinutes: gap,
            });
          }
        }

        // Gap AFTER this appointment (between this end and next appointment's start)
        if (newIdx >= 0 && newIdx < sorted.length - 1) {
          const next = sorted[newIdx + 1];
          const nextStartMin = timeToMinutes(next.startTime);
          const gap = nextStartMin - newEndMin;
          if (gap > 0 && gap < 30) {
            await notifyMasterBreak({
              masterTelegramId: masterTgId,
              appointmentDate: state.date!,
              breakStart: newEnd,
              breakEnd: next.startTime,
              breakMinutes: gap,
            });
          }
        }

        // Early finish: last appointment of the day AND no service fits in remaining time
        const isLast = newIdx === sorted.length - 1;
        if (isLast) {
          const shiftSlots = await db
            .select({ endTime: workSlots.endTime })
            .from(workSlots)
            .where(
              and(
                eq(workSlots.masterId, state.masterId!),
                eq(workSlots.workDate, state.date!),
                eq(workSlots.isConfirmed, true)
              )
            );

          if (shiftSlots.length > 0) {
            const shiftEndMin = timeToMinutes(shiftSlots[0].endTime);
            const freeGap = shiftEndMin - newEndMin;

            // Find minimum duration of services this master can do
            const allSvcs = await db.select({ duration: services.duration }).from(services);
            const minDuration = allSvcs.length > 0 ? Math.min(...allSvcs.map(s => s.duration)) : 30;

            console.log(`[booking-flow] Early finish: newEnd=${newEnd}, shiftEnd=${shiftSlots[0].endTime}, gap=${freeGap}min, minService=${minDuration}min`);
            if (freeGap > 0 && freeGap < minDuration) {
              await notifyMasterEarlyFinish({
                masterTelegramId: masterTgId,
                appointmentDate: state.date!,
                freeFrom: newEnd,
                shiftEnd: shiftSlots[0].endTime,
                freeMinutes: freeGap,
              });
            }
          }
        }
      } catch (e) {
        console.error("[booking-flow] break/earlyFinish error:", e);
      }

      // 2. Then notify master about the new appointment
      if (masterRows.length > 0) {
        await notifyMasterNewAppointment({
          masterTelegramId: masterRows[0].telegramId,
          clientName,
          clientPhone,
          serviceName: state.serviceName || "Услуга",
          appointmentDate: state.date,
          startTime: state.startTime,
          endTime: state.endTime,
        });
      }

      // 3. Success message to client
      const rescheduleNote = state.rescheduleFromId
        ? "\n\n♻️ Предыдущая запись отменена."
        : "";

      await ctx.editMessageText(
        `✅ Вы записаны!\n\n` +
        `💇 ${state.serviceName}\n` +
        `👨‍🔧 ${state.masterName}\n` +
        `📅 ${formatDateRu(state.date)}\n` +
        `🕐 ${state.startTime}–${state.endTime}` +
        rescheduleNote
      );

      // Clear state
      bookingStates.delete(telegramId);
      await ctx.answerCbQuery("Запись создана!");
    } catch (e) {
      console.error("[booking-flow] book_confirm error:", e);
      try {
        await ctx.editMessageText("❌ Произошла ошибка при создании записи. Попробуйте позже.");
      } catch {}
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });

  // ── Back navigation ────────────────────────────────────────

  bot.action("book_back_menu", async (ctx) => {
    try {
      bookingStates.delete(uid(ctx));
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        "Выберите действие:",
        Markup.inlineKeyboard([
          [Markup.button.callback("📅 Записаться", "book")],
          [Markup.button.callback("👤 Мои записи", "my_appointments")],
          [Markup.button.callback("ℹ️ О нас", "about")],
        ])
      );
    } catch (e) {
      console.error("[booking-flow] book_back_menu error:", e);
    }
  });

  bot.action("book_back_cat", async (ctx) => {
    try {
      // Re-trigger category display
      const id = uid(ctx);
      bookingStates.set(id, { step: "category" });

      const allServices = await db.select().from(services);
      const categorySet = new Set<string>();
      for (const s of allServices) {
        if (s.category && s.category.trim()) {
          categorySet.add(s.category.trim());
        }
      }
      const categories = Array.from(categorySet).sort();

      if (categories.length === 0) {
        await ctx.editMessageText("Нет доступных категорий услуг.");
        await ctx.answerCbQuery();
        return;
      }

      const state = getState(ctx);
      (state as any)._categories = categories;

      const buttons = categories.map((cat, i) =>
        [Markup.button.callback(cat, `book_cat_${i}`)]
      );
      buttons.push([Markup.button.callback("« Назад", "book_back_menu")]);

      await ctx.editMessageText(
        "📋 Выберите категорию услуг:",
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_back_cat error:", e);
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });

  bot.action("book_back_svc", async (ctx) => {
    try {
      const state = getState(ctx);
      const categoryName = state.categoryName;

      if (!categoryName) {
        // Fallback to categories
        await ctx.answerCbQuery();
        return;
      }

      state.step = "service";

      const svcList = await db
        .select()
        .from(services)
        .where(eq(services.category, categoryName));

      const buttons = svcList.map((s) => [
        Markup.button.callback(
          `${s.name} — ${s.price || "?"} (${s.duration} мин)`,
          `book_svc_${s.id}`
        ),
      ]);
      buttons.push([Markup.button.callback("« Назад", "book_back_cat")]);

      await ctx.editMessageText(
        `💇 Услуги в категории «${categoryName}»:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_back_svc error:", e);
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });

  bot.action("book_back_master", async (ctx) => {
    try {
      const state = getState(ctx);

      if (!state.serviceId) {
        await ctx.answerCbQuery();
        return;
      }

      state.step = "master";

      const svcRows = await db.select().from(services).where(eq(services.id, state.serviceId));
      if (svcRows.length === 0) {
        await ctx.answerCbQuery("Услуга не найдена");
        return;
      }
      const svc = svcRows[0];

      const allMasters = await db
        .select()
        .from(masters)
        .where(eq(masters.isActive, true));

      const matching = allMasters.filter((m) =>
        rolesMatch(svc.executorRole ?? null, m.specialization)
      );

      if (matching.length === 0) {
        await ctx.editMessageText(
          `Нет доступных мастеров для услуги «${svc.name}».`,
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_svc")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const buttons = matching.map((m) => [
        Markup.button.callback(
          `${m.fullName} — ${m.specialization}`,
          `book_mst_${m.id}`
        ),
      ]);
      buttons.push([Markup.button.callback("« Назад", "book_back_svc")]);

      await ctx.editMessageText(
        `👨‍🔧 Выберите мастера для «${svc.name}»:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_back_master error:", e);
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });

  bot.action("book_back_date", async (ctx) => {
    try {
      const state = getState(ctx);

      if (!state.masterId) {
        await ctx.answerCbQuery();
        return;
      }

      state.step = "date";

      const masterRows = await db.select().from(masters).where(eq(masters.id, state.masterId));
      const masterName = masterRows.length > 0 ? masterRows[0].fullName : "Мастер";

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
            eq(workSlots.masterId, state.masterId),
            eq(workSlots.isConfirmed, true)
          )
        );

      const slotDates = new Set(slots.map((s) => s.workDate));
      const availableDates = dates.filter((d) => slotDates.has(d));

      if (availableDates.length === 0) {
        await ctx.editMessageText(
          `У мастера ${masterName} нет доступных дат на ближайшие 7 дней.`,
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_master")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const buttons = availableDates.map((d) => [
        Markup.button.callback(formatDateRu(d), `book_dt_${d}`),
      ]);
      buttons.push([Markup.button.callback("« Назад", "book_back_master")]);

      await ctx.editMessageText(
        `📅 Выберите дату для записи к ${masterName}:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_back_date error:", e);
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });

  // Back to time selection (from confirmation screen)
  bot.action("book_back_time", async (ctx) => {
    try {
      const state = getState(ctx);

      if (!state.date || !state.masterId || !state.serviceDuration) {
        await ctx.answerCbQuery("Ошибка состояния");
        return;
      }

      // Re-trigger time slot display by simulating date selection
      state.step = "time";

      const workDay = await db
        .select()
        .from(workSlots)
        .where(
          and(
            eq(workSlots.masterId, state.masterId),
            eq(workSlots.workDate, state.date),
            eq(workSlots.isConfirmed, true)
          )
        );

      if (workDay.length === 0) {
        await ctx.editMessageText(
          "Нет рабочих слотов на эту дату.",
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_date")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const workStart = timeToMinutes(workDay[0].startTime);
      const workEnd = timeToMinutes(workDay[0].endTime);
      const duration = state.serviceDuration;

      const existing = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.masterId, state.masterId),
            eq(appointments.appointmentDate, state.date),
            eq(appointments.status, "confirmed")
          )
        );

      const slotInterval = 30;
      const availableSlots: { start: string; end: string }[] = [];
      let currentTime = workStart;

      while (currentTime + duration <= workEnd) {
        const slotStart = currentTime;
        const slotEnd = currentTime + duration;

        let isAvailable = true;
        for (const appt of existing) {
          const apptStart = timeToMinutes(appt.startTime);
          const apptEnd = timeToMinutes(appt.endTime);
          if (timeRangesOverlap(slotStart, slotEnd, apptStart, apptEnd)) {
            isAvailable = false;
            break;
          }
        }

        if (isAvailable) {
          availableSlots.push({
            start: minutesToTime(slotStart),
            end: minutesToTime(slotEnd),
          });
        }

        currentTime += slotInterval;
      }

      if (availableSlots.length === 0) {
        await ctx.editMessageText(
          `Нет свободного времени на ${formatDateRu(state.date)}.`,
          Markup.inlineKeyboard([[Markup.button.callback("« Назад", "book_back_date")]])
        );
        await ctx.answerCbQuery();
        return;
      }

      const buttons: any[][] = [];
      for (let i = 0; i < availableSlots.length; i += 2) {
        const row: any[] = [
          Markup.button.callback(
            `${availableSlots[i].start}–${availableSlots[i].end}`,
            `book_tm_${availableSlots[i].start}`
          ),
        ];
        if (i + 1 < availableSlots.length) {
          row.push(
            Markup.button.callback(
              `${availableSlots[i + 1].start}–${availableSlots[i + 1].end}`,
              `book_tm_${availableSlots[i + 1].start}`
            )
          );
        }
        buttons.push(row);
      }
      buttons.push([Markup.button.callback("« Назад", "book_back_date")]);

      (state as any)._slots = availableSlots;

      await ctx.editMessageText(
        `🕐 Выберите время на ${formatDateRu(state.date)}:`,
        Markup.inlineKeyboard(buttons)
      );
      await ctx.answerCbQuery();
    } catch (e) {
      console.error("[booking-flow] book_back_time error:", e);
      try { await ctx.answerCbQuery("Ошибка"); } catch {}
    }
  });
}
