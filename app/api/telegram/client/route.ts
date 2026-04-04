import { NextResponse } from "next/server";
import { Telegraf, Markup } from "telegraf";
import { db } from "@/db";
import { clients, telegramVerificationCodes, appointments, services, masters, optimizationMoves, workSlots } from "@/db/schema";
import { eq, and, gt, gte } from "drizzle-orm";

// We cannot import from telegram-bot/ because those files use dotenv and relative imports.
// Instead, we duplicate the bot setup here for the webhook handler.

const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function createClientBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

  const bot = new Telegraf(token);

  // ── Slot helpers
  function timeToMins(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
  function minsToTime(m: number) { return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }

  async function getAvailableSlots(masterId: number, serviceId: number, date: string, excludeAptId?: number): Promise<string[]> {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    const diffDays = Math.round((new Date(date + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);
    const svc = await db.select({ duration: services.duration }).from(services).where(eq(services.id, serviceId)).limit(1);
    if (!svc.length) return [];
    const duration = svc[0].duration;
    const workDay = await db.select().from(workSlots)
      .where(and(eq(workSlots.masterId, masterId), eq(workSlots.workDate, date), eq(workSlots.isConfirmed, true))).limit(1);
    let workStart: number, workEnd: number;
    if (workDay.length > 0) {
      workStart = timeToMins(workDay[0].startTime); workEnd = timeToMins(workDay[0].endTime);
    } else if (diffDays >= 2) {
      workStart = 8 * 60; workEnd = 20 * 60;
    } else { return []; }
    const booked = await db.select({ id: appointments.id, startTime: appointments.startTime, endTime: appointments.endTime })
      .from(appointments)
      .where(and(eq(appointments.masterId, masterId), eq(appointments.appointmentDate, date), eq(appointments.status, "confirmed")));
    const busySlots = booked.filter(b => b.id !== excludeAptId).map(b => ({ start: timeToMins(b.startTime), end: timeToMins(b.endTime) }));
    const slots: string[] = [];
    for (let t = workStart; t + duration <= workEnd; t += 30) {
      if (!busySlots.some(b => t < b.end && b.start < t + duration)) slots.push(minsToTime(t));
    }
    return slots;
  }

  // ── Main menu for registered users
  async function showMainMenu(ctx: any, name: string) {
    await ctx.reply(
      `Добро пожаловать, ${name}! \u{1F44B}\n\nВыберите действие:`,
      Markup.inlineKeyboard([
        [Markup.button.webApp("\u{1F4C5} Записаться", `${SITE_URL}/miniapp`)],
        [Markup.button.callback("\u{1F464} Мои записи", "my_appointments")],
        [Markup.button.callback("\u2139\uFE0F О нас", "about")],
      ])
    );
  }

  // ── Registration prompt
  async function showRegistrationPrompt(ctx: any, firstName: string) {
    // Send with placeholder URL first, then edit markup to include message_id
    const msg = await ctx.reply(
      `Привет, ${firstName}! \u{1F44B}\n\nДля доступа к записи необходимо зарегистрироваться:`,
      Markup.inlineKeyboard([
        [Markup.button.webApp("\u{1F4DD} Регистрация", `${SITE_URL}/miniapp/register`)],
      ])
    );
    // Edit markup immediately to embed message_id in URL — Mini App will read it
    if (msg?.message_id) {
      try {
        await bot.telegram.editMessageReplyMarkup(
          ctx.chat.id,
          msg.message_id,
          undefined,
          Markup.inlineKeyboard([
            [Markup.button.webApp("\u{1F4DD} Регистрация", `${SITE_URL}/miniapp/register?mid=${msg.message_id}`)],
          ]).reply_markup
        );
      } catch {}
    }
  }

  // ── Set menu button
  function setMenuButton(chatId: number) {
    if (!SITE_URL.startsWith("https://")) return;
    bot.telegram.setChatMenuButton({
      chatId,
      menuButton: {
        type: "web_app",
        text: "\u{1F4C5} Записаться",
        web_app: { url: `${SITE_URL}/miniapp` },
      },
    }).catch(() => {});
  }

  // ── /start
  bot.start(async (ctx) => {
    const telegramId = ctx.from?.id.toString();
    const firstName = ctx.from?.first_name || "Клиент";
    if (!telegramId) return;

    const startPayload = ctx.startPayload;

    // Handle LOGIN_ deep links
    if (startPayload && startPayload.startsWith("LOGIN_")) {
      try {
        const codeRows = await db.select().from(telegramVerificationCodes)
          .where(and(
            eq(telegramVerificationCodes.code, startPayload),
            eq(telegramVerificationCodes.isUsed, false),
            gt(telegramVerificationCodes.expiresAt, new Date().toISOString())
          )).limit(1);

        if (codeRows.length > 0) {
          await db.update(telegramVerificationCodes)
            .set({ isUsed: true, telegramId })
            .where(eq(telegramVerificationCodes.id, codeRows[0].id));
          const phone = codeRows[0].phone;
          if (phone) {
            await db.update(clients).set({ telegramId, isVerified: true })
              .where(eq(clients.phone, phone));
          }
          await showMainMenu(ctx, firstName);
          setMenuButton(ctx.chat.id);
        } else {
          await ctx.reply("\u274C Код устарел или уже использован.");
        }
      } catch (e) {
        console.error("Error handling LOGIN_ code:", e);
      }
      return;
    }

    // Check if registered
    try {
      const existing = await db.select().from(clients)
        .where(eq(clients.telegramId, telegramId)).limit(1);
      if (existing.length > 0) {
        await showMainMenu(ctx, existing[0].name || firstName);
        setMenuButton(ctx.chat.id);
        return;
      }
    } catch {}

    await showRegistrationPrompt(ctx, firstName);
  });

  // ── About (edit current message)
  bot.action("about", async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(
        "\u{1F488} *Profit Club* \u2014 салон красоты\n\nМы предлагаем:\n\u2022 Профессиональные услуги\n\u2022 Опытных мастеров\n\u2022 Удобную запись онлайн",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]),
        }
      );
    } catch {
      await ctx.reply(
        "\u{1F488} *Profit Club* \u2014 салон красоты\n\nМы предлагаем:\n\u2022 Профессиональные услуги\n\u2022 Опытных мастеров\n\u2022 Удобную запись онлайн",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]),
        }
      );
    }
  });

  // ── Back to menu (delete old message + send new with webApp button)
  async function handleBackToMenu(ctx: any) {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    // Delete the old message (webApp buttons can't be in editMessageText)
    try { await ctx.deleteMessage(); } catch {}

    const existing = await db.select().from(clients)
      .where(eq(clients.telegramId, telegramId)).limit(1);
    if (existing.length > 0) {
      await showMainMenu(ctx, existing[0].name || ctx.from?.first_name || "Клиент");
    } else {
      await showRegistrationPrompt(ctx, ctx.from?.first_name || "Клиент");
    }
  }

  bot.action("menu", handleBackToMenu);
  bot.action("book_back_menu", handleBackToMenu);

  // ── My appointments (edit current message)
  bot.action("my_appointments", async (ctx) => {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;

    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

      const myAppts = await db.select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        serviceId: appointments.serviceId,
        masterId: appointments.masterId,
        status: appointments.status,
      }).from(appointments)
        .where(and(
          eq(appointments.clientTelegramId, telegramId),
          eq(appointments.status, "confirmed"),
          gte(appointments.appointmentDate, todayStr)
        ));

      if (myAppts.length === 0) {
        try {
          await ctx.editMessageText("\u{1F4CB} У вас нет предстоящих записей.",
            Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]));
        } catch {
          await ctx.reply("\u{1F4CB} У вас нет предстоящих записей.",
            Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]));
        }
        return;
      }

      const lines: string[] = [];
      const keyboard: any[][] = [];
      for (const apt of myAppts) {
        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
        const [mst] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt.masterId));
        const d = new Date(apt.appointmentDate + "T00:00:00");
        const dateStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
        lines.push(`\u{1F487} ${svc?.name || "Услуга"} — ${mst?.fullName || "Мастер"}\n\u{1F4C5} ${dateStr}, ${apt.startTime}–${apt.endTime}`);
        keyboard.push([
          Markup.button.callback("✏️ Изменить", `em:${apt.id}`),
          Markup.button.callback("❌ Отменить", `ap_cancel:${apt.id}`),
        ]);
      }
      keyboard.push([Markup.button.callback("← Главное меню", "menu")]);
      const text = "📋 Ваши записи:\n\n" + lines.join("\n\n");
      try {
        await ctx.editMessageText(text, Markup.inlineKeyboard(keyboard));
      } catch {
        await ctx.reply(text, Markup.inlineKeyboard(keyboard));
      }
    } catch (e) {
      console.error("Error fetching appointments:", e);
      try {
        await ctx.editMessageText("Ошибка загрузки записей.",
          Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]));
      } catch {
        await ctx.reply("Ошибка загрузки записей.",
          Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]));
      }
    }
  });

  // ── Back to main menu (from appointment notification)
  bot.action("back_to_main_menu", handleBackToMenu);

  // ── Cancel appointment
  bot.action(/^ap_cancel:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const appointmentId = parseInt(ctx.match[1]);
    try {
      await ctx.editMessageText(
        "❌ Вы уверены, что хотите отменить запись?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Да, отменить", `ap_cancel_confirm:${appointmentId}`),
            Markup.button.callback("← Назад", `ap_cancel_abort:${appointmentId}`),
          ],
        ])
      );
    } catch {
      await ctx.reply(
        "❌ Вы уверены, что хотите отменить запись?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("✅ Да, отменить", `ap_cancel_confirm:${appointmentId}`),
            Markup.button.callback("← Назад", `ap_cancel_abort:${appointmentId}`),
          ],
        ])
      );
    }
  });

  bot.action(/^ap_cancel_confirm:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const appointmentId = parseInt(ctx.match[1]);
    try {
      const callerTgId = String(ctx.from?.id || "");
      const apt = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
      if (!apt.length || apt[0].status === "cancelled") {
        await ctx.editMessageText("Запись уже отменена.", Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "menu")]]));
        return;
      }
      // Ownership check: only the client who made the appointment can cancel
      if (apt[0].clientTelegramId && apt[0].clientTelegramId !== callerTgId) {
        await ctx.editMessageText("⛔ Это не ваша запись.", Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "menu")]]));
        return;
      }
      // Check 2-hour rule
      const aptDateTime = new Date(apt[0].appointmentDate + "T" + apt[0].startTime + ":00");
      if (aptDateTime.getTime() - Date.now() < 2 * 60 * 60 * 1000) {
        await ctx.editMessageText(
          "⚠️ Отмена невозможна — до записи менее 2 часов.",
          Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "menu")]])
        );
        return;
      }
      await db.update(appointments).set({ status: "cancelled" }).where(eq(appointments.id, appointmentId));
      await ctx.editMessageText(
        "✅ Запись отменена.",
        Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "menu")]])
      );
    } catch (e) {
      console.error("[ap_cancel_confirm] error:", e);
      await ctx.editMessageText("Ошибка при отмене.", Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "menu")]]));
    }
  });

  bot.action(/^ap_cancel_abort:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const appointmentId = parseInt(ctx.match[1]);
    try {
      const apt = await db.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
      if (!apt.length) { await ctx.editMessageText("Запись не найдена."); return; }
      const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt[0].serviceId));
      const [mst] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt[0].masterId));
      const d = new Date(apt[0].appointmentDate + "T00:00:00");
      const fDate = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
      const canEdit = new Date(apt[0].appointmentDate + "T" + apt[0].startTime + ":00").getTime() - Date.now() >= 2 * 60 * 60 * 1000;
      await ctx.editMessageText(
        `✅ Ваша запись оформлена!\n\n💆 Услуга: ${svc?.name || "Услуга"}\n👨‍💼 Мастер: ${mst?.fullName || "Мастер"}\n📅 Дата: ${fDate}\n🕒 Время: ${apt[0].startTime}–${apt[0].endTime}${canEdit ? "\n\n✏️ Вы можете изменить время и мастера не позднее чем за 2 часа до записи." : ""}\n\nЖдём вас в салоне Profit Club!`,
        Markup.inlineKeyboard([
          [Markup.button.callback("❌ Отменить запись", `ap_cancel:${appointmentId}`), Markup.button.webApp("✏️ Изменить запись", `${SITE_URL}/miniapp`)],
          [Markup.button.callback("⬅️ В главное меню", "back_to_main_menu")],
        ])
      );
    } catch { await ctx.editMessageText("Ошибка.", Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "menu")]])); }
  });

  // ── Edit flow: Step 1 — Master selection
  bot.action(/^em:(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const aptId = parseInt(ctx.match[1]);
    try {
      const [apt] = await db.select().from(appointments).where(eq(appointments.id, aptId)).limit(1);
      if (!apt) { await ctx.reply("Запись не найдена."); return; }
      if (new Date(apt.appointmentDate + "T" + apt.startTime + ":00").getTime() - Date.now() < 2 * 60 * 60 * 1000) {
        try { await ctx.editMessageText("⚠️ Изменение невозможно — до записи менее 2 часов.", Markup.inlineKeyboard([[Markup.button.callback("← Назад", "my_appointments")]])); }
        catch { await ctx.reply("⚠️ Изменение невозможно — до записи менее 2 часов."); }
        return;
      }
      const [origMaster] = await db.select({ specialization: masters.specialization }).from(masters).where(eq(masters.id, apt.masterId)).limit(1);
      const availMasters = await db.select({ id: masters.id, fullName: masters.fullName })
        .from(masters).where(and(eq(masters.specialization, origMaster?.specialization || ""), eq(masters.isActive, true)));
      const sorted = [...availMasters.filter(m => m.id === apt.masterId), ...availMasters.filter(m => m.id !== apt.masterId)];
      const keyboard = sorted.map(m => [Markup.button.callback(m.id === apt.masterId ? `👤 ${m.fullName} (текущий)` : m.fullName, `em_m:${aptId}:${m.id}:0`)]);
      keyboard.push([Markup.button.callback("← Назад", "my_appointments")]);
      try { await ctx.editMessageText("👤 Выберите мастера:", Markup.inlineKeyboard(keyboard)); }
      catch { await ctx.reply("👤 Выберите мастера:", Markup.inlineKeyboard(keyboard)); }
    } catch (e) { console.error("[em] error:", e); }
  });

  // ── Edit flow: Step 2 — Date selection with pagination
  bot.action(/^em_m:(\d+):(\d+):(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const aptId = parseInt(ctx.match[1]);
    const masterId = parseInt(ctx.match[2]);
    const offset = parseInt(ctx.match[3]);
    const today = new Date();
    const keyboard: any[][] = [];
    for (let i = 0; i < 2; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      let label: string;
      if (offset + i === 0) label = "Сегодня";
      else if (offset + i === 1) label = "Завтра";
      else label = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      keyboard.push([Markup.button.callback(label, `em_dt:${aptId}:${masterId}:${dateStr}`)]);
    }
    const navRow: any[] = [];
    if (offset > 0) navRow.push(Markup.button.callback("←", `em_m:${aptId}:${masterId}:${Math.max(0, offset - 2)}`));
    navRow.push(Markup.button.callback("→", `em_m:${aptId}:${masterId}:${offset + 2}`));
    keyboard.push(navRow);
    keyboard.push([Markup.button.callback("← Назад", `em:${aptId}`)]);
    try { await ctx.editMessageText("📅 Выберите дату:", Markup.inlineKeyboard(keyboard)); }
    catch { await ctx.reply("📅 Выберите дату:", Markup.inlineKeyboard(keyboard)); }
  });

  // ── Edit flow: Step 3 — Time slot selection
  bot.action(/^em_dt:(\d+):(\d+):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    await ctx.answerCbQuery();
    const aptId = parseInt(ctx.match[1]);
    const masterId = parseInt(ctx.match[2]);
    const date = ctx.match[3];
    try {
      const [apt] = await db.select({ serviceId: appointments.serviceId }).from(appointments).where(eq(appointments.id, aptId)).limit(1);
      if (!apt) { await ctx.reply("Запись не найдена."); return; }
      const slots = await getAvailableSlots(masterId, apt.serviceId, date, aptId);
      if (slots.length === 0) {
        try { await ctx.editMessageText("😔 На эту дату нет доступных слотов. Выберите другую дату:", Markup.inlineKeyboard([[Markup.button.callback("← Назад", `em_m:${aptId}:${masterId}:0`)]])); }
        catch { await ctx.reply("😔 На эту дату нет доступных слотов."); }
        return;
      }
      const rows: any[][] = [];
      for (let i = 0; i < slots.length; i += 3) {
        rows.push(slots.slice(i, i + 3).map(t => Markup.button.callback(t, `em_t:${aptId}:${masterId}:${date}:${t}`)));
      }
      rows.push([Markup.button.callback("← Назад", `em_m:${aptId}:${masterId}:0`)]);
      try { await ctx.editMessageText("🕒 Выберите время:", Markup.inlineKeyboard(rows)); }
      catch { await ctx.reply("🕒 Выберите время:", Markup.inlineKeyboard(rows)); }
    } catch (e) { console.error("[em_dt] error:", e); }
  });

  // ── Edit flow: Step 4 — Apply update
  bot.action(/^em_t:(\d+):(\d+):(\d{4}-\d{2}-\d{2}):(\d{2}:\d{2})$/, async (ctx) => {
    await ctx.answerCbQuery();
    const aptId = parseInt(ctx.match[1]);
    const masterId = parseInt(ctx.match[2]);
    const date = ctx.match[3];
    const startTime = ctx.match[4];
    try {
      const [apt] = await db.select().from(appointments).where(eq(appointments.id, aptId)).limit(1);
      if (!apt) { await ctx.reply("Запись не найдена."); return; }
      const [svc] = await db.select({ duration: services.duration, name: services.name }).from(services).where(eq(services.id, apt.serviceId)).limit(1);
      const endTime = minsToTime(timeToMins(startTime) + (svc?.duration || 60));
      const [mst] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, masterId)).limit(1);
      await db.update(appointments).set({ masterId, appointmentDate: date, startTime, endTime }).where(eq(appointments.id, aptId));
      const d = new Date(date + "T00:00:00");
      const fDate = d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
      const canEdit = new Date(date + "T" + startTime + ":00").getTime() - Date.now() >= 2 * 60 * 60 * 1000;
      const text = `✅ Запись изменена!\n\n💆 Услуга: ${svc?.name || "Услуга"}\n👨‍💼 Мастер: ${mst?.fullName || "Мастер"}\n📅 Дата: ${fDate}\n🕒 Время: ${startTime}–${endTime}${canEdit ? "\n\n✏️ Вы можете изменить запись не позднее чем за 2 часа." : ""}\n\nЖдём вас в Profit Club!`;
      try {
        await ctx.editMessageText(text, Markup.inlineKeyboard([
          [Markup.button.callback("❌ Отменить запись", `ap_cancel:${aptId}`), Markup.button.callback("✏️ Изменить", `em:${aptId}`)],
          [Markup.button.callback("⬅️ В главное меню", "back_to_main_menu")],
        ]));
      } catch { await ctx.reply(text); }
    } catch (e) { console.error("[em_t] error:", e); }
  });

  // ── Optimization handlers
  bot.action(/^opt_accept_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const moveId = parseInt(ctx.match[1]);
      const moveRows = await db.select().from(optimizationMoves).where(eq(optimizationMoves.id, moveId)).limit(1);
      if (!moveRows.length || moveRows[0].clientResponse !== "pending") {
        await ctx.editMessageText("Это предложение уже обработано.", Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "book_back_menu")]]));
        return;
      }
      await db.update(optimizationMoves).set({ clientResponse: "accepted" }).where(eq(optimizationMoves.id, moveId));
      const apt = await db.select().from(appointments).where(eq(appointments.id, moveRows[0].appointmentId)).limit(1);
      const svc = apt.length ? await db.select().from(services).where(eq(services.id, apt[0].serviceId)).limit(1) : [];
      const move = moveRows[0];
      await ctx.editMessageText(
        `\u2705 Вы согласились на перенос\n\n\u{1F487} ${svc[0]?.name || "Услуга"}\n\u{1F550} ${move.oldStartTime}\u2013${move.oldEndTime} \u2192 ${move.newStartTime}\u2013${move.newEndTime}\n\nСпасибо! Мы обновим вашу запись.`,
        Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "book_back_menu")]])
      );
    } catch (e) { console.error("[opt] accept error:", e); }
  });

  bot.action(/^opt_decline_(\d+)$/, async (ctx) => {
    try {
      await ctx.answerCbQuery();
      const moveId = parseInt(ctx.match[1]);
      const moveRows = await db.select().from(optimizationMoves).where(eq(optimizationMoves.id, moveId)).limit(1);
      if (!moveRows.length || moveRows[0].clientResponse !== "pending") {
        await ctx.editMessageText("Это предложение уже обработано.", Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "book_back_menu")]]));
        return;
      }
      await db.update(optimizationMoves).set({ clientResponse: "declined" }).where(eq(optimizationMoves.id, moveId));
      await ctx.editMessageText(
        `Хорошо, запись остаётся на прежнем времени.\n\n\u{1F550} ${moveRows[0].oldStartTime}\u2013${moveRows[0].oldEndTime}`,
        Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "book_back_menu")]])
      );
    } catch (e) { console.error("[opt] decline error:", e); }
  });

  return bot;
}

// Lazy singleton
let clientBot: Telegraf | null = null;
function getClientBot() {
  if (!clientBot) clientBot = createClientBot();
  return clientBot;
}

export async function POST(request: Request) {
  try {
    // Verify Telegram webhook secret token
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== webhookSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const bot = getClientBot();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[client-webhook] Error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
