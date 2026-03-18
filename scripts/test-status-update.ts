import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { workSlots } from '../db/schema';
import { eq } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

async function testStatusUpdate() {
  try {
    console.log('🧪 Testing Status Update...\n');

    // 1. Создаем тестовый рабочий день
    const today = new Date().toISOString().split('T')[0];
    const masterId = 1; // Предполагаем, что мастер с ID=1 существует

    const newSlot = await db
      .insert(workSlots)
      .values({
        masterId,
        workDate: today,
        startTime: '16:00',
        endTime: '18:00',
        createdBy: 'status_test',
        isConfirmed: false,
        adminUpdateStatus: 'pending',
      })
      .returning();

    console.log(`✅ Created work slot: ID ${newSlot[0].id}, status: pending`);

    // 2. Подтверждаем его
    await db
      .update(workSlots)
      .set({
        isConfirmed: true,
        adminUpdateStatus: 'accepted',
      })
      .where(eq(workSlots.id, newSlot[0].id));

    console.log(`✅ Updated work slot: ID ${newSlot[0].id}, status: accepted`);

    // 3. Отклоняем его
    await db
      .update(workSlots)
      .set({
        isConfirmed: false,
        adminUpdateStatus: 'rejected',
      })
      .where(eq(workSlots.id, newSlot[0].id));

    console.log(`✅ Updated work slot: ID ${newSlot[0].id}, status: rejected`);

    // 4. Снова подтверждаем
    await db
      .update(workSlots)
      .set({
        isConfirmed: true,
        adminUpdateStatus: 'accepted',
      })
      .where(eq(workSlots.id, newSlot[0].id));

    console.log(`✅ Updated work slot: ID ${newSlot[0].id}, status: accepted`);

    console.log('\n🎉 Status update test completed!');
    console.log('✅ Table should now show updated statuses in admin panel');

  } catch (error) {
    console.error('❌ Error testing status update:', error);
  }
}

testStatusUpdate();
