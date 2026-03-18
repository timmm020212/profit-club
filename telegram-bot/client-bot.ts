import { Telegraf, Markup } from 'telegraf';
import { db } from '../db/index-postgres';
import { masters, services, workSlots, appointments, clients } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

const CLIENT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8568554790:AAEHlp0un2EoHLGSJlE2G-suTZKp5seXz30';
const webAppBaseUrl = process.env.TELEGRAM_WEBAPP_URL || "http://localhost:3000/telegram-webapp";

const bot = new Telegraf(CLIENT_BOT_TOKEN);

// Главное меню
const mainMenu = Markup.keyboard([
  ['📅 Записаться'],
  ['👤 Мои записи'],
  ['ℹ️ О нас'],
]).resize();

// Команда /start
bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const firstName = ctx.from?.first_name || 'Клиент';
  
  if (!telegramId) {
    return ctx.reply('Ошибка: не удалось определить ваш Telegram ID');
  }

  // Проверяем, есть ли клиент в базе
  try {
    const existingClient = await db
      .select()
      .from(clients)
      .where(eq(clients.telegramId, telegramId))
      .limit(1);

    if (existingClient.length === 0) {
      // Регистрируем нового клиента
      await db.insert(clients).values({
        telegramId,
        name: firstName,
        phone: '',
        isActive: true,
      });
    }

    ctx.reply(`Добро пожаловать, ${firstName}! 👋\n\nВыберите действие:`, mainMenu);
  } catch (error) {
    console.error('Error registering client:', error);
    ctx.reply('Произошла ошибка. Попробуйте позже.');
  }
});

// Записаться
bot.hears('📅 Записаться', async (ctx) => {
  try {
    const mastersList = await db
      .select()
      .from(masters)
      .where(eq(masters.isActive, true));

    if (mastersList.length === 0) {
      return ctx.reply('К сожалению, сейчас нет доступных мастеров');
    }

    const buttons = mastersList.map(master => 
      Markup.button.text(`${master.fullName} (${master.specialization})`)
    );

    await ctx.reply('Выберите мастера:', Markup.keyboard([
      buttons,
      ['🔙 Главное меню']
    ]).resize());

    // Сохраняем состояние
    ctx.session = { waitingForMaster: true };
  } catch (error) {
    console.error('Error fetching masters:', error);
    ctx.reply('Произошла ошибка при загрузке мастеров');
  }
});

// Обработка выбора мастера
bot.on('text', async (ctx) => {
  const session = ctx.session as any;
  
  if (session?.waitingForMaster) {
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

      // Получаем услуги мастера
      const servicesList = await db
        .select()
        .from(services);

      if (servicesList.length === 0) {
        return ctx.reply('Услуги не найдены');
      }

      const buttons = servicesList.map(service => 
        Markup.button.text(`${service.name} - ${service.price}₽`)
      );

      await ctx.reply('Выберите услугу:', Markup.keyboard([
        buttons,
        ['🔙 Главное меню']
      ]).resize());

      ctx.session = { 
        waitingForService: true, 
        selectedMasterId: selectedMaster.id,
        selectedMasterName: selectedMaster.fullName
      };
    } catch (error) {
      console.error('Error processing master selection:', error);
      ctx.reply('Произошла ошибка');
    }
  } else if (session?.waitingForService) {
    // Обработка выбора услуги
    try {
      const servicesList = await db
        .select()
        .from(services);

      const selectedService = servicesList.find(service => 
        ctx.message.text.includes(service.name)
      );

      if (!selectedService) {
        return ctx.reply('Услуга не найдена. Попробуйте еще раз:');
      }

      // Получаем доступные слоты
      const today = new Date().toISOString().split('T')[0];
      const workSlotsList = await db
        .select()
        .from(workSlots)
        .where(and(
          eq(workSlots.masterId, session.selectedMasterId),
          gte(workSlots.workDate, today),
          eq(workSlots.isAvailable, true)
        ))
        .orderBy(workSlots.workDate, workSlots.startTime);

      if (workSlotsList.length === 0) {
        return ctx.reply('Нет доступных слотов для записи');
      }

      const buttons = workSlotsList.map(slot => 
        Markup.button.text(`${slot.workDate} ${slot.startTime}-${slot.endTime}`)
      );

      await ctx.reply('Выберите дату и время:', Markup.keyboard([
        buttons,
        ['🔙 Главное меню']
      ]).resize());

      ctx.session = { 
        waitingForSlot: true, 
        selectedMasterId: session.selectedMasterId,
        selectedMasterName: session.selectedMasterName,
        selectedServiceId: selectedService.id,
        selectedServiceName: selectedService.name
      };
    } catch (error) {
      console.error('Error processing service selection:', error);
      ctx.reply('Произошла ошибка');
    }
  } else if (session?.waitingForSlot) {
    // Обработка выбора слота
    try {
      const workSlotsList = await db
        .select()
        .from(workSlots)
        .where(and(
          eq(workSlots.masterId, session.selectedMasterId),
          eq(workSlots.isAvailable, true)
        ));

      const selectedSlot = workSlotsList.find(slot => 
        ctx.message.text.includes(slot.workDate) && 
        ctx.message.text.includes(slot.startTime)
      );

      if (!selectedSlot) {
        return ctx.reply('Слот не найден. Попробуйте еще раз:');
      }

      // Создаем запись
      const telegramId = ctx.from?.id.toString();
      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.telegramId, telegramId))
        .limit(1);

      if (client.length === 0) {
        return ctx.reply('Клиент не найден');
      }

      await db.insert(appointments).values({
        masterId: session.selectedMasterId,
        serviceId: session.selectedServiceId,
        clientId: client[0].id,
        appointmentDate: selectedSlot.workDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        status: 'confirmed',
        clientName: client[0].name,
        clientPhone: client[0].phone || '',
      });

      // Обновляем статус слота
      await db
        .update(workSlots)
        .set({ isAvailable: false })
        .where(eq(workSlots.id, selectedSlot.id));

      ctx.reply(`✅ Запись успешно создана!\n\n` +
        `👤 Мастер: ${session.selectedMasterName}\n` +
        `💇 Услуга: ${session.selectedServiceName}\n` +
        `📅 Дата: ${selectedSlot.workDate}\n` +
        `⏰ Время: ${selectedSlot.startTime} - ${selectedSlot.endTime}\n\n` +
        `Ждем вас в нашем салоне!`, mainMenu);

      ctx.session = null;
    } catch (error) {
      console.error('Error creating appointment:', error);
      ctx.reply('Произошла ошибка при создании записи');
    }
  }
});

// Мои записи
bot.hears('👤 Мои записи', async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  try {
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.telegramId, telegramId))
      .limit(1);

    if (client.length === 0) {
      return ctx.reply('Вы не зарегистрированы');
    }

    const appointmentsList = await db
      .select({
        id: appointments.id,
        serviceName: services.name,
        masterName: masters.fullName,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        status: appointments.status,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .leftJoin(masters, eq(appointments.masterId, masters.id))
      .where(eq(appointments.clientId, client[0].id))
      .orderBy(appointments.appointmentDate, appointments.startTime);

    if (appointmentsList.length === 0) {
      return ctx.reply('У вас нет записей');
    }

    let message = '📋 Ваши записи:\n\n';
    appointmentsList.forEach(apt => {
      message += `📅 ${apt.appointmentDate}\n`;
      message += `⏰ ${apt.startTime} - ${apt.endTime}\n`;
      message += `💇 ${apt.serviceName}\n`;
      message += `👤 ${apt.masterName}\n`;
      message += `📊 Статус: ${apt.status}\n\n`;
    });

    ctx.reply(message);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    ctx.reply('Произошла ошибка при получении записей');
  }
});

// О нас
bot.hears('ℹ️ О нас', (ctx) => {
  ctx.reply('💆‍♀️ Profit Club - салон красоты\n\n' +
    'Мы предлагаем:\n' +
    '• Профессиональные услуги\n' +
    '• Опытных мастеров\n' +
    '• Удобную запись онлайн\n\n' +
    '📞 Для связи: +7 (XXX) XXX-XX-XX\n' +
    '📍 Адрес: г. Москва, ул. Примерная, 123', mainMenu);
});

// Возврат в главное меню
bot.hears('🔙 Главное меню', (ctx) => {
  ctx.session = null;
  ctx.reply('Главное меню:', mainMenu);
});

// Запуск бота
bot.launch().then(() => {
  console.log('Client bot started successfully!');
}).catch((error) => {
  console.error('Failed to start client bot:', error);
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
