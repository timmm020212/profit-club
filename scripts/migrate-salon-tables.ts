import { db } from '../db/index-postgres';
import { sql } from 'drizzle-orm';

async function migrate() {
  try {
    console.log('Running migration: add salon_id to existing tables and create salons/partner_users...');

    // Add salon_id to serviceCategories
    await db.execute(sql`
      ALTER TABLE "serviceCategories" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;
    `);
    console.log('✓ serviceCategories.salon_id');

    // Add salon_id to serviceSubgroups
    await db.execute(sql`
      ALTER TABLE "serviceSubgroups" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;
    `);
    console.log('✓ serviceSubgroups.salon_id');

    // Add salon_id to services
    await db.execute(sql`
      ALTER TABLE services ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;
    `);
    console.log('✓ services.salon_id');

    // Add salon_id to serviceVariants
    await db.execute(sql`
      ALTER TABLE "serviceVariants" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;
    `);
    console.log('✓ serviceVariants.salon_id');

    // Add salon_id to masters
    await db.execute(sql`
      ALTER TABLE masters ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;
    `);
    console.log('✓ masters.salon_id');

    // Add salon_id to appointments
    await db.execute(sql`
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;
    `);
    console.log('✓ appointments.salon_id');

    // Add salon_id to workSlots
    await db.execute(sql`
      ALTER TABLE "workSlots" ADD COLUMN IF NOT EXISTS salon_id integer DEFAULT 1;
    `);
    console.log('✓ workSlots.salon_id');

    // Create salons table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS salons (
        id serial PRIMARY KEY,
        slug varchar(100) NOT NULL UNIQUE,
        name varchar(200) NOT NULL,
        description text,
        city varchar(100),
        address text,
        phone varchar(30),
        logo_url text,
        owner_name varchar(200),
        inn varchar(20),
        tariff varchar(20) NOT NULL DEFAULT 'basic',
        is_active boolean NOT NULL DEFAULT false,
        invite_token varchar(100) UNIQUE,
        created_at timestamp DEFAULT now()
      );
    `);
    console.log('✓ salons table created');

    // Create partner_users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS partner_users (
        id serial PRIMARY KEY,
        salon_id integer NOT NULL REFERENCES salons(id),
        email varchar(200) NOT NULL UNIQUE,
        password_hash varchar(200) NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);
    console.log('✓ partner_users table created');

    console.log('\n✅ Migration complete!');
  } catch (e) {
    console.error('❌ Migration error:', e);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
