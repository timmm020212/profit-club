import { config } from 'dotenv';
import { db } from '../db/index-postgres';
import { workSlots, masters } from '../db/schema';
import { eq } from 'drizzle-orm';

// Загружаем переменные окружения
config({ path: '.env.local' });

async function testDisplayFix() {
  try {
    console.log('🧪 Testing Display Fix...\n');

    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Testing date: ${today}\n`);

    // 1. Проверяем текущее состояние
    const currentSlots = await db
      .select({
        id: workSlots.id,
        masterId: workSlots.masterId,
        masterName: masters.fullName,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        isConfirmed: workSlots.isConfirmed,
        adminUpdateStatus: workSlots.adminUpdateStatus,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(eq(workSlots.workDate, today))
      .orderBy(workSlots.startTime);

    console.log(`📊 Current work slots: ${currentSlots.length}`);
    
    if (currentSlots.length === 0) {
      console.log('❌ No work slots found for today');
      console.log('✅ Component should now show "На выбранную дату нет рабочих дней"');
      
      // Создаем тестовый рабочий день
      console.log('\n🔧 Creating test work slot...');
      const master = await db
        .select()
        .from(masters)
        .limit(1);

      if (master.length) {
        const newSlot = await db
          .insert(workSlots)
          .values({
            masterId: master[0].id,
            workDate: today,
            startTime: '11:00',
            endTime: '13:00',
            createdBy: 'display_test',
            isConfirmed: false,
            adminUpdateStatus: 'pending',
          })
          .returning();

        console.log('✅ Test work slot created:', newSlot[0]);
        console.log('✅ Component should now show the work slot with status');
      }
    } else {
      console.log('✅ Found work slots:');
      currentSlots.forEach(slot => {
        console.log(`  📋 ${slot.masterName}: ${slot.workDate} ${slot.startTime}-${slot.endTime}`);
        console.log(`     ✅ Confirmed: ${slot.isConfirmed}`);
        console.log(`     📊 Status: ${slot.adminUpdateStatus}`);
      });
      console.log('✅ Component should show all these work slots');
    }

    // 2. Проверяем API для админов
    console.log('\n🔍 Testing admin API...');
    const response = await fetch(`http://localhost:3000/api/work-slots-admin?date=${today}`);
    if (response.ok) {
      const apiSlots = await response.json();
      console.log(`✅ API returns: ${apiSlots.length} slots`);
    } else {
      console.log('❌ API error:', response.status);
    }

    // 3. Проверяем SSE endpoint
    console.log('\n🔍 Testing SSE endpoint...');
    const sseResponse = await fetch(`http://localhost:3000/api/work-slots-stream`);
    if (sseResponse.ok) {
      console.log('✅ SSE endpoint is working');
    } else {
      console.log('❌ SSE endpoint error:', sseResponse.status);
    }

    console.log('\n🎉 Display Fix Test Complete!');
    console.log('\n📋 What should be visible now:');
    console.log('- ✅ "Рабочие дни мастеров" section always visible');
    console.log('- ✅ Table with headers always displayed');
    console.log('- ✅ "На выбранную дату нет рабочих дней" when empty');
    console.log('- ✅ Work slots with statuses when present');
    console.log('- ✅ Real-time updates via SSE');

  } catch (error) {
    console.error('❌ Error testing display fix:', error);
  }
}

testDisplayFix();
