import { db } from '../db/index-postgres';
import { admins } from '../db/schema';
import bcrypt from 'bcrypt';

async function seedAdminsOnly() {
  try {
    console.log('👥 Adding administrators...');

    const adminPasswordHash = await bcrypt.hash('123', 10);

    const adminsData = [
      {
        username: 'natalia',
        passwordHash: adminPasswordHash,
        name: 'Наталья Глазова',
        isActive: true,
      },
      {
        username: 'anna',
        passwordHash: adminPasswordHash,
        name: 'Анна Немыкина',
        isActive: true,
      },
      {
        username: 'anastasia',
        passwordHash: adminPasswordHash,
        name: 'Анастасия Матвеева',
        isActive: true,
      },
    ];

    for (const adminData of adminsData) {
      await db.insert(admins).values(adminData).onConflictDoNothing();
      console.log(`✅ Admin added: ${adminData.name} (username: ${adminData.username}, password: 123)`);
    }

    console.log('🎉 Administrators seeding completed!');
    console.log('\n📋 Administrator accounts:');
    console.log('👤 Наталья Глазова - natalia / 123');
    console.log('👤 Анна Немыкина - anna / 123');
    console.log('👤 Анастасия Матвеева - anastasia / 123');
    console.log('👤 Существующий admin - admin / admin123');

  } catch (error) {
    console.error('❌ Error seeding admins:', error);
  }
}

seedAdminsOnly();
