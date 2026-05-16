import { db } from '../db/index-postgres';
import { admins } from '../db/schema';
import bcrypt from 'bcrypt';

async function resetAdminPasswords() {
  try {
    const hash = await bcrypt.hash('123', 10);
    const result = await db.update(admins).set({ passwordHash: hash });
    console.log('✅ All admin passwords reset to: 123');
    const all = await db.select({ username: admins.username, name: admins.name }).from(admins);
    all.forEach(a => console.log(`  ${a.username} / 123  (${a.name})`));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

resetAdminPasswords();
