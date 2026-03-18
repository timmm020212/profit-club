import { db } from '../db/index-postgres';
import { services, masters, admins, workSlots, appointments, clients } from '../db/schema';
import { NewMaster, NewWorkSlot, NewClient, NewAppointment } from '../db/schema';
import bcrypt from 'bcrypt';

async function seedFullDatabase() {
  try {
    console.log('🌱 Starting full database seeding...');

    // 1. Добавляем администратора
    console.log('👤 Adding admin...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await db.insert(admins).values({
      username: 'admin',
      passwordHash: adminPasswordHash,
      name: 'Администратор',
      isActive: true,
    }).onConflictDoNothing();
    console.log('✅ Admin added (username: admin, password: admin123)');

    // 2. Добавляем мастеров
    console.log('👨‍💼 Adding masters...');
    const mastersData: NewMaster[] = [
      {
        fullName: 'Анна Петрова',
        specialization: 'парикмахер',
        phone: '+7(999)123-45-67',
        staffPassword: 'master123',
        isActive: true,
      },
      {
        fullName: 'Мария Иванова',
        specialization: 'мастер ногтевого сервиса',
        phone: '+7(999)234-56-78',
        staffPassword: 'nails123',
        isActive: true,
      },
      {
        fullName: 'Елена Смирнова',
        specialization: 'массажист',
        phone: '+7(999)345-67-89',
        staffPassword: 'massage123',
        isActive: true,
      },
    ];

    const insertedMasters = await db.insert(masters).values(mastersData).returning();
    console.log(`✅ Added ${insertedMasters.length} masters`);

    // 3. Добавляем рабочие слоты на ближайшие 7 дней
    console.log('📅 Adding work slots...');
    const today = new Date();
    const workSlotsData: NewWorkSlot[] = [];

    for (let i = 0; i < 7; i++) {
      const workDate = new Date(today);
      workDate.setDate(today.getDate() + i);
      const dateStr = workDate.toISOString().split('T')[0]; // YYYY-MM-DD

      // Добавляем рабочие дни для каждого мастера
      insertedMasters.forEach((master, index) => {
        // Разное время для разных мастеров
        const startTime = index === 0 ? '09:00' : index === 1 ? '10:00' : '11:00';
        const endTime = index === 0 ? '18:00' : index === 1 ? '19:00' : '20:00';

        workSlotsData.push({
          masterId: master.id,
          workDate: dateStr,
          startTime,
          endTime,
          createdBy: 'admin',
          isConfirmed: true,
          adminUpdateStatus: 'accepted',
        });
      });
    }

    await db.insert(workSlots).values(workSlotsData);
    console.log(`✅ Added ${workSlotsData.length} work slots`);

    // 4. Добавляем тестовых клиентов
    console.log('👥 Adding test clients...');
    const clientsData: NewClient[] = [
      {
        name: 'Ольга Кузнецова',
        phone: '+7(999)456-78-90',
        email: 'olga@example.com',
        telegramId: '123456789',
        isVerified: true,
        verifiedAt: new Date(),
      },
      {
        name: 'Ирина Новикова',
        phone: '+7(999)567-89-01',
        email: 'irina@example.com',
        telegramId: '987654321',
        isVerified: true,
        verifiedAt: new Date(),
      },
    ];

    const insertedClients = await db.insert(clients).values(clientsData).returning();
    console.log(`✅ Added ${insertedClients.length} clients`);

    // 5. Добавляем тестовые записи
    console.log('📋 Adding test appointments...');
    const appointmentsData: NewAppointment[] = [
      {
        masterId: insertedMasters[0].id, // Анна (парикмахер)
        serviceId: 1, // Стрижка женская
        appointmentDate: today.toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00',
        clientName: insertedClients[0].name,
        clientPhone: insertedClients[0].phone,
        clientTelegramId: insertedClients[0].telegramId,
        status: 'confirmed',
      },
      {
        masterId: insertedMasters[1].id, // Мария (мастер ногтевого сервиса)
        serviceId: 2, // Маникюр классический
        appointmentDate: today.toISOString().split('T')[0],
        startTime: '16:00',
        endTime: '17:30',
        clientName: insertedClients[1].name,
        clientPhone: insertedClients[1].phone,
        clientTelegramId: insertedClients[1].telegramId,
        status: 'confirmed',
      },
    ];

    await db.insert(appointments).values(appointmentsData);
    console.log(`✅ Added ${appointmentsData.length} appointments`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log('👤 Admin: admin / admin123');
    console.log(`👨‍💼 Masters: ${insertedMasters.length} added`);
    console.log(`📅 Work slots: ${workSlotsData.length} added`);
    console.log(`👥 Clients: ${insertedClients.length} added`);
    console.log(`📋 Appointments: ${appointmentsData.length} added`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

seedFullDatabase();
