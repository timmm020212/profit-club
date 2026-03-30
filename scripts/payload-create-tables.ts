import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTables() {
  const client = await pool.connect();
  try {
    console.log('Creating Payload CMS tables...');

    await client.query(`
      -- CMS Users collection (Payload auth)
      CREATE TABLE IF NOT EXISTS "cms-users" (
        "id" serial PRIMARY KEY,
        "name" varchar,
        "role" varchar DEFAULT 'editor',
        "email" varchar NOT NULL,
        "reset_password_token" varchar,
        "reset_password_expiration" timestamptz,
        "salt" varchar,
        "hash" varchar,
        "login_attempts" integer DEFAULT 0,
        "lock_until" timestamptz,
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "cms_users_email_idx" ON "cms-users" ("email");

      -- CMS Media collection
      CREATE TABLE IF NOT EXISTS "cms-media" (
        "id" serial PRIMARY KEY,
        "alt" varchar NOT NULL,
        "prefix" varchar DEFAULT 'cms-media',
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL,
        "url" varchar,
        "thumbnail_u_r_l" varchar,
        "filename" varchar,
        "mime_type" varchar,
        "filesize" integer,
        "width" integer,
        "height" integer,
        "focal_x" integer,
        "focal_y" integer
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "cms_media_filename_idx" ON "cms-media" ("filename");

      -- CMS Pages collection
      CREATE TABLE IF NOT EXISTS "cms-pages" (
        "id" serial PRIMARY KEY,
        "title" varchar NOT NULL,
        "slug" varchar NOT NULL,
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "cms_pages_slug_idx" ON "cms-pages" ("slug");

      -- Pages blocks
      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_hero" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages"("id") ON DELETE CASCADE,
        "_path" text NOT NULL,
        "heading" varchar NOT NULL,
        "subheading" varchar,
        "button_text" varchar,
        "button_link" varchar,
        "background_image_id" integer REFERENCES "cms-media"("id") ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_text_block" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages"("id") ON DELETE CASCADE,
        "_path" text NOT NULL,
        "heading" varchar,
        "content" jsonb
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_cards_section" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages"("id") ON DELETE CASCADE,
        "_path" text NOT NULL,
        "heading" varchar,
        "subheading" varchar
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_cards_section_cards" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages_blocks_cards_section"("id") ON DELETE CASCADE,
        "title" varchar NOT NULL,
        "description" text,
        "image_id" integer REFERENCES "cms-media"("id") ON DELETE SET NULL,
        "link" varchar
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_banner" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages"("id") ON DELETE CASCADE,
        "_path" text NOT NULL,
        "heading" varchar NOT NULL,
        "text" text,
        "button_text" varchar,
        "button_link" varchar,
        "image_id" integer REFERENCES "cms-media"("id") ON DELETE SET NULL,
        "style" varchar DEFAULT 'dark'
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_features" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages"("id") ON DELETE CASCADE,
        "_path" text NOT NULL,
        "heading" varchar
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_features_items" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages_blocks_features"("id") ON DELETE CASCADE,
        "icon" varchar,
        "title" varchar NOT NULL,
        "description" text
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_gallery" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages"("id") ON DELETE CASCADE,
        "_path" text NOT NULL,
        "heading" varchar
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_gallery_images" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages_blocks_gallery"("id") ON DELETE CASCADE,
        "image_id" integer NOT NULL REFERENCES "cms-media"("id") ON DELETE CASCADE,
        "caption" varchar
      );

      CREATE TABLE IF NOT EXISTS "cms-pages_blocks_contact_info" (
        "id" serial PRIMARY KEY,
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL REFERENCES "cms-pages"("id") ON DELETE CASCADE,
        "_path" text NOT NULL,
        "heading" varchar,
        "address" varchar,
        "phone" varchar,
        "email" varchar,
        "telegram" varchar,
        "instagram" varchar,
        "working_hours" varchar
      );

      -- Payload internal tables
      CREATE TABLE IF NOT EXISTS "payload_preferences" (
        "id" serial PRIMARY KEY,
        "key" varchar,
        "value" jsonb,
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
        "id" serial PRIMARY KEY,
        "order" integer,
        "parent_id" integer NOT NULL REFERENCES "payload_preferences"("id") ON DELETE CASCADE,
        "path" varchar NOT NULL,
        "cms_users_id" integer REFERENCES "cms-users"("id") ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
        "id" serial PRIMARY KEY,
        "global_slug" varchar,
        "updated_at" timestamptz DEFAULT now() NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
        "id" serial PRIMARY KEY,
        "order" integer,
        "parent_id" integer NOT NULL REFERENCES "payload_locked_documents"("id") ON DELETE CASCADE,
        "path" varchar NOT NULL,
        "cms_users_id" integer REFERENCES "cms-users"("id") ON DELETE CASCADE,
        "cms_media_id" integer REFERENCES "cms-media"("id") ON DELETE CASCADE,
        "cms_pages_id" integer REFERENCES "cms-pages"("id") ON DELETE CASCADE
      );
    `);

    console.log('All Payload CMS tables created successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();
