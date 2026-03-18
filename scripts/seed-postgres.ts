import { db } from '../db/index-postgres';
import { services } from '../db/schema';

async function seedDatabase() {
  try {
    console.log('Seeding PostgreSQL database...');

    // Добавляем услуги
    const servicesData = [
      {
        name: "Стрижка женская",
        description: "Профессиональная стрижка женских волос с учетом ваших пожеланий и типа лица",
        price: "2500 ₽",
        duration: 60,
        imageUrl: null,
        orderDesktop: 1,
        orderMobile: 1,
        badgeText: null,
        badgeType: null,
        executorRole: "парикмахер",
        category: "Парикмахерские услуги"
      },
      {
        name: "Маникюр классический",
        description: "Классический маникюр с покрытием гель-лаком",
        price: "1500 ₽",
        duration: 90,
        imageUrl: null,
        orderDesktop: 2,
        orderMobile: 2,
        badgeText: null,
        badgeType: null,
        executorRole: "мастер ногтевого сервиса",
        category: "Ногтевой сервис"
      },
      {
        name: "Массаж спины",
        description: "Расслабляющий массаж спины для снятия напряжения и улучшения кровообращения",
        price: "2000 ₽",
        duration: 45,
        imageUrl: null,
        orderDesktop: 3,
        orderMobile: 3,
        badgeText: null,
        badgeType: null,
        executorRole: "массажист",
        category: "Массаж"
      }
    ];

    for (const serviceData of servicesData) {
      await db.insert(services).values(serviceData);
      console.log(`Added service: ${serviceData.name}`);
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

seedDatabase();
