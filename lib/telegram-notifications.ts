import { db } from '../db';
import { masters, workSlots } from '../db/schema';
import { eq } from 'drizzle-orm';

// Функция отправки уведомления мастеру о новом рабочем дне
export async function notifyMasterNewWorkDay({
  masterId,
  workDate,
  startTime,
  endTime,
  workSlotId,
  adminName,
}: {
  masterId: number;
  workDate: string;
  startTime: string;
  endTime: string;
  workSlotId: number;
  adminName: string;
}) {
  try {
    // Получаем информацию о мастере
    const master = await db
      .select()
      .from(masters)
      .where(eq(masters.id, masterId))
      .limit(1);

    if (!master.length || !master[0].telegramId) {
      console.log('Master not found or no telegram ID');
      return false;
    }

    const botToken = process.env.MASTERS_BOT_TOKEN;
    if (!botToken) {
      console.log('MASTERS_BOT_TOKEN not set');
      return false;
    }

    // Форматируем дату для красивого отображения
    const dateObj = new Date(workDate + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const message = `📅 *Новый рабочий день*\n\n` +
      `👤 Администратор: ${adminName}\n` +
      `📅 Дата: ${formattedDate}\n` +
      `⏰ Время: ${startTime} - ${endTime}\n\n` +
      `Пожалуйста, подтвердите или отклоните этот рабочий день.`;

    // Создаем inline кнопки для подтверждения
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Подтвердить", callback_data: `confirm_${workSlotId}` },
          { text: "❌ Отклонить", callback_data: `reject_${workSlotId}` }
        ]
      ]
    };

    // Отправляем сообщение мастеру
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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

    console.log(`Notification sent to master ${master[0].fullName}`);
    return true;
  } catch (error) {
    console.error('Error sending master notification:', error);
    return false;
  }
}

// Функция обработки callback от мастера (подтверждение/отклонение)
export async function handleWorkSlotCallback(callbackData: string, telegramId: string) {
  try {
    const [action, workSlotIdStr] = callbackData.split('_');
    const workSlotId = parseInt(workSlotIdStr);

    if (!action || !workSlotId || isNaN(workSlotId)) {
      return { success: false, message: 'Неверный формат данных' };
    }

    // Получаем информацию о рабочем слоте
    const workSlot = await db
      .select({
        id: workSlots.id,
        masterId: workSlots.masterId,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        masterName: masters.fullName,
        masterTelegramId: masters.telegramId,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(eq(workSlots.id, workSlotId))
      .limit(1);

    if (!workSlot.length) {
      return { success: false, message: 'Рабочий день не найден' };
    }

    // Проверяем, что это мастер данного рабочего дня
    if (workSlot[0].masterTelegramId !== telegramId) {
      return { success: false, message: 'У вас нет прав для этого действия' };
    }

    // Обновляем статус рабочего дня
    const isConfirmed = action === 'confirm';
    const adminUpdateStatus = isConfirmed ? 'accepted' : 'rejected';

    await db
      .update(workSlots)
      .set({
        isConfirmed,
        adminUpdateStatus,
      })
      .where(eq(workSlots.id, workSlotId));

    // Форматируем дату для ответа
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

    return { success: true, message };
  } catch (error) {
    console.error('Error handling work slot callback:', error);
    return { success: false, message: 'Произошла ошибка' };
  }
}
