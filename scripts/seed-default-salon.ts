import { db } from '../db/index-postgres';
import { salons, partnerUsers } from '../db/schema';
import bcrypt from 'bcrypt';

async function seedDefaultSalon() {
  try {
    const existing = await db.select().from(salons).limit(1);
    if (existing.length > 0) {
      console.log('ℹ️  Salon already exists, skipping');
      process.exit(0);
    }

    await db.insert(salons).values({
      slug: 'profit-club',
      name: 'Profit Club',
      city: 'Москва',
      ownerName: 'Администратор',
      tariff: 'pro',
      isActive: true,
    });

    const hash = await bcrypt.hash('admin123', 10);
    await db.insert(partnerUsers).values({
      salonId: 1,
      email: 'admin@profit-club.ru',
      passwordHash: hash,
    });

    console.log('✅ Default salon created: profit-club');
    console.log('   Login: admin@profit-club.ru / admin123');
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    process.exit(0);
  }
}

seedDefaultSalon();
