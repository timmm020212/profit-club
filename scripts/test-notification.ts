import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { workSlots, masters } from '../db/schema';
import { eq } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

async function testNotification() {
  try {
    console.log('🧪 Testing Notification System...\n');

    // 1. Проверяем, что у мастеров есть Telegram ID
    const mastersWithTelegram = await db
      .select()
      .from(masters)
      .where(eq(masters.isActive, true));

    console.log(`📊 Found ${mastersWithTelegram.length} masters:`);
    mastersWithTelegram.forEach(master => {
      console.log(`  👤 ${master.fullName}: ${master.telegramId || '❌ No Telegram ID'}`);
    });

    // 2. Проверяем токен бота
    const mastersBotToken = process.env.MASTERS_BOT_TOKEN;
    if (!mastersBotToken) {
      console.log('\n❌ MASTERS_BOT_TOKEN not found in environment');
      return;
    }

    console.log(`\n🤖 Masters Bot Token: ${mastersBotToken.substring(0, 10)}...`);

    // 3. Проверяем работу бота
    const botResponse = await fetch(`https://api.telegram.org/bot${mastersBotToken}/getMe`);
    if (botResponse.ok) {
      const botInfo = await botResponse.json();
      console.log(`✅ Bot is working: @${botInfo.result.username}`);
    } else {
      console.log('❌ Bot token is invalid');
      return;
    }

    // 4. Создаем тестовый рабочий день с уведомлением
    const today = new Date().toISOString().split('T')[0];
    const master = mastersWithTelegram[0];

    if (!master || !master.telegramId) {
      console.log('\n❌ No master with Telegram ID found for testing');
      return;
    }

    console.log(`\n🔧 Creating test work slot for ${master.fullName}...`);

    // Создаем рабочий день через API (это должно отправить уведомление)
    const response = await fetch('http://localhost:3000/api/work-slots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=test' // Это не сработает без реальной сессии, но для теста логики
      },
      body: JSON.stringify({
        masterId: master.id,
        workDate: today,
        startTime: '14:00',
        endTime: '16:00',
        adminName: 'test_notification'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Work slot created:', result);
      console.log('\n📱 Notification should be sent to master!');
      console.log(`   Check Telegram for message from @${process.env.MASTERS_BOT_USERNAME || 'bot'}`);
    } else {
      const error = await response.text();
      console.log('❌ Failed to create work slot:', error);
    }

    console.log('\n🎉 Notification test completed!');
    console.log('\n📋 Check Telegram for:');
    console.log('1. Message from masters bot');
    console.log('2. Inline buttons: ✅ Подтвердить / ❌ Отклонить');
    console.log('3. Proper formatting and master name');

  } catch (error) {
    console.error('❌ Error testing notifications:', error);
  }
}

testNotification();
