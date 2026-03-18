import { db } from '../db/index-postgres';
import { workSlots, masters } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';

async function testAdminPanelData() {
  try {
    console.log('🧪 Testing Admin Panel Data...\n');

    // Получаем данные для сегодняшней даты
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Testing date: ${today}\n`);

    // 1. Получаем все рабочие дни для админки (без фильтра isConfirmed)
    const adminSlots = await db
      .select({
        id: workSlots.id,
        masterId: workSlots.masterId,
        masterName: masters.fullName,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
        isConfirmed: workSlots.isConfirmed,
        adminUpdateStatus: workSlots.adminUpdateStatus,
        createdBy: workSlots.createdBy,
        createdAt: workSlots.createdAt,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(eq(workSlots.workDate, today))
      .orderBy(workSlots.startTime);

    console.log(`📊 Found ${adminSlots.length} work slots for admin panel:`);
    
    if (adminSlots.length === 0) {
      console.log('❌ No work slots found for today');
      
      // Создадим тестовый рабочий день
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
            startTime: '10:00',
            endTime: '18:00',
            createdBy: 'test_admin',
            isConfirmed: false,
            adminUpdateStatus: 'pending',
          })
          .returning();

        console.log('✅ Test work slot created:', newSlot[0]);
        
        // Повторно получаем данные
        const updatedSlots = await db
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

        console.log('\n📊 Updated work slots:');
        updatedSlots.forEach(slot => {
          console.log(`  📋 ${slot.masterName}: ${slot.workDate} ${slot.startTime}-${slot.endTime}`);
          console.log(`     ✅ Confirmed: ${slot.isConfirmed}`);
          console.log(`     📊 Status: ${slot.adminUpdateStatus}`);
          console.log('');
        });
      }
    } else {
      adminSlots.forEach(slot => {
        console.log(`  📋 ${slot.masterName}: ${slot.workDate} ${slot.startTime}-${slot.endTime}`);
        console.log(`     ✅ Confirmed: ${slot.isConfirmed}`);
        console.log(`     📊 Status: ${slot.adminUpdateStatus}`);
        console.log('');
      });
    }

    // 2. Проверяем, что клиенты видят только подтвержденные
    const clientSlots = await db
      .select({
        id: workSlots.id,
        masterName: masters.fullName,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(and(
        eq(workSlots.workDate, today),
        eq(workSlots.isConfirmed, true)
      ))
      .orderBy(workSlots.startTime);

    console.log(`👥 Client view: ${clientSlots.length} confirmed slots available`);

    console.log('\n🎉 Admin Panel Data Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`- Admin sees: ${adminSlots.length} slots (all statuses)`);
    console.log(`- Client sees: ${clientSlots.length} slots (confirmed only)`);
    console.log('\n✅ Admin panel should now show all work slots with status indicators!');

  } catch (error) {
    console.error('❌ Error testing admin panel:', error);
  }
}

testAdminPanelData();
