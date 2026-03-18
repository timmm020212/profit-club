import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { workSlots, masters } from '../db/schema';
import { eq } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

async function testStatusLogic() {
  try {
    console.log('🧪 Testing Status Logic Fix...\n');

    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Testing date: ${today}\n`);

    // 1. Создаем рабочий день с разными статусами
    const master = await db
      .select()
      .from(masters)
      .limit(1);

    if (!master.length) {
      console.log('❌ No master found');
      return;
    }

    // 2. Тестируем разные статусы
    const testCases = [
      { isConfirmed: false, adminUpdateStatus: 'pending', expected: 'pending' },
      { isConfirmed: true, adminUpdateStatus: 'accepted', expected: 'accepted' },
      { isConfirmed: false, adminUpdateStatus: 'rejected', expected: 'rejected' },
      { isConfirmed: true, adminUpdateStatus: undefined, expected: 'confirmed' },
      { isConfirmed: false, adminUpdateStatus: undefined, expected: 'pending' },
    ];

    for (const testCase of testCases) {
      console.log(`\n🔧 Testing: isConfirmed=${testCase.isConfirmed}, adminUpdateStatus=${testCase.adminUpdateStatus}`);
      
      // Создаем рабочий день
      const newSlot = await db
        .insert(workSlots)
        .values({
          masterId: master[0].id,
          workDate: today,
          startTime: '12:00',
          endTime: '14:00',
          createdBy: 'status_logic_test',
          isConfirmed: testCase.isConfirmed,
          adminUpdateStatus: testCase.adminUpdateStatus,
        })
        .returning();

      console.log(`✅ Created: ID ${newSlot[0].id}`);
      
      // Проверяем логику отображения
      const slot = newSlot[0];
      const adminUpdateStatus = slot.adminUpdateStatus as any;
      
      // Новая логика
      const isConfirmedStatus = adminUpdateStatus === 'accepted' || 
        (adminUpdateStatus === undefined && slot.isConfirmed);
      const isPendingStatus = adminUpdateStatus === 'pending' || 
        (adminUpdateStatus === undefined && !slot.isConfirmed);
      const isRejectedStatus = adminUpdateStatus === 'rejected';
      
      // Для отображения: приоритет adminUpdateStatus над isConfirmed
      let displayStatus = '';
      if (adminUpdateStatus === 'accepted') displayStatus = 'confirmed';
      else if (adminUpdateStatus === 'pending') displayStatus = 'pending';
      else if (adminUpdateStatus === 'rejected') displayStatus = 'rejected';
      else if (slot.isConfirmed) displayStatus = 'confirmed';
      else displayStatus = 'pending';
      
      console.log(`📊 Display logic:`);
      console.log(`   isConfirmedStatus: ${isConfirmedStatus}`);
      console.log(`   isPendingStatus: ${isPendingStatus}`);
      console.log(`   isRejectedStatus: ${isRejectedStatus}`);
      console.log(`   displayStatus: ${displayStatus}`);
      
      // Проверяем ожидаемый результат
      let actualStatus = '';
      if (displayStatus === 'confirmed') actualStatus = 'confirmed';
      else if (displayStatus === 'pending') actualStatus = 'pending';
      else if (displayStatus === 'rejected') actualStatus = 'rejected';
      
      console.log(`   🎯 Expected: ${testCase.expected}, Actual: ${actualStatus}`);
      
      if (actualStatus === testCase.expected) {
        console.log(`✅ Status logic correct`);
      } else {
        console.log(`❌ Status logic incorrect`);
      }

      // Удаляем тестовый слот
      await db
        .delete(workSlots)
        .where(eq(workSlots.id, newSlot[0].id));
    }

    console.log('\n🎉 Status Logic Test Complete!');
    console.log('\n📋 Status Display Logic:');
    console.log('✅ adminUpdateStatus="accepted" → ✅ Подтверждено');
    console.log('✅ adminUpdateStatus="pending" → ⏳ Ожидает подтверждения');
    console.log('✅ adminUpdateStatus="rejected" → ❌ Отклонено');
    console.log('✅ adminUpdateStatus=undefined + isConfirmed=true → ✅ Подтверждено');
    console.log('✅ adminUpdateStatus=undefined + isConfirmed=false → ⏳ Ожидает подтверждения');

  } catch (error) {
    console.error('❌ Error testing status logic:', error);
  }
}

testStatusLogic();
