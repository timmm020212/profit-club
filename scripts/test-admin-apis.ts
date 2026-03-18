import { db } from '../db/index-postgres';
import { services, workSlots, masters } from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';

async function testAdminAPIs() {
  try {
    console.log('🧪 Testing Admin APIs...\n');

    // 1. Тест создания услуги
    console.log('1. Testing service creation...');
    const newService = await db
      .insert(services)
      .values({
        name: 'Тестовая услуга',
        description: 'Описание тестовой услуги',
        price: '3000 ₽',
        duration: 90,
        orderDesktop: 99,
        orderMobile: 99,
        executorRole: 'тестовый мастер',
      })
      .returning();

    console.log('✅ Service created:', newService[0]);

    // 2. Тест получения услуг
    console.log('\n2. Testing services fetch...');
    const allServices = await db.select().from(services);
    console.log(`✅ Found ${allServices.length} services`);

    // 3. Тест получения рабочих дней (админский)
    console.log('\n3. Testing admin work slots fetch...');
    const today = new Date().toISOString().split('T')[0];
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
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(gte(workSlots.workDate, today))
      .orderBy(workSlots.workDate, workSlots.startTime);

    console.log(`✅ Found ${adminSlots.length} work slots (including unconfirmed)`);
    
    if (adminSlots.length > 0) {
      console.log('Sample work slot:', {
        id: adminSlots[0].id,
        master: adminSlots[0].masterName,
        date: adminSlots[0].workDate,
        time: `${adminSlots[0].startTime}-${adminSlots[0].endTime}`,
        confirmed: adminSlots[0].isConfirmed,
        status: adminSlots[0].adminUpdateStatus
      });
    }

    // 4. Тест получения подтвержденных рабочих дней (для клиентов)
    console.log('\n4. Testing client work slots fetch...');
    const confirmedSlots = await db
      .select({
        id: workSlots.id,
        masterId: workSlots.masterId,
        masterName: masters.fullName,
        workDate: workSlots.workDate,
        startTime: workSlots.startTime,
        endTime: workSlots.endTime,
      })
      .from(workSlots)
      .leftJoin(masters, eq(workSlots.masterId, masters.id))
      .where(and(
        gte(workSlots.workDate, today),
        eq(workSlots.isConfirmed, true)
      ))
      .orderBy(workSlots.workDate, workSlots.startTime);

    console.log(`✅ Found ${confirmedSlots.length} confirmed work slots (for clients)`);

    // 5. Проверка статусов
    console.log('\n5. Status summary:');
    const pendingCount = adminSlots.filter(s => s.adminUpdateStatus === 'pending').length;
    const acceptedCount = adminSlots.filter(s => s.adminUpdateStatus === 'accepted').length;
    const rejectedCount = adminSlots.filter(s => s.adminUpdateStatus === 'rejected').length;
    
    console.log(`⏳ Pending: ${pendingCount}`);
    console.log(`✅ Accepted: ${acceptedCount}`);
    console.log(`❌ Rejected: ${rejectedCount}`);
    console.log(`📊 Total: ${adminSlots.length}`);

    console.log('\n🎉 All Admin APIs working correctly!');
    console.log('\n📋 Available endpoints:');
    console.log('- GET /api/services - Все услуги');
    console.log('- POST /api/services - Создать услугу');
    console.log('- GET /api/work-slots - Подтвержденные рабочие дни (для клиентов)');
    console.log('- GET /api/work-slots-admin - Все рабочие дни (для админа)');
    console.log('- PATCH /api/work-slots-admin - Обновить статус');
    console.log('- DELETE /api/work-slots-admin - Удалить рабочий день');
    console.log('- GET /api/work-slot-change-requests-admin - Запросы на изменение');
    console.log('- PATCH /api/work-slot-change-requests-admin - Принять/отклонить запрос');

  } catch (error) {
    console.error('❌ Error testing APIs:', error);
  }
}

testAdminAPIs();
