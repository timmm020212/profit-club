import { NextResponse } from "next/server";
import { Telegraf, Markup } from "telegraf";
import { db } from "@/db";
import { clients, telegramVerificationCodes, appointments, services, masters, optimizationMoves } from "@/db/schema";
import { eq, and, gt, gte } from "drizzle-orm";

// We cannot import from telegram-bot/ because those files use dotenv and relative imports.
// Instead, we duplicate the bot setup here for the webhook handler.

const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function createClientBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");

  const bot = new Telegraf(token);

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
    await ctx.reply(
      `Привет, ${firstName}! \u{1F44B}\n\nДля доступа к записи необходимо зарегистрироваться:`,
      Markup.inlineKeyboard([
        [Markup.button.webApp("\u{1F4DD} Регистрация", `${SITE_URL}/miniapp/register`)],
      ])
    );
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

  // ── About
  bot.action("about", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
      "\u{1F488} *Profit Club* \u2014 салон красоты\n\nМы предлагаем:\n\u2022 Профессиональные услуги\n\u2022 Опытных мастеров\n\u2022 Удобную запись онлайн",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]),
      }
    );
  });

  // ── Back to menu
  async function handleBackToMenu(ctx: any) {
    await ctx.answerCbQuery();
    const telegramId = ctx.from?.id.toString();
    if (!telegramId) return;
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

  // ── My appointments
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
        await ctx.reply("\u{1F4CB} У вас нет предстоящих записей.",
          Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]));
        return;
      }

      let text = "\u{1F4CB} Ваши записи:\n\n";
      for (const apt of myAppts) {
        const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
        const [mst] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt.masterId));
        const d = new Date(apt.appointmentDate + "T00:00:00");
        const dateStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
        text += `\u{1F487} ${svc?.name || "Услуга"}\n\u{1F469} ${mst?.fullName || "Мастер"}\n\u{1F4C5} ${dateStr}, ${apt.startTime}\u2013${apt.endTime}\n\n`;
      }

      await ctx.reply(text.trim(),
        Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]));
    } catch (e) {
      console.error("Error fetching appointments:", e);
      await ctx.reply("Ошибка загрузки записей.",
        Markup.inlineKeyboard([[Markup.button.callback("\u2190 Главное меню", "menu")]]));
    }
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
    const body = await request.json();
    const bot = getClientBot();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[client-webhook] Error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}
