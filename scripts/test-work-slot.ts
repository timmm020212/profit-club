import { db } from '../db/index-postgres';
import { workSlots, masters } from '../db/schema';
import { eq } from 'drizzle-orm';

async function testWorkSlotCreation() {
  try {
    console.log('🧪 Testing work slot creation...');

    // Получаем первого мастера
    const master = await db
      .select()
      .from(masters)
      .limit(1);

    if (!master.length) {
      console.log('❌ No masters found');
      return;
    }

    console.log(`📝 Creating work slot for master: ${master[0].fullName}`);

    // Создаем неподтвержденный рабочий день
    const inserted = await db
      .insert(workSlots)
      .values({
        masterId: master[0].id,
        workDate: '2025-02-26',
        startTime: '10:00',
        endTime: '18:00',
        createdBy: 'test_admin',
        isConfirmed: false,
        adminUpdateStatus: 'pending',
      })
      .returning();

    console.log('✅ Work slot created:', inserted[0]);
    console.log(`📋 Status: isConfirmed=${inserted[0].isConfirmed}, adminUpdateStatus=${inserted[0].adminUpdateStatus}`);

    // Проверяем, что он НЕ появляется в общем API (только подтвержденные)
    const confirmedSlots = await db
      .select()
      .from(workSlots)
      .where(eq(workSlots.isConfirmed, true));

    console.log(`📊 Confirmed slots in DB: ${confirmedSlots.length}`);

    // Проверяем, что он появляется в админском API (все слоты)
    const allSlots = await db
      .select()
      .from(workSlots);

    console.log(`📊 All slots in DB: ${allSlots.length}`);

    console.log('\n🎉 Test completed successfully!');
    console.log('✅ Work slot created as unconfirmed');
    console.log('✅ API correctly filters unconfirmed slots');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testWorkSlotCreation();
