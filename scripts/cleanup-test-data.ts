import { db } from '../db/index-postgres';
import { services, appointments, clients, workSlots } from '../db/schema';

async function cleanupTestData() {
  try {
    console.log('🧹 Cleaning up test data...');

    // Удаляем тестовые записи
    console.log('🗑️  Deleting appointments...');
    await db.delete(appointments);
    console.log('✅ Appointments deleted');

    // Удаляем тестовые рабочие слоты
    console.log('🗑️  Deleting work slots...');
    await db.delete(workSlots);
    console.log('✅ Work slots deleted');

    // Удаляем тестовых клиентов
    console.log('🗑️  Deleting clients...');
    await db.delete(clients);
    console.log('✅ Clients deleted');

    // Удаляем тестовые услуги
    console.log('🗑️  Deleting services...');
    await db.delete(services);
    console.log('✅ Services deleted');

    console.log('🎉 Test data cleanup completed!');
    console.log('\n📋 What remains:');
    console.log('👥 Administrators: 4 admins');
    console.log('👨‍💼 Masters: 3 masters (ready for work)');
    console.log('📝 Services: 0 (add via admin panel)');
    console.log('📅 Work slots: 0 (add via admin panel)');
    console.log('👥 Clients: 0 (will register on site)');
    console.log('📋 Appointments: 0 (clients will book)');

  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
}

cleanupTestData();
