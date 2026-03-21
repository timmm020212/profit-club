import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { db } from '../db';
import { clients, pendingClients, telegramVerificationCodes } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import { registerBookingHandlers } from './client/booking-flow';
import { registerAppointmentHandlers } from './client/appointment-manager';
import { startReminderLoop } from './client/reminders';
import { registerOptimizationHandlers } from './client/optimization-handler';

config({ path: '.env.local' });

const CLIENT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8568554790:AAEHlp0un2EoHLGSJlE2G-suTZKp5seXz30';
const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const bot = new Telegraf(CLIENT_BOT_TOKEN);

registerBookingHandlers(bot);
registerAppointmentHandlers(bot);
registerOptimizationHandlers(bot);

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Главное меню — inline
const mainMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('📅 Записаться', 'book')],
  [Markup.button.callback('👤 Мои записи', 'my_appointments')],
  [Markup.button.callback('ℹ️ О нас',       'about')],
]);

async function showMainMenu(ctx: any, text = 'Выберите действие:') {
  await ctx.reply(text, mainMenuKeyboard);
}

// /start
bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const firstName  = ctx.from?.first_name || 'Клиент';
  if (!telegramId) return;

  // Если пришёл с кодом с сайта (site-initiated registration)
  const startPayload = ctx.startPayload;

  // Handle site login via deep link
  if (startPayload && startPayload.startsWith('LOGIN_')) {
    try {
      // Find the login code
      const codeRows = await db.select().from(telegramVerificationCodes)
        .where(and(
          eq(telegramVerificationCodes.code, startPayload),
          eq(telegramVerificationCodes.isUsed, false),
          gt(telegramVerificationCodes.expiresAt, new Date().toISOString())
        ))
        .limit(1);

      if (codeRows.length > 0) {
        // Mark code as used and link telegramId
        await db.update(telegramVerificationCodes)
          .set({ isUsed: true, telegramId })
          .where(eq(telegramVerificationCodes.id, codeRows[0].id));

        await ctx.reply('✅ Вход на сайт подтверждён!\n\nВернитесь на сайт — вы авторизованы.', mainMenuKeyboard);
      } else {
        await ctx.reply('❌ Код устарел или уже использован. Попробуйте снова на сайте.', Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "book_back_menu")]]));
      }
    } catch (e) {
      console.error('Error handling LOGIN_ code:', e);
      await ctx.reply('Произошла ошибка. Попробуйте позже.', Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "book_back_menu")]]));
    }
    return;
  }

  if (startPayload && startPayload.length > 0) {
    try {
      // Ищем в pendingClients по verificationCode
      const pending = await db.select().from(pendingClients)
        .where(eq(pendingClients.verificationCode, startPayload))
        .limit(1);

      if (pending.length > 0) {
        const pendingRow = pending[0];

        // Проверяем, нет ли уже клиента с таким телефоном
        const existingByPhone = await db.select().from(clients)
          .where(eq(clients.phone, pendingRow.phone)).limit(1);

        if (existingByPhone.length > 0) {
          // Уже зарегистрирован — обновляем telegramId
          await db.update(clients)
            .set({ telegramId, isVerified: true, verifiedAt: new Date() })
            .where(eq(clients.id, existingByPhone[0].id));
          await db.delete(pendingClients).where(eq(pendingClients.id, pendingRow.id));
        } else {
          // Создаём клиента из pendingClients
          await db.insert(clients).values({
            name: pendingRow.name,
            phone: pendingRow.phone,
            email: pendingRow.email || null,
            password: pendingRow.password || null,
            verificationCode: pendingRow.verificationCode,
            isVerified: true,
            telegramId,
            verifiedAt: new Date(),
          });
          await db.delete(pendingClients).where(eq(pendingClients.id, pendingRow.id));
        }

        await ctx.reply(
          `✅ Отлично, ${firstName}! Telegram успешно привязан.\n\nТеперь вернитесь на сайт и нажмите «Я подтвердил в Telegram».`,
          mainMenuKeyboard
        );
        return;
      }

      // Проверяем telegramVerificationCodes (bot-initiated)
      const tgCode = await db.select().from(telegramVerificationCodes)
        .where(and(
          eq(telegramVerificationCodes.code, startPayload),
          eq(telegramVerificationCodes.isUsed, false),
          gt(telegramVerificationCodes.expiresAt, new Date().toISOString())
        ))
        .limit(1);

      if (tgCode.length > 0) {
        // Код из бота — просто показываем меню если уже зарегистрирован
        const registered = await db.select().from(clients)
          .where(eq(clients.telegramId, telegramId)).limit(1);
        if (registered.length > 0) {
          await showMainMenu(ctx, `Добро пожаловать, ${registered[0].name || firstName}! 👋`);
          return;
        }
      }
    } catch (e) {
      console.error('Error handling start payload:', e);
    }
  }

  // Проверяем, зарегистрирован ли пользователь
  try {
    const existing = await db.select().from(clients)
      .where(eq(clients.telegramId, telegramId)).limit(1);

    if (existing.length > 0) {
      await showMainMenu(ctx, `Добро пожаловать, ${existing[0].name || firstName}! 👋`);
      return;
    }
  } catch {}

  // Не зарегистрирован — генерируем код и отправляем ссылку на сайт
  try {
    // Удаляем старые коды для этого telegramId
    await db.delete(telegramVerificationCodes)
      .where(eq(telegramVerificationCodes.telegramId, telegramId));

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(telegramVerificationCodes).values({
      code,
      telegramId,
      expiresAt,
    });

    const registrationUrl = `${SITE_URL}/?tg_code=${code}`;

    await ctx.reply(
      `Привет, ${firstName}! 👋\n\nДля использования бота необходимо зарегистрироваться на сайте Profit Club.\n\nНажмите кнопку ниже — форма откроется автоматически:`,
      Markup.inlineKeyboard([
        [Markup.button.url('📝 Зарегистрироваться на сайте', registrationUrl)],
        [Markup.button.callback('✅ Я уже зарегистрировался', 'check_registration')],
      ])
    );
  } catch (e) {
    console.error('Error generating registration code:', e);
    await ctx.reply(`Привет, ${firstName}! 👋\n\nПерейдите на наш сайт для регистрации: ${SITE_URL}`, Markup.inlineKeyboard([[Markup.button.callback("← Главное меню", "book_back_menu")]]));
  }
});

// Проверка регистрации (бот-инициированный флоу)
bot.action('check_registration', async (ctx) => {
  await ctx.answerCbQuery();
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const existing = await db.select().from(clients)
    .where(eq(clients.telegramId, telegramId)).limit(1);

  if (existing.length > 0) {
    await showMainMenu(ctx, `✅ Регистрация подтверждена!\n\nДобро пожаловать, ${existing[0].name}! 👋`);
    return;
  }

  // Ещё не зарегистрирован — берём существующий код или генерируем новый
  const codeRow = await db.select().from(telegramVerificationCodes)
    .where(and(
      eq(telegramVerificationCodes.telegramId, telegramId),
      eq(telegramVerificationCodes.isUsed, false),
      gt(telegramVerificationCodes.expiresAt, new Date().toISOString())
    ))
    .limit(1);

  const registrationUrl = codeRow.length > 0
    ? `${SITE_URL}/?tg_code=${codeRow[0].code}`
    : SITE_URL;

  await ctx.reply(
    'Вы ещё не зарегистрированы. Пожалуйста, завершите регистрацию на сайте:',
    Markup.inlineKeyboard([
      [Markup.button.url('📝 Зарегистрироваться на сайте', registrationUrl)],
      [Markup.button.callback('✅ Я уже зарегистрировался', 'check_registration')],
    ])
  );
});

// О нас
bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '💆‍♀️ *Profit Club* — салон красоты\n\n' +
    'Мы предлагаем:\n' +
    '• Профессиональные услуги\n' +
    '• Опытных мастеров\n' +
    '• Удобную запись онлайн\n\n' +
    '📞 Для связи: +7 (XXX) XXX-XX-XX\n' +
    '📍 Адрес: г. Ставрополь',
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('« Главное меню', 'menu')]]) }
  );
});

// Назад в меню
bot.action('menu', async (ctx) => {
  await ctx.answerCbQuery();
  await showMainMenu(ctx);
});

// Запуск
startReminderLoop();
console.log('[client-bot] Starting...');
bot.launch({
  dropPendingUpdates: true,
}).then(() => {
  console.log('[client-bot] Stopped.');
}).catch((error) => {
  console.error('[client-bot] Failed to start:', error);
});
console.log('[client-bot] Bot launched, listening for messages...');

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
