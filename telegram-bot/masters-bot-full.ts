import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { db } from '../db/index-sqlite';
import { masters, workSlots, appointments, services, workSlotChangeRequests } from '../db/schema-sqlite';
import { eq, and, gte, lte } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

const MASTERS_BOT_TOKEN = process.env.MASTERS_BOT_TOKEN || '8497762169:AAG5UuTBM2T2aON0c0PBOjiiaVkVVXL2Q5U';

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
  ['🔄 Изменить рабочий день'],
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
      const status = slot.isConfirmed ? '✅ Подтверждено' : '⏳ Ожидает подтверждения';
      message += `📅 ${slot.workDate}\n`;
      message += `⏰ ${slot.startTime} - ${slot.endTime}\n`;
      message += `📊 Статус: ${status}\n\n`;
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

// Изменить рабочий день
bot.hears('🔄 Изменить рабочий день', async (ctx) => {
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
      return ctx.reply('У вас нет запланированных рабочих дней для изменения');
    }

    const buttons = workSlotsList.map(slot => 
      Markup.button.text(`${slot.workDate} ${slot.startTime}-${slot.endTime}`)
    );

    await ctx.reply('Выберите рабочий день для изменения:', Markup.keyboard([
      buttons,
      ['🔙 Главное меню']
    ]).resize());

    userStates.set(telegramId, { waitingForSlotToChange: true });
  } catch (error) {
    console.error('Error fetching work slots for change:', error);
    ctx.reply('Произошла ошибка');
  }
});

// Обработка выбора рабочего дня для изменения
bot.on('text', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  // Главное меню всегда имеет приоритет
  if (ctx.message.text === '🔙 Главное меню') {
    userStates.delete(telegramId);
    return ctx.reply('Главное меню:', masterMenu);
  }

  const state = userStates.get(telegramId);

  if (state?.waitingForSlotToChange) {
    try {
      const master = await isMaster(telegramId);
      if (!master) return;

      const workSlotsList = await db
        .select()
        .from(workSlots)
        .where(and(
          eq(workSlots.masterId, master.id),
          gte(workSlots.workDate, new Date().toISOString().split('T')[0])
        ));

      const selectedSlot = workSlotsList.find(slot => 
        ctx.message.text.includes(slot.workDate) && 
        ctx.message.text.includes(slot.startTime)
      );

      if (!selectedSlot) {
        return ctx.reply('Рабочий день не найден. Попробуйте еще раз:');
      }

      // Сохраняем выбранный слот и показываем опции изменения
      userStates.set(telegramId, { 
        waitingForChangeAction: true, 
        selectedSlotId: selectedSlot.id,
        selectedSlot: selectedSlot
      });
      
      ctx.reply(`Выбран рабочий день: ${selectedSlot.workDate} ${selectedSlot.startTime}-${selectedSlot.endTime}\n\n` +
        'Что вы хотите сделать?', Markup.keyboard([
          ['🕐 Изменить время'],
          ['📅 Изменить дату'],
          ['❌ Отменить рабочий день'],
          ['🔙 Главное меню']
        ]).resize());
    } catch (error) {
      console.error('Error processing slot selection:', error);
      ctx.reply('Произошла ошибка');
    }
  } else if (state?.waitingForChangeAction) {
    const action = ctx.message.text;
    
    if (action === '🕐 Изменить время') {
      userStates.set(telegramId, { 
        waitingForNewTime: true, 
        selectedSlotId: state.selectedSlotId,
        selectedSlot: state.selectedSlot
      });
      ctx.reply('Введите новое время в формате ЧЧ:ММ-ЧЧ:ММ (например, 09:00-17:00):');
    } else if (action === '📅 Изменить дату') {
      userStates.set(telegramId, { 
        waitingForNewDate: true, 
        selectedSlotId: state.selectedSlotId,
        selectedSlot: state.selectedSlot
      });
      ctx.reply('Введите новую дату в формате ДД.ММ.ГГГГ (например, 26.02.2025):');
    } else if (action === '❌ Отменить рабочий день') {
      // Создаем запрос на отмену
      await handleWorkSlotChange(telegramId, state.selectedSlot, 'cancel');
      userStates.delete(telegramId);
      ctx.reply('Запрос на отмену рабочего дня отправлен администратору', masterMenu);
    }
  } else if (state?.waitingForNewTime) {
    // Обработка нового времени
    const timeRegex = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
    if (!timeRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат. Используйте ЧЧ:ММ-ЧЧ:ММ (например, 09:00-17:00):');
    }

    const [startTime, endTime] = ctx.message.text.split('-');
    await handleWorkSlotChange(telegramId, state.selectedSlot, 'time_change', {
      newStartTime: startTime,
      newEndTime: endTime
    });
    
    userStates.delete(telegramId);
    ctx.reply('Запрос на изменение времени отправлен администратору', masterMenu);
  } else if (state?.waitingForNewDate) {
    // Обработка новой даты
    const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
    if (!dateRegex.test(ctx.message.text)) {
      return ctx.reply('Неверный формат. Используйте ДД.ММ.ГГГГ (например, 26.02.2025):');
    }

    const [day, month, year] = ctx.message.text.split('.');
    const newDate = `${year}-${month}-${day}`;
    
    await handleWorkSlotChange(telegramId, state.selectedSlot, 'date_change', {
      newDate
    });
    
    userStates.delete(telegramId);
    ctx.reply('Запрос на изменение даты отправлен администратору', masterMenu);
  }
});

// Функция обработки запроса на изменение рабочего дня
async function handleWorkSlotChange(telegramId: string, slot: any, type: string, changes?: any) {
  try {
    const master = await isMaster(telegramId);
    if (!master) return;

    // Создаем запрос на изменение
    await db.insert(workSlotChangeRequests).values({
      workSlotId: slot.id,
      masterId: master.id,
      suggestedWorkDate: changes?.newDate || slot.workDate,
      suggestedStartTime: changes?.newStartTime || slot.startTime,
      suggestedEndTime: changes?.newEndTime || slot.endTime,
      status: 'pending',
      type: type,
    });

    console.log(`Change request created for master ${master.fullName}, slot ${slot.id}`);
  } catch (error) {
    console.error('Error creating change request:', error);
  }
}

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

// Возврат в главное меню
bot.hears('🔙 Главное меню', (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (telegramId) {
    userStates.delete(telegramId);
  }
  ctx.reply('Главное меню:', masterMenu);
});

// Обработка callback'ов (подтверждение/отклонение от мастера)
bot.on('callback_query', async (ctx) => {
  const callbackData = (ctx.callbackQuery as any)?.data;
  const telegramId = ctx.from?.id.toString();

  if (!callbackData || !telegramId) return;

  try {
    // Мастер отвечает на запрос от АДМИНИСТРАТОРА (confirm_request_X / reject_request_X)
    if (callbackData.startsWith('confirm_request_') || callbackData.startsWith('reject_request_')) {
      const changeRequestId = parseInt(callbackData.split('_').pop()!);
      if (isNaN(changeRequestId)) { await ctx.answerCbQuery('Некорректный запрос'); return; }

      const reqs = await db.select().from(workSlotChangeRequests).where(eq(workSlotChangeRequests.id, changeRequestId)).limit(1);
      if (!reqs.length) { await ctx.answerCbQuery('Запрос не найден'); return; }

      const req = reqs[0];
      const isConfirm = callbackData.startsWith('confirm_request_');

      if (isConfirm) {
        await db.update(workSlots).set({
          workDate: req.suggestedWorkDate,
          startTime: req.suggestedStartTime,
          endTime: req.suggestedEndTime,
          isConfirmed: true,
          adminUpdateStatus: 'accepted',
        }).where(eq(workSlots.id, req.workSlotId));
        await db.update(workSlotChangeRequests).set({ status: 'accepted' }).where(eq(workSlotChangeRequests.id, changeRequestId));
        await ctx.editMessageText(`✅ Изменение подтверждено!\n\n📅 ${req.suggestedWorkDate}\n⏰ ${req.suggestedStartTime} — ${req.suggestedEndTime}`);
      } else {
        await db.update(workSlotChangeRequests).set({ status: 'rejected' }).where(eq(workSlotChangeRequests.id, changeRequestId));
        await ctx.editMessageText(`❌ Изменение отклонено.`);
      }
      await ctx.answerCbQuery();
      return;
    }

    // Старая обработка: confirm_X / reject_X (workSlotId напрямую)
    if (callbackData.startsWith('confirm_') || callbackData.startsWith('reject_')) {
      const parts = callbackData.split('_');
      const workSlotId = parseInt(parts[parts.length - 1]);
      if (!isNaN(workSlotId)) {
        const isConfirmed = callbackData.startsWith('confirm_');
        await db.update(workSlots).set({
          isConfirmed,
          adminUpdateStatus: isConfirmed ? 'accepted' : 'rejected',
        }).where(eq(workSlots.id, workSlotId));
        await ctx.editMessageText(`Рабочий день ${isConfirmed ? 'подтвержден' : 'отклонен'}!`);
        await ctx.answerCbQuery();
      }
    }
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
