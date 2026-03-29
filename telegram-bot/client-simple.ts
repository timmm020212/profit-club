import { config } from 'dotenv';
config({ path: '.env.local' });

import { Telegraf, Markup } from 'telegraf';
import { db } from '../db/index-postgres';
import { clients, telegramVerificationCodes, appointments, services, masters } from '../db/schema-postgres';
import { eq, and, gt } from 'drizzle-orm';
import { registerAppointmentHandlers } from './client/appointment-manager';
import { startReminderLoop } from './client/reminders';
import { registerOptimizationHandlers } from './client/optimization-handler';
import { checkStatusTransitions } from './client/status-tracker';

const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

const bot = new Telegraf(getBotToken());

registerAppointmentHandlers(bot);
registerOptimizationHandlers(bot);

// ── Main menu for registered users ──────────────────────────
async function showMainMenu(ctx: any, name: string) {
  await ctx.reply(
    `Добро пожаловать, ${name}! 👋\n\nВыберите действие:`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('📅 Записаться', `${SITE_URL}/miniapp`)],
      [Markup.button.callback('👤 Мои записи', 'my_appointments')],
      [Markup.button.callback('ℹ️ О нас', 'about')],
    ])
  );
}

// ── Registration prompt for new users ───────────────────────
async function showRegistrationPrompt(ctx: any, firstName: string) {
  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nДля доступа к записи необходимо зарегистрироваться:`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('📝 Регистрация', `${SITE_URL}/miniapp/register`)],
    ])
  );
}

// ── Set menu button for registered user ─────────────────────
function setMenuButton(chatId: number) {
  if (!SITE_URL.startsWith('https://')) return;
  bot.telegram.setChatMenuButton({
    chatId,
    menuButton: {
      type: 'web_app',
      text: '📅 Записаться',
      web_app: { url: `${SITE_URL}/miniapp` },
    },
  }).catch((err) => {
    console.error('[client-bot] Failed to set menu button:', err.message);
  });
}

// ── /start ──────────────────────────────────────────────────
bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const firstName = ctx.from?.first_name || 'Клиент';
  if (!telegramId) return;

  const startPayload = ctx.startPayload;

  // Handle LOGIN_ deep links from site
  if (startPayload && startPayload.startsWith('LOGIN_')) {
    try {
      const codeRows = await db.select().from(telegramVerificationCodes)
        .where(and(
          eq(telegramVerificationCodes.code, startPayload),
          eq(telegramVerificationCodes.isUsed, false),
          gt(telegramVerificationCodes.expiresAt, new Date().toISOString())
        ))
        .limit(1);

      if (codeRows.length > 0) {
        await db.update(telegramVerificationCodes)
          .set({ isUsed: true, telegramId })
          .where(eq(telegramVerificationCodes.id, codeRows[0].id));

        const phone = codeRows[0].phone;
        if (phone) {
          await db.update(clients)
            .set({ telegramId, isVerified: true })
            .where(eq(clients.phone, phone));
        }

        await showMainMenu(ctx, firstName);
        setMenuButton(ctx.chat.id);
      } else {
        await ctx.reply('❌ Код устарел или уже использован.');
      }
    } catch (e) {
      console.error('Error handling LOGIN_ code:', e);
    }
    return;
  }

  // Check if registered
  try {
    const existing = await db.select().from(clients)
      .where(eq(clients.telegramId, telegramId)).limit(1);

    if (existing.length > 0) {
      const name = existing[0].name || firstName;
      await showMainMenu(ctx, name);
      setMenuButton(ctx.chat.id);
      return;
    }
  } catch {}

  // Not registered
  await showRegistrationPrompt(ctx, firstName);
});

// ── Appointment completion confirm/dispute ──────────────────
bot.action(/^confirm_complete_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const aptId = parseInt(ctx.match[1]);
  await db.update(appointments)
    .set({ status: "completed" })
    .where(eq(appointments.id, aptId));
  try {
    await ctx.editMessageText(
      "✅ Запись завершена! Спасибо за подтверждение.",
      Markup.inlineKeyboard([[Markup.button.callback("🏠 Главное меню", "menu")]]),
    );
  } catch {}
});

bot.action(/^dispute_complete_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const aptId = parseInt(ctx.match[1]);

  // Set status to disputed
  await db.update(appointments)
    .set({ status: "disputed" })
    .where(eq(appointments.id, aptId));

  // Notify admin (all admins via DB)
  const [apt] = await db.select({
    clientName: appointments.clientName,
    serviceId: appointments.serviceId,
    masterId: appointments.masterId,
    startTime: appointments.startTime,
    appointmentDate: appointments.appointmentDate,
  }).from(appointments).where(eq(appointments.id, aptId));

  if (apt) {
    const [svc] = await db.select({ name: services.name }).from(services).where(eq(services.id, apt.serviceId));
    const [master] = await db.select({ fullName: masters.fullName }).from(masters).where(eq(masters.id, apt.masterId));
    const adminId = process.env.ADMIN_TELEGRAM_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    if (adminId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminId,
          text: `⚠️ Клиент не согласен с завершением записи!\n\n👤 ${apt.clientName}\n💇 ${svc?.name || "Услуга"}\n👩 ${master?.fullName || "Мастер"}\n📅 ${apt.appointmentDate} ${apt.startTime}\n\nСтатус: Оспорена`,
        }),
      });
    }
  }

  try {
    await ctx.editMessageText(
      "📨 Ваше обращение отправлено администратору. Мы свяжемся с вами.",
      Markup.inlineKeyboard([
        [Markup.button.callback("🔄 Изменить решение", `change_decision_${aptId}`)],
        [Markup.button.callback("🏠 Главное меню", "menu")],
      ]),
    );
  } catch {}
});

bot.action(/^change_decision_(\d+)$/, async (ctx) => {
  try { await ctx.answerCbQuery(); } catch {}
  const aptId = parseInt(ctx.match[1]);
  try {
    await ctx.editMessageText(
      "Подтвердите завершение записи:",
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Подтверждаю", `confirm_complete_${aptId}`)],
        [Markup.button.callback("❌ Не согласен", `dispute_complete_${aptId}`)],
      ]),
    );
  } catch {}
});

// ── About ───────────────────────────────────────────────────
bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(
      '💈 *Profit Club* — салон красоты\n\nМы предлагаем:\n• Профессиональные услуги\n• Опытных мастеров\n• Удобную запись онлайн',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('← Главное меню', 'menu')]]),
      }
    );
  } catch {}
});

// ── Back to menu ────────────────────────────────────────────
async function handleBackToMenu(ctx: any) {
  await ctx.answerCbQuery();
  try { await ctx.deleteMessage(); } catch {}
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const existing = await db.select().from(clients)
    .where(eq(clients.telegramId, telegramId)).limit(1);

  if (existing.length > 0) {
    await showMainMenu(ctx, existing[0].name || ctx.from?.first_name || 'Клиент');
  } else {
    await showRegistrationPrompt(ctx, ctx.from?.first_name || 'Клиент');
  }
}

bot.action('menu', handleBackToMenu);
bot.action('book_back_menu', handleBackToMenu);

// ── Launch ──────────────────────────────────────────────────
startReminderLoop();
setInterval(() => {
  checkStatusTransitions().catch(err => console.error('[status-tracker] loop error:', err));
}, 60_000);
console.log('[status-tracker] Loop started (every 1 min)');
console.log('[client-bot] Starting...');
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('[client-bot] Stopped.');
}).catch((error) => {
  console.error('[client-bot] Failed to start:', error);
});
console.log('[client-bot] Bot launched, listening for messages...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
