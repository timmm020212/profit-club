import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { db } from '../db/index-sqlite';
import { masters, workSlots, admins, workSlotChangeRequests } from '../db/schema-sqlite';
import { eq, and, gte } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || '8568554790:AAEHlp0un2EoHLGSJlE2G-suTZKp5seXz30';

const bot = new Telegraf(ADMIN_BOT_TOKEN);

// Простое хранилище состояний
const userStates = new Map<string, any>();

// Проверка прав администратора
async function isAdmin(telegramId: string): Promise<boolean> {
  try {
    const admin = await db
      .select()
      .from(admins)
      .where(eq(admins.telegramId, telegramId))
      .limit(1);
    
    return admin.length > 0;
  } catch (error) {
    console.error('Error checking admin rights:', error);
    return false;
  }
}

// Главное меню
const mainMenu = Markup.keyboard([
  ['📋 Список мастеров'],
  ['➕ Добавить рабочее время'],
  ['📅 Просмотр расписания'],
  ['⏳ Ожидающие подтверждения'],
]).resize();

// Команда /start
bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  
  if (!telegramId) {
    return ctx.reply('Ошибка: не удалось определить ваш Telegram ID');
  }

  const isAdminUser = await isAdmin(telegramId);
  
  if (isAdminUser) {
    ctx.reply('Добро пожаловать в админ-панель!', mainMenu);
  } else {
    ctx.reply('У вас нет доступа к этому боту. Обратитесь к администратору.');
  }
});

// Список мастеров
bot.hears('📋 Список мастеров', async (ctx) => {
  try {
    const mastersList = await db
      .select()
      .from(masters)
      .where(eq(masters.isActive, true));

    if (mastersList.length === 0) {
      return ctx.reply('Мастера не найдены');
    }

    let message = '👨‍💼 Список мастеров:\n\n';
    mastersList.forEach((master, index) => {
      message += `${index + 1}. ${master.fullName}\n`;
      message += `   Специализация: ${master.specialization}\n`;
      message += `   Телефон: ${master.phone || 'не указан'}\n`;
      message += `   Telegram ID: ${master.telegramId || 'не привязан'}\n\n`;
    });

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching masters:', error);
    ctx.reply('Произошла ошибка при получении списка мастеров');
  }
});

// Добавление рабочего времени - начало процесса
bot.hears('➕ Добавить рабочее время', async (ctx) => {
  try {
    const mastersList = await db
      .select()
      .from(masters)
      .where(eq(masters.isActive, true));

    if (mastersList.length === 0) {
      return ctx.reply('Мастера не найдены');
    }

    const buttons = mastersList.map(master => 
      Markup.button.text(`${master.fullName} (${master.specialization})`)
    );

    await ctx.reply('Выберите мастера:', Markup.keyboard([
      buttons,
      ['🔙 Главное меню']
    ]).resize());

    userStates.set(ctx.from?.id.toString(), { waitingForMaster: true });
  } catch (error) {
    console.error('Error starting work slot addition:', error);
    ctx.reply('Произошла ошибка');
  }
});

// Ожидающие подтверждения
bot.hears('⏳ Ожидающие подтверждения', async (ctx) => {
  try {
    const pendingSlots = await db
      .select({
        id: workSlots.id,
        masterName: masters.fullName,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        createdBy: workSlots.createdBy,
        adminUpdateStatus: workSlots.adminUpdateStatus,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(and(
        eq(workSlots.isConfirmed, false),
        eq(workSlots.adminUpdateStatus, 'pending')
      ))
      .orderBy(workSlots.workDate, workSlots.startTime);

    if (pendingSlots.length === 0) {
      return ctx.reply('Нет ожидающих подтверждения рабочих дней');
    }

    let message = '⏳ Ожидающие подтверждения:\n\n';
    pendingSlots.forEach((slot, index) => {
      message += `${index + 1}. ${slot.masterName}\n`;
      message += `   📅 ${slot.workDate}\n`;
      message += `   ⏰ ${slot.startTime} - ${slot.endTime}\n`;
      message += `   👤 Добавил: ${slot.createdBy}\n`;
      message += `   📊 Статус: ${slot.adminUpdateStatus}\n\n`;
    });

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching pending slots:', error);
    ctx.reply('Произошла ошибка при получении ожидающих подтверждения');
  }
});

// Обработка текстовых сообщений
bot.on('text', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const state = userStates.get(telegramId);
  
  if (state?.waitingForMaster) {
    try {
      const mastersList = await db
        .select()
        .from(masters)
        .where(eq(masters.isActive, true));

      const selectedMaster = mastersList.find(master => 
        ctx.message.text.includes(master.fullName)
      );

      if (!selectedMaster) {
        return ctx.reply('Мастер не найден. Попробуйте еще раз:');
      }

      userStates.set(telegramId, { 
        waitingForDate: true, 
        selectedMasterId: selectedMaster.id,
        selectedMasterName: selectedMaster.fullName
      });
      
      ctx.reply(`Выбран мастер: ${selectedMaster.fullName}\n\nВведите дату работы в формате ДД.ММ.ГГГГ (например, 25.12.2024):`);
    } catch (error) {
      console.error('Error processing master selection:', error);
      ctx.reply('Произошла ошибка');
    }
  } else if (state?.waitingForDate) {
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат даты. Используйте ДД.ММ.ГГГГ (например, 25.12.2024):');
    }

    const [day, month, year] = ctx.message.text.split('.');
    const workDate = `${year}-${month}-${day}`;

    userStates.set(telegramId, { 
      waitingForStartTime: true, 
      selectedMasterId: state.selectedMasterId,
      selectedMasterName: state.selectedMasterName,
      workDate
    });
    
    ctx.reply('Введите время начала в формате ЧЧ:ММ (например, 10:00):');
  } else if (state?.waitingForStartTime) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат времени. Используйте ЧЧ:ММ (например, 10:00):');
    }

    const startTime = ctx.message.text;
    
    userStates.set(telegramId, { 
      waitingForEndTime: true, 
      selectedMasterId: state.selectedMasterId,
      selectedMasterName: state.selectedMasterName,
      workDate: state.workDate,
      startTime
    });
    
    ctx.reply('Введите время окончания в формате ЧЧ:ММ (например, 11:00):');
  } else if (state?.waitingForEndTime) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат времени. Используйте ЧЧ:ММ (например, 11:00):');
    }

    const endTime = ctx.message.text;
    const startTime = state.startTime;

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    if (endMinutes <= startMinutes) {
      return ctx.reply('Время окончания должно быть больше времени начала. Попробуйте еще раз:');
    }

    try {
      const inserted = await db
        .insert(workSlots)
        .values({
          masterId: state.selectedMasterId,
          workDate: state.workDate,
          startTime,
          endTime,
          createdBy: 'admin_bot',
          isConfirmed: false,
          adminUpdateStatus: 'pending',
        })
        .returning();

      // Отправляем уведомление мастеру
      await notifyMasterAboutNewWorkDay(
        state.selectedMasterId,
        state.workDate,
        startTime,
        endTime,
        inserted[0].id,
        state.selectedMasterName
      );

      ctx.reply(`✅ Рабочее время добавлено!\n\n` +
        `👤 Мастер: ${state.selectedMasterName}\n` +
        `📅 Дата: ${state.workDate}\n` +
        `⏰ Время: ${startTime} - ${endTime}\n\n` +
        `⏳ Ожидает подтверждения от мастера`, mainMenu);
      
      userStates.delete(telegramId);
    } catch (error) {
      console.error('Error saving work slot:', error);
      ctx.reply('Произошла ошибка при сохранении рабочего времени');
    }
  }
});

// Функция уведомления мастера о новом рабочем дне
async function notifyMasterAboutNewWorkDay(
  masterId: number,
  workDate: string,
  startTime: string,
  endTime: string,
  workSlotId: number,
  masterName: string
) {
  try {
    const master = await db
      .select()
      .from(masters)
      .where(eq(masters.id, masterId))
      .limit(1);

    if (!master.length || !master[0].telegramId) {
      console.log('Master not found or no telegram ID');
      return false;
    }

    const mastersBotToken = process.env.MASTERS_BOT_TOKEN;
    if (!mastersBotToken) {
      console.log('MASTERS_BOT_TOKEN not set');
      return false;
    }

    const dateObj = new Date(workDate + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const message = `📅 *Новый рабочий день*\n\n` +
      `👤 Администратор добавил вам рабочий день:\n` +
      `📅 Дата: ${formattedDate}\n` +
      `⏰ Время: ${startTime} - ${endTime}\n\n` +
      `Пожалуйста, подтвердите или отклоните этот рабочий день.`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Подтвердить", callback_data: `confirm_${workSlotId}` },
          { text: "❌ Отклонить", callback_data: `reject_${workSlotId}` }
        ]
      ]
    };

    const response = await fetch(`https://api.telegram.org/bot${mastersBotToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: master[0].telegramId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send telegram notification:', error);
      return false;
    }

    console.log(`Notification sent to master ${masterName}`);
    return true;
  } catch (error) {
    console.error('Error sending master notification:', error);
    return false;
  }
}

// Обработка callback'ов от мастеров
bot.on('callback_query', async (ctx) => {
  const callbackData = (ctx.callbackQuery as any)?.data;
  const telegramId = ctx.from?.id.toString();
  
  if (!callbackData || !telegramId) return;

  try {
    const [action, workSlotIdStr] = callbackData.split('_');
    const workSlotId = parseInt(workSlotIdStr);

    if (!action || !workSlotId || isNaN(workSlotId)) {
      return;
    }

    const workSlot = await db
      .select({
        id: workSlots.id,
        masterId: workSlots.masterId,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        masterName: masters.fullName,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(eq(workSlots.id, workSlotId))
      .limit(1);

    if (!workSlot.length) {
      await ctx.editMessageText('Рабочий день не найден');
      await ctx.answerCbQuery();
      return;
    }

    const isConfirmed = action === 'confirm';
    const adminUpdateStatus = isConfirmed ? 'accepted' : 'rejected';

    await db
      .update(workSlots)
      .set({
        isConfirmed,
        adminUpdateStatus,
      })
      .where(eq(workSlots.id, workSlotId));

    const dateObj = new Date(workSlot[0].workDate + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    const actionText = isConfirmed ? 'подтвердили' : 'отклонили';
    const message = `✅ Вы ${actionText} рабочий день:\n\n` +
      `📅 ${formattedDate}\n` +
      `⏰ ${workSlot[0].startTime} - ${workSlot[0].endTime}\n\n` +
      `Статус обновлен!`;

    await ctx.editMessageText(message);
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery('Произошла ошибка');
  }
});

// Просмотр расписания
bot.hears('📅 Просмотр расписания', async (ctx) => {
  try {
    const workSlotsList = await db
      .select({
        id: workSlots.id,
        masterName: masters.fullName,
        masterSpecialization: masters.specialization,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        isConfirmed: workSlots.isConfirmed,
        adminUpdateStatus: workSlots.adminUpdateStatus,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .orderBy(workSlots.workDate, workSlots.startTime);

    if (workSlotsList.length === 0) {
      return ctx.reply('Рабочее время не добавлено');
    }

    let message = '📅 Расписание работы:\n\n';
    
    workSlotsList.forEach(slot => {
      const status = slot.isConfirmed ? '✅' : '⏳';
      message += `${status} ${slot.masterName} (${slot.masterSpecialization})\n`;
      message += `   📅 ${slot.workDate}\n`;
      message += `   ⏰ ${slot.startTime} - ${slot.endTime}\n`;
      message += `   📊 ${slot.adminUpdateStatus}\n\n`;
    });

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    ctx.reply('Произошла ошибка при получении расписания');
  }
});

// Возврат в главное меню
bot.hears('🔙 Главное меню', (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (telegramId) {
    userStates.delete(telegramId);
  }
  ctx.reply('Главное меню:', mainMenu);
});

// Запуск бота
bot.launch().then(() => {
  console.log('Admin bot started successfully!');
}).catch((error) => {
  console.error('Failed to start admin bot:', error);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
