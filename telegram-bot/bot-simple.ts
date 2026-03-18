import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { masters, workSlots, admins } from '../db/schema';
import { eq } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

// Токен и ID администратора (замените на свои)
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || 'YOUR_ADMIN_ID_HERE';

const bot = new Telegraf(BOT_TOKEN);

// Простое хранилище состояний (в памяти)
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
      message += `   Телефон: ${master.phone || 'не указан'}\n\n`;
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

    // Устанавливаем состояние ожидания выбора мастера
    userStates.set(ctx.from?.id.toString(), { waitingForMaster: true });
  } catch (error) {
    console.error('Error starting work slot addition:', error);
    ctx.reply('Произошла ошибка');
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

      // Сохраняем выбранного мастера и переходим к вводу даты
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
    // Обработка ввода даты
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат даты. Используйте ДД.ММ.ГГГГ (например, 25.12.2024):');
    }

    // Конвертируем дату в формат YYYY-MM-DD
    const [day, month, year] = ctx.message.text.split('.');
    const workDate = `${year}-${month}-${day}`;

    // Сохраняем дату и переходим к вводу времени начала
    userStates.set(telegramId, { 
      waitingForStartTime: true, 
      selectedMasterId: state.selectedMasterId,
      selectedMasterName: state.selectedMasterName,
      workDate
    });
    
    ctx.reply('Введите время начала в формате ЧЧ:ММ (например, 10:00):');
  } else if (state?.waitingForStartTime) {
    // Обработка ввода времени начала
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат времени. Используйте ЧЧ:ММ (например, 10:00):');
    }

    const startTime = ctx.message.text;
    
    // Сохраняем время начала и переходим к вводу времени окончания
    userStates.set(telegramId, { 
      waitingForEndTime: true, 
      selectedMasterId: state.selectedMasterId,
      selectedMasterName: state.selectedMasterName,
      workDate: state.workDate,
      startTime
    });
    
    ctx.reply('Введите время окончания в формате ЧЧ:ММ (например, 11:00):');
  } else if (state?.waitingForEndTime) {
    // Обработка ввода времени окончания
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат времени. Используйте ЧЧ:ММ (например, 11:00):');
    }

    const endTime = ctx.message.text;
    const startTime = state.startTime;

    // Проверяем, что время окончания больше времени начала
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    if (endMinutes <= startMinutes) {
      return ctx.reply('Время окончания должно быть больше времени начала. Попробуйте еще раз:');
    }

    try {
      // Сохраняем рабочий слот в базу данных
      await db.insert(workSlots).values({
        masterId: state.selectedMasterId,
        workDate: state.workDate,
        startTime,
        endTime,
        createdBy: telegramId,
      });

      ctx.reply(`✅ Рабочее время добавлено!\n\nМастер: ${state.selectedMasterName}\nДата: ${state.workDate}\nВремя: ${startTime} - ${endTime}`, mainMenu);
      
      // Сбрасываем состояние
      userStates.delete(telegramId);
    } catch (error) {
      console.error('Error saving work slot:', error);
      ctx.reply('Произошла ошибка при сохранении рабочего времени');
    }
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
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .orderBy(workSlots.workDate, workSlots.startTime);

    if (workSlotsList.length === 0) {
      return ctx.reply('Рабочее время не добавлено');
    }

    // Группируем по мастеру и дате
    const grouped = workSlotsList.reduce((acc, slot) => {
      const masterKey = `${slot.masterName} (${slot.masterSpecialization})`;
      if (!acc[masterKey]) {
        acc[masterKey] = {};
      }
      if (!acc[masterKey][slot.workDate]) {
        acc[masterKey][slot.workDate] = [];
      }
      acc[masterKey][slot.workDate].push(`${slot.startTime} - ${slot.endTime}`);
      return acc;
    }, {} as any);

    let message = '📅 Расписание работы:\n\n';
    
    Object.keys(grouped).forEach(masterName => {
      message += `👤 ${masterName}\n`;
      Object.keys(grouped[masterName]).forEach(date => {
        message += `   📅 ${date}: ${grouped[masterName][date].join(', ')}\n`;
      });
      message += '\n';
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
  console.log('Bot started successfully!');
}).catch((error) => {
  console.error('Failed to start bot:', error);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
