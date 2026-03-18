import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { workSlots, masters } from '../db/schema';
import { eq } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

async function testDirectNotification() {
  try {
    console.log('🧪 Testing Direct Notification...\n');

    const mastersBotToken = process.env.MASTERS_BOT_TOKEN;
    if (!mastersBotToken) {
      console.log('❌ MASTERS_BOT_TOKEN not found');
      return;
    }

    // 1. Получаем мастера с Telegram ID
    const master = await db
      .select()
      .from(masters)
      .where(eq(masters.isActive, true))
      .limit(1);

    if (!master.length || !master[0].telegramId) {
      console.log('❌ No master with Telegram ID found');
      return;
    }

    const masterInfo = master[0];
    console.log(`👤 Found master: ${masterInfo.fullName}`);
    console.log(`📱 Telegram ID: ${masterInfo.telegramId}`);

    // 2. Создаем тестовый рабочий день
    const today = new Date().toISOString().split('T')[0];
    const newSlot = await db
      .insert(workSlots)
      .values({
        masterId: masterInfo.id,
        workDate: today,
        startTime: '15:00',
        endTime: '17:00',
        createdBy: 'direct_test',
        isConfirmed: false,
        adminUpdateStatus: 'pending',
      })
      .returning();

    console.log(`✅ Work slot created: ID ${newSlot[0].id}`);

    // 3. Отправляем уведомление напрямую
    const dateObj = new Date(today + "T00:00:00");
    const formattedDate = dateObj.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long", 
      year: "numeric",
    });

    const message = `📅 Новый рабочий день\n\n` +
      `👤 Администратор: direct_test\n` +
      `📅 Дата: ${formattedDate}\n` +
      `⏰ Время: 15:00 - 17:00\n\n` +
      `Пожалуйста, подтвердите или отклоните этот рабочий день.`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Подтвердить", callback_data: `confirm_${newSlot[0].id}` },
          { text: "❌ Отклонить", callback_data: `reject_${newSlot[0].id}` }
        ]
      ]
    };

    console.log(`📤 Sending notification to ${masterInfo.telegramId}...`);

    const response = await fetch(`https://api.telegram.org/bot${mastersBotToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: masterInfo.telegramId,
        text: message,
        reply_markup: keyboard,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Notification sent successfully!');
      console.log(`📨 Message ID: ${result.result.message_id}`);
      console.log('\n🎉 Check Telegram now!');
      console.log(`📱 Master ${masterInfo.fullName} should receive message with buttons`);
      console.log('🤖 Bot: @ProfitClub_staff_bot');
    } else {
      const error = await response.json();
      console.log('❌ Failed to send notification:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDirectNotification();
