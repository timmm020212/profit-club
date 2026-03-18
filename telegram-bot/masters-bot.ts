import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { masters, workSlots, appointments, services } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { handleWorkSlotCallback } from '../lib/telegram-notifications';

// Загружаем переменные окружения
config({ path: '.env.local' });

const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || 'YOUR_MASTERS_BOT_TOKEN_HERE';

const bot = new Telegraf(MASTERS_BOT_TOKEN);

// Простое хранилище состояний
const userStates = new Map<string, any>();

// Проверка, является ли пользователь мастером
async function isMaster(telegramId: string): Promise<any> {
  try {
    const master = await db
      .select()
      .from(masters)
      .where(eq(masters.telegramId, telegramId))
      .limit(1);
    
    return master.length > 0 ? master[0] : null;
  } catch (error) {
    console.error('Error checking master rights:', error);
    return null;
  }
}

// Главное меню для мастера
const masterMenu = Markup.keyboard([
  ['📅 Мое расписание'],
  ['📋 Записи на сегодня'],
  ['⚙️ Настройки'],
]).resize();

// Команда /start
bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  
  if (!telegramId) {
    return ctx.reply('Ошибка: не удалось определить ваш Telegram ID');
  }

  const master = await isMaster(telegramId);
  
  if (master) {
    ctx.reply(`Добро пожаловать, ${master.fullName}!`, masterMenu);
  } else {
    ctx.reply('У вас нет доступа к этому боту. Вы не зарегистрированы как мастер.');
  }
});

// Мое расписание
bot.hears('📅 Мое расписание', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const workSlotsList = await db
      .select()
      .from(workSlots)
      .where(and(
        eq(workSlots.masterId, master.id),
        gte(workSlots.workDate, today)
      ))
      .orderBy(workSlots.workDate, workSlots.startTime);

    if (workSlotsList.length === 0) {
      return ctx.reply('У вас нет запланированных рабочих дней');
    }

    let message = '📅 Ваше расписание:\n\n';
    workSlotsList.forEach(slot => {
      message += `📅 ${slot.workDate}\n`;
      message += `⏰ ${slot.startTime} - ${slot.endTime}\n\n`;
    });

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching master schedule:', error);
    ctx.reply('Произошла ошибка при получении расписания');
  }
});

// Записи на сегодня
bot.hears('📋 Записи на сегодня', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const appointmentsList = await db
      .select({
        id: appointments.id,
        serviceName: services.name,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        clientName: appointments.clientName,
        clientPhone: appointments.clientPhone,
        status: appointments.status,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(and(
        eq(appointments.masterId, master.id),
        eq(appointments.appointmentDate, today)
      ))
      .orderBy(appointments.startTime);

    if (appointmentsList.length === 0) {
      return ctx.reply('На сегодня у вас нет записей');
    }

    let message = '📋 Записи на сегодня:\n\n';
    appointmentsList.forEach(apt => {
      message += `⏰ ${apt.startTime} - ${apt.endTime}\n`;
      message += `💇 ${apt.serviceName}\n`;
      message += `👤 ${apt.clientName}\n`;
      message += `📞 ${apt.clientPhone || 'не указан'}\n`;
      message += `📊 Статус: ${apt.status}\n\n`;
    });

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    ctx.reply('Произошла ошибка при получении записей');
  }
});

// Настройки
bot.hears('⚙️ Настройки', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const master = await isMaster(telegramId);
  if (!master) return;

  ctx.reply('⚙️ Настройки мастера:\n\n' +
    `👤 Имя: ${master.fullName}\n` +
    `💼 Специализация: ${master.specialization}\n` +
    `📞 Телефон: ${master.phone || 'не указан'}\n\n` +
    'Для изменения данных обратитесь к администратору.');
});

// Обработка callback'ов для подтверждения/отклонения рабочих дней
bot.on('callback_query', async (ctx) => {
  const callbackData = (ctx.callbackQuery as any)?.data;
  const telegramId = ctx.from?.id.toString();
  
  if (!callbackData || !telegramId) return;

  try {
    const result = await handleWorkSlotCallback(callbackData, telegramId);
    
    // Редактируем сообщение с кнопками
    await ctx.editMessageText(result.message);
    
    // Отвечаем на callback, чтобы убрать "часики" с кнопки
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery('Произошла ошибка');
  }
});

// Запуск бота
bot.launch().then(() => {
  console.log('Masters bot started successfully!');
}).catch((error) => {
  console.error('Failed to start masters bot:', error);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
