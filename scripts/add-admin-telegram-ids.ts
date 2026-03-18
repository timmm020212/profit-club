import { db } from '../db/index-postgres';
import { admins } from '../db/schema';
import { eq } from 'drizzle-orm';

async function addAdminTelegramIds() {
  try {
    console.log('📱 Adding Telegram IDs to administrators...');

    // Добавляем Telegram ID для существующих администраторов
    const adminUpdates = [
      { username: 'admin', telegramId: '123456789' }, // Замените на реальные ID
      { username: 'natalia', telegramId: '987654321' }, // Замените на реальные ID
      { username: 'anna', telegramId: '555555555' }, // Замените на реальные ID
      { username: 'anastasia', telegramId: '111111111' }, // Замените на реальные ID
    ];

    for (const adminUpdate of adminUpdates) {
      await db
        .update(admins)
        .set({ telegramId: adminUpdate.telegramId })
        .where(eq(admins.username, adminUpdate.username));
      
      console.log(`✅ Updated ${adminUpdate.username} with Telegram ID: ${adminUpdate.telegramId}`);
    }

    console.log('\n🎉 Telegram IDs added successfully!');
    console.log('\n📋 Administrator Telegram IDs:');
    console.log('👤 admin - 123456789');
    console.log('👤 natalia - 987654321');
    console.log('👤 anna - 555555555');
    console.log('👤 anastasia - 111111111');
    console.log('\n⚠️  IMPORTANT: Replace these with real Telegram IDs!');
    console.log('To get your Telegram ID, send /start to @userinfobot');

  } catch (error) {
    console.error('❌ Error adding Telegram IDs:', error);
  }
}

addAdminTelegramIds();
