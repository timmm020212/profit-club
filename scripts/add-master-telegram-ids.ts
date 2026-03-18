import { db } from '../db/index-postgres';
import { masters } from '../db/schema';
import { eq } from 'drizzle-orm';

async function addMasterTelegramIds() {
  try {
    console.log('📱 Adding Telegram IDs to masters...');

    // Добавляем Telegram ID для мастеров (используйте тестовые или реальные ID)
    const masterUpdates = [
      { fullName: 'Анна Петрова', telegramId: '222222222' }, // Замените на реальные ID
      { fullName: 'Мария Иванова', telegramId: '333333333' }, // Замените на реальные ID
      { fullName: 'Елена Смирнова', telegramId: '444444444' }, // Замените на реальные ID
    ];

    for (const masterUpdate of masterUpdates) {
      await db
        .update(masters)
        .set({ telegramId: masterUpdate.telegramId })
        .where(eq(masters.fullName, masterUpdate.fullName));
      
      console.log(`✅ Updated ${masterUpdate.fullName} with Telegram ID: ${masterUpdate.telegramId}`);
    }

    console.log('\n🎉 Master Telegram IDs added successfully!');
    console.log('\n📋 Master Telegram IDs:');
    console.log('👩‍💼 Анна Петрова - 222222222');
    console.log('💅 Мария Иванова - 333333333');
    console.log('💆 Елена Смирнова - 444444444');
    console.log('\n⚠️  IMPORTANT: Replace these with real Telegram IDs!');
    console.log('To get your Telegram ID, send /start to @userinfobot');

  } catch (error) {
    console.error('❌ Error adding master Telegram IDs:', error);
  }
}

addMasterTelegramIds();
