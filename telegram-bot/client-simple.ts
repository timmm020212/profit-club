import { config } from 'dotenv';
config({ path: '.env.local' });

import { Telegraf, Markup } from 'telegraf';
import { db } from '../db/index-postgres';
import { clients, telegramVerificationCodes } from '../db/schema-postgres';
import { eq, and, gt } from 'drizzle-orm';
import { registerAppointmentHandlers } from './client/appointment-manager';
import { startReminderLoop } from './client/reminders';
import { registerOptimizationHandlers } from './client/optimization-handler';

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

// ── About ───────────────────────────────────────────────────
bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '💈 *Profit Club* — салон красоты\n\nМы предлагаем:\n• Профессиональные услуги\n• Опытных мастеров\n• Удобную запись онлайн',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('← Главное меню', 'menu')]]),
    }
  );
});

// ── Back to menu ────────────────────────────────────────────
async function handleBackToMenu(ctx: any) {
  await ctx.answerCbQuery();
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
console.log('[client-bot] Starting...');
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('[client-bot] Stopped.');
}).catch((error) => {
  console.error('[client-bot] Failed to start:', error);
});
console.log('[client-bot] Bot launched, listening for messages...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
