# Services Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure services into categories → subgroups → services → variants hierarchy, populate with all profit-club.ru data, update booking flow UI.

**Architecture:** 3 new tables (serviceCategories, serviceSubgroups, serviceVariants), new field on services (subgroupId) and appointments (variantId). Seed script populates all data. Services API returns nested structure. Client UI gets category tabs, subgroup sections, variant modal.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Drizzle ORM, PostgreSQL.

---

### Task 1: Schema Changes

**Files:**
- Modify: `db/schema-postgres.ts`

- [ ] **Step 1: Add new tables and fields**

Add to `db/schema-postgres.ts` BEFORE the services table:

```typescript
export const serviceCategories = pgTable("serviceCategories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 10 }),
  order: integer("order").notNull().default(0),
  isActive: boolean("isActive").default(true).notNull(),
});

export const serviceSubgroups = pgTable("serviceSubgroups", {
  id: serial("id").primaryKey(),
  categoryId: integer("categoryId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  order: integer("order").notNull().default(0),
});
```

Add `subgroupId` field to `services` table:

```typescript
  subgroupId: integer("subgroup_id"),
```

Add after the services table:

```typescript
export const serviceVariants = pgTable("serviceVariants", {
  id: serial("id").primaryKey(),
  serviceId: integer("serviceId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  price: integer("price").notNull(),
  duration: integer("duration").notNull(),
  order: integer("order").notNull().default(0),
});
```

Add `variantId` to `appointments` table:

```typescript
  variantId: integer("variantId"),
```

- [ ] **Step 2: Apply via SQL**

```sql
CREATE TABLE IF NOT EXISTS "serviceCategories" (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  icon varchar(10),
  "order" integer NOT NULL DEFAULT 0,
  "isActive" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS "serviceSubgroups" (
  id serial PRIMARY KEY,
  "categoryId" integer NOT NULL,
  name varchar(100) NOT NULL,
  "order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "serviceVariants" (
  id serial PRIMARY KEY,
  "serviceId" integer NOT NULL,
  name varchar(100) NOT NULL,
  price integer NOT NULL,
  duration integer NOT NULL,
  "order" integer NOT NULL DEFAULT 0
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS subgroup_id integer;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "variantId" integer;

GRANT ALL ON "serviceCategories" TO appuser;
GRANT ALL ON "serviceSubgroups" TO appuser;
GRANT ALL ON "serviceVariants" TO appuser;
GRANT USAGE, SELECT ON SEQUENCE "serviceCategories_id_seq" TO appuser;
GRANT USAGE, SELECT ON SEQUENCE "serviceSubgroups_id_seq" TO appuser;
GRANT USAGE, SELECT ON SEQUENCE "serviceVariants_id_seq" TO appuser;
```

- [ ] **Step 3: Commit**

```bash
git add db/schema-postgres.ts
git commit -m "feat: add serviceCategories, serviceSubgroups, serviceVariants tables"
```

---

### Task 2: Seed Script — All Services Data

**Files:**
- Create: `db/seed-all-services.ts`

This is the big one — contains ALL services from profit-club.ru organized into categories, subgroups, services, and variants.

- [ ] **Step 1: Create the seed script**

Create `db/seed-all-services.ts` — a comprehensive seed script. Due to the massive amount of data (200+ services), the script uses structured arrays.

```typescript
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index-postgres";
import { serviceCategories, serviceSubgroups, services, serviceVariants } from "./schema-postgres";

async function seed() {
  console.log("Seeding categories...");

  // Categories
  const cats = await db.insert(serviceCategories).values([
    { name: "Парикмахерские услуги", icon: "💇", order: 1 },
    { name: "Мужской зал", icon: "💈", order: 2 },
    { name: "Визаж", icon: "💄", order: 3 },
    { name: "Маникюр и педикюр", icon: "💅", order: 4 },
    { name: "Косметология", icon: "✨", order: 5 },
    { name: "Уход за телом и депиляция", icon: "💆", order: 6 },
  ]).returning();

  const catMap: Record<string, number> = {};
  for (const c of cats) catMap[c.name] = c.id;

  console.log("Seeding subgroups...");

  // Subgroups
  const subgroupsData = [
    // Парикмахерские
    { categoryName: "Парикмахерские услуги", name: "Стрижки", order: 1 },
    { categoryName: "Парикмахерские услуги", name: "Укладки", order: 2 },
    { categoryName: "Парикмахерские услуги", name: "Вечерние и свадебные причёски", order: 3 },
    { categoryName: "Парикмахерские услуги", name: "Окрашивание", order: 4 },
    { categoryName: "Парикмахерские услуги", name: "Мелирование", order: 5 },
    { categoryName: "Парикмахерские услуги", name: "Сложное окрашивание", order: 6 },
    { categoryName: "Парикмахерские услуги", name: "Блондирование", order: 7 },
    { categoryName: "Парикмахерские услуги", name: "Аиртач", order: 8 },
    { categoryName: "Парикмахерские услуги", name: "Смывка", order: 9 },
    { categoryName: "Парикмахерские услуги", name: "Плетение и ламинирование", order: 10 },
    { categoryName: "Парикмахерские услуги", name: "Уходы для волос", order: 11 },
    // Мужской зал
    { categoryName: "Мужской зал", name: "Стрижки и укладки", order: 1 },
    { categoryName: "Мужской зал", name: "Борода", order: 2 },
    { categoryName: "Мужской зал", name: "Окрашивание и тонирование", order: 3 },
    // Визаж
    { categoryName: "Визаж", name: "Макияж", order: 1 },
    { categoryName: "Визаж", name: "Брови и ресницы", order: 2 },
    { categoryName: "Визаж", name: "Перманентный макияж", order: 3 },
    // Маникюр и педикюр
    { categoryName: "Маникюр и педикюр", name: "Маникюр", order: 1 },
    { categoryName: "Маникюр и педикюр", name: "Педикюр", order: 2 },
    // Косметология
    { categoryName: "Косметология", name: "Аппаратная косметология", order: 1 },
    { categoryName: "Косметология", name: "Инъекции и контурная пластика", order: 2 },
    { categoryName: "Косметология", name: "Мезотерапия", order: 3 },
    { categoryName: "Косметология", name: "Чистки и пилинги", order: 4 },
    { categoryName: "Косметология", name: "PRP-терапия", order: 5 },
    // Уход за телом
    { categoryName: "Уход за телом и депиляция", name: "Массаж", order: 1 },
    { categoryName: "Уход за телом и депиляция", name: "Обертывания и SPA", order: 2 },
    { categoryName: "Уход за телом и депиляция", name: "Восковая депиляция", order: 3 },
    { categoryName: "Уход за телом и депиляция", name: "Полимерная депиляция", order: 4 },
    { categoryName: "Уход за телом и депиляция", name: "Лазерная эпиляция", order: 5 },
  ];

  const subs = await db.insert(serviceSubgroups).values(
    subgroupsData.map((s) => ({ categoryId: catMap[s.categoryName], name: s.name, order: s.order }))
  ).returning();

  const subMap: Record<string, number> = {};
  for (const s of subs) subMap[s.name] = s.id;

  console.log("Seeding services and variants...");

  // Helper: create service with variants
  async function addService(subgroupName: string, name: string, role: string, variants: { name: string; price: number; duration: number }[], order: number) {
    const [svc] = await db.insert(services).values({
      name,
      description: "",
      price: variants.length === 1 ? String(variants[0].price) : `от ${Math.min(...variants.map(v => v.price))}`,
      duration: variants.length === 1 ? variants[0].duration : variants[0].duration,
      executorRole: role,
      subgroupId: subMap[subgroupName],
      orderDesktop: order,
      orderMobile: order,
    }).returning();

    if (variants.length > 1) {
      await db.insert(serviceVariants).values(
        variants.map((v, i) => ({ serviceId: svc.id, name: v.name, price: v.price, duration: v.duration, order: i + 1 }))
      );
    }
    return svc;
  }

  // ═══════════════════════════════════════════
  // ПАРИКМАХЕРСКИЕ УСЛУГИ
  // ═══════════════════════════════════════════

  // Стрижки
  await addService("Стрижки", "Стрижка женская", "парикмахер", [
    { name: "Короткие волосы", price: 3300, duration: 60 },
    { name: "Длинные волосы", price: 4300, duration: 90 },
  ], 1);
  await addService("Стрижки", "Стрижка чёлки", "парикмахер", [{ name: "", price: 1500, duration: 20 }], 2);
  await addService("Стрижки", "Детская стрижка", "парикмахер", [{ name: "", price: 1500, duration: 30 }], 3);
  await addService("Стрижки", "Подростковая стрижка", "парикмахер", [
    { name: "Простая", price: 2000, duration: 40 },
    { name: "Сложная", price: 3000, duration: 60 },
  ], 4);

  // Укладки
  await addService("Укладки", "Укладка", "парикмахер", [
    { name: "Короткие волосы", price: 2500, duration: 40 },
    { name: "Средние волосы", price: 3200, duration: 50 },
    { name: "Длинные волосы", price: 4200, duration: 60 },
  ], 1);

  // Вечерние и свадебные
  await addService("Вечерние и свадебные причёски", "Причёска вечерняя", "парикмахер", [
    { name: "Короткие волосы", price: 4000, duration: 60 },
    { name: "Длинные волосы", price: 5000, duration: 90 },
  ], 1);
  await addService("Вечерние и свадебные причёски", "Причёска свадебная", "парикмахер", [
    { name: "Короткие волосы", price: 6800, duration: 90 },
    { name: "Длинные волосы", price: 8000, duration: 120 },
  ], 2);

  // Окрашивание
  await addService("Окрашивание", "Окрашивание корней", "парикмахер", [{ name: "", price: 3200, duration: 60 }], 1);
  await addService("Окрашивание", "Окрашивание в один тон", "парикмахер", [
    { name: "Короткие", price: 5300, duration: 90 },
    { name: "Средние", price: 6500, duration: 120 },
    { name: "Длинные", price: 10000, duration: 150 },
  ], 2);

  // Мелирование
  await addService("Мелирование", "Мелирование на фольгу", "парикмахер", [
    { name: "Короткие", price: 7200, duration: 120 },
    { name: "Средние", price: 8800, duration: 150 },
    { name: "Длинные", price: 11000, duration: 180 },
  ], 1);

  // Сложное окрашивание
  await addService("Сложное окрашивание", "Шатуш / Балаяж", "парикмахер", [
    { name: "Короткие", price: 14000, duration: 180 },
    { name: "Средние", price: 16000, duration: 210 },
    { name: "Длинные", price: 18000, duration: 240 },
  ], 1);

  // Блондирование
  await addService("Блондирование", "Блондирование", "парикмахер", [
    { name: "Корни", price: 2500, duration: 60 },
    { name: "Короткие", price: 3000, duration: 90 },
    { name: "Средние", price: 4500, duration: 120 },
    { name: "Длинные", price: 6000, duration: 150 },
  ], 1);

  // Аиртач
  await addService("Аиртач", "Аиртач + тонирование", "парикмахер", [
    { name: "Короткие (контуринг)", price: 8000, duration: 150 },
    { name: "Средние (контуринг)", price: 10000, duration: 180 },
    { name: "Средние", price: 16000, duration: 240 },
    { name: "Длинные", price: 20000, duration: 270 },
    { name: "Очень длинные", price: 25000, duration: 300 },
  ], 1);

  // Смывка
  await addService("Смывка", "Смывка", "парикмахер", [
    { name: "Короткие", price: 10000, duration: 180 },
    { name: "Средние", price: 14000, duration: 210 },
    { name: "Длинные", price: 18000, duration: 240 },
  ], 1);

  // Плетение и ламинирование
  await addService("Плетение и ламинирование", "Плетение кос / хвост", "парикмахер", [{ name: "", price: 2000, duration: 30 }], 1);
  await addService("Плетение и ламинирование", "Ламинирование", "парикмахер", [
    { name: "Короткие", price: 4000, duration: 60 },
    { name: "Средние", price: 4700, duration: 75 },
    { name: "Длинные", price: 5300, duration: 90 },
  ], 2);

  // Уходы
  await addService("Уходы для волос", "Уход Davines", "парикмахер", [
    { name: "Базовый", price: 1000, duration: 20 },
    { name: "Премиум", price: 3500, duration: 40 },
  ], 1);
  await addService("Уходы для волос", "Уход К18", "парикмахер", [
    { name: "Короткие", price: 1500, duration: 20 },
    { name: "Длинные", price: 2500, duration: 30 },
  ], 2);
  await addService("Уходы для волос", "Сушка по форме", "парикмахер", [{ name: "", price: 1000, duration: 20 }], 3);

  // ═══════════════════════════════════════════
  // МУЖСКОЙ ЗАЛ
  // ═══════════════════════════════════════════

  await addService("Стрижки и укладки", "Стрижка мужская", "барбер", [{ name: "", price: 2800, duration: 45 }], 1);
  await addService("Стрижки и укладки", "Мужская укладка", "барбер", [{ name: "", price: 950, duration: 15 }], 2);
  await addService("Стрижки и укладки", "Мужская окантовка", "барбер", [{ name: "", price: 600, duration: 15 }], 3);
  await addService("Стрижки и укладки", "Премиальное бритье", "барбер", [{ name: "", price: 1000, duration: 30 }], 4);

  await addService("Борода", "Моделирование бороды", "барбер", [{ name: "", price: 800, duration: 20 }], 1);
  await addService("Борода", "Тонирование бороды", "барбер", [{ name: "", price: 800, duration: 20 }], 2);
  await addService("Борода", "Камуфляж седины", "барбер", [{ name: "", price: 1000, duration: 30 }], 3);

  await addService("Окрашивание и тонирование", "Мужское тонирование", "барбер", [{ name: "", price: 2000, duration: 40 }], 1);
  await addService("Окрашивание и тонирование", "Окрашивание корней (муж)", "барбер", [{ name: "", price: 3200, duration: 60 }], 2);

  // ═══════════════════════════════════════════
  // ВИЗАЖ
  // ═══════════════════════════════════════════

  await addService("Макияж", "Макияж дневной", "визажист", [{ name: "", price: 2500, duration: 45 }], 1);
  await addService("Макияж", "Макияж вечерний", "визажист", [{ name: "", price: 3000, duration: 60 }], 2);
  await addService("Макияж", "Макияж свадебный", "визажист", [{ name: "", price: 3200, duration: 60 }], 3);
  await addService("Макияж", "Экспресс макияж", "визажист", [{ name: "", price: 1300, duration: 20 }], 4);

  await addService("Брови и ресницы", "Окрашивание бровей", "визажист", [{ name: "", price: 400, duration: 15 }], 1);
  await addService("Брови и ресницы", "Окрашивание ресниц", "визажист", [{ name: "", price: 400, duration: 15 }], 2);
  await addService("Брови и ресницы", "Коррекция формы бровей", "визажист", [{ name: "", price: 700, duration: 20 }], 3);
  await addService("Брови и ресницы", "Кератинирование ресниц", "визажист", [{ name: "", price: 3000, duration: 60 }], 4);
  await addService("Брови и ресницы", "Кератинирование бровей", "визажист", [{ name: "", price: 2000, duration: 45 }], 5);

  await addService("Перманентный макияж", "Перманентный макияж губ", "визажист", [{ name: "", price: 8000, duration: 120 }], 1);
  await addService("Перманентный макияж", "Перманентный макияж бровей", "визажист", [{ name: "", price: 8000, duration: 120 }], 2);
  await addService("Перманентный макияж", "Межресничный татуаж", "визажист", [{ name: "", price: 7000, duration: 90 }], 3);

  // ═══════════════════════════════════════════
  // МАНИКЮР И ПЕДИКЮР
  // ═══════════════════════════════════════════

  await addService("Маникюр", "Маникюр + покрытие гель-лак", "маникюр", [{ name: "", price: 3200, duration: 90 }], 1);
  await addService("Маникюр", "Маникюр + коррекция ногтей", "маникюр", [{ name: "", price: 3950, duration: 120 }], 2);
  await addService("Маникюр", "Пилочный маникюр", "маникюр", [{ name: "", price: 1950, duration: 60 }], 3);
  await addService("Маникюр", "Мужской маникюр", "маникюр", [{ name: "", price: 1850, duration: 60 }], 4);
  await addService("Маникюр", "Маникюр без покрытия", "маникюр", [{ name: "", price: 1650, duration: 45 }], 5);
  await addService("Маникюр", "Маникюр + наращивание", "маникюр", [
    { name: "Стандарт", price: 4650, duration: 150 },
    { name: "Сложное", price: 5650, duration: 180 },
  ], 6);
  await addService("Маникюр", "Снятие гель-лака", "маникюр", [{ name: "", price: 1100, duration: 30 }], 7);

  await addService("Педикюр", "Педикюр", "маникюр", [{ name: "", price: 3000, duration: 90 }], 1);
  await addService("Педикюр", "Педикюр с покрытием гель-лак", "маникюр", [{ name: "", price: 4150, duration: 120 }], 2);
  await addService("Педикюр", "Педикюр мужской", "маникюр", [{ name: "", price: 3300, duration: 90 }], 3);

  // ═══════════════════════════════════════════
  // КОСМЕТОЛОГИЯ
  // ═══════════════════════════════════════════

  await addService("Аппаратная косметология", "LPG массаж (тело)", "косметолог", [
    { name: "1 процедура", price: 5000, duration: 50 },
    { name: "Абонемент 6 процедур", price: 30000, duration: 50 },
    { name: "Абонемент 10 процедур", price: 50000, duration: 50 },
  ], 1);
  await addService("Аппаратная косметология", "LPG массаж (лицо)", "косметолог", [
    { name: "Лицо", price: 3200, duration: 30 },
    { name: "Лицо + шея + декольте", price: 4200, duration: 30 },
    { name: "Лицо + уход", price: 5500, duration: 45 },
  ], 2);
  await addService("Аппаратная косметология", "MediSculpt", "косметолог", [
    { name: "1 зона", price: 4000, duration: 30 },
    { name: "2 зоны", price: 7000, duration: 45 },
  ], 3);
  await addService("Аппаратная косметология", "Geneo комплекс", "косметолог", [{ name: "", price: 8800, duration: 60 }], 4);
  await addService("Аппаратная косметология", "LED-терапия", "косметолог", [
    { name: "Лицо", price: 4500, duration: 40 },
    { name: "Лицо и шея", price: 5000, duration: 40 },
    { name: "Лицо, шея, декольте", price: 5500, duration: 40 },
  ], 5);
  await addService("Аппаратная косметология", "Криолиполиз", "косметолог", [
    { name: "Подбородок", price: 16000, duration: 60 },
    { name: "1 насадка", price: 19000, duration: 60 },
    { name: "1 большая насадка", price: 22000, duration: 60 },
    { name: "2 насадки", price: 33000, duration: 90 },
  ], 6);
  await addService("Аппаратная косметология", "Endosphere", "косметолог", [
    { name: "1 процедура", price: 6000, duration: 75 },
  ], 7);
  await addService("Аппаратная косметология", "IPL Lumenis M22", "косметолог", [
    { name: "До 150 импульсов", price: 10250, duration: 30 },
    { name: "150–300 импульсов", price: 14150, duration: 45 },
  ], 8);
  await addService("Аппаратная косметология", "Лазерное омоложение Resur FX", "косметолог", [
    { name: "Лицо", price: 20200, duration: 45 },
    { name: "Лицо + шея", price: 25200, duration: 60 },
    { name: "Лицо + шея + декольте", price: 30200, duration: 75 },
  ], 9);

  await addService("Инъекции и контурная пластика", "Ботулинотерапия Диспорт", "косметолог", [{ name: "1 ед.", price: 140, duration: 30 }], 1);
  await addService("Инъекции и контурная пластика", "Ботулинотерапия Ботокс", "косметолог", [{ name: "1 ед.", price: 380, duration: 30 }], 2);
  await addService("Инъекции и контурная пластика", "Релатокс", "косметолог", [{ name: "50 ед.", price: 15000, duration: 30 }], 3);
  await addService("Инъекции и контурная пластика", "Контурная пластика Sculptra", "косметолог", [{ name: "", price: 42000, duration: 60 }], 4);
  await addService("Инъекции и контурная пластика", "Профайло", "косметолог", [{ name: "", price: 21400, duration: 45 }], 5);

  await addService("Мезотерапия", "Мезотерапия лица", "косметолог", [{ name: "", price: 4500, duration: 30 }], 1);
  await addService("Мезотерапия", "Mesoeye", "косметолог", [{ name: "", price: 15200, duration: 30 }], 2);
  await addService("Мезотерапия", "Mesosculpt", "косметолог", [{ name: "", price: 10200, duration: 30 }], 3);
  await addService("Мезотерапия", "Курасен", "косметолог", [{ name: "1 ампула", price: 8200, duration: 30 }], 4);

  await addService("Чистки и пилинги", "Ультразвуковая чистка лица", "косметолог", [{ name: "", price: 1500, duration: 30 }], 1);
  await addService("Чистки и пилинги", "Косметическая чистка лица", "косметолог", [{ name: "", price: 4500, duration: 60 }], 2);
  await addService("Чистки и пилинги", "Уходовая процедура EGIA", "косметолог", [{ name: "", price: 5750, duration: 60 }], 3);
  await addService("Чистки и пилинги", "Пилинг Harmony", "косметолог", [
    { name: "Пилинг Золушки", price: 7500, duration: 45 },
    { name: "Isecret", price: 7600, duration: 45 },
    { name: "BIOR", price: 6500, duration: 45 },
    { name: "MELP", price: 8600, duration: 45 },
  ], 4);

  await addService("PRP-терапия", "Regenlab PRP", "косметолог", [
    { name: "Синяя пробирка", price: 9000, duration: 30 },
    { name: "ACR Plus (клеточное омоложение)", price: 41450, duration: 60 },
  ], 1);

  // ═══════════════════════════════════════════
  // УХОД ЗА ТЕЛОМ И ДЕПИЛЯЦИЯ
  // ═══════════════════════════════════════════

  await addService("Массаж", "Массаж женский", "массажист", [
    { name: "30 мин", price: 1500, duration: 30 },
    { name: "60 мин", price: 2500, duration: 60 },
    { name: "Всё тело 90 мин", price: 3500, duration: 90 },
  ], 1);
  await addService("Массаж", "Массаж мужской", "массажист", [
    { name: "30 мин", price: 2000, duration: 30 },
    { name: "60 мин", price: 3000, duration: 60 },
    { name: "Всё тело 90 мин", price: 4000, duration: 90 },
  ], 2);
  await addService("Массаж", "Массаж детский", "массажист", [
    { name: "30 мин", price: 1500, duration: 30 },
    { name: "60 мин", price: 2000, duration: 60 },
  ], 3);
  await addService("Массаж", "Стоун терапия", "массажист", [{ name: "", price: 3500, duration: 90 }], 4);

  await addService("Обертывания и SPA", "Обертывание водорослями", "массажист", [{ name: "", price: 4200, duration: 60 }], 1);
  await addService("Обертывания и SPA", "Обертывание T-Shock", "массажист", [{ name: "", price: 3100, duration: 45 }], 2);
  await addService("Обертывания и SPA", "Пилинг тела", "массажист", [{ name: "", price: 1800, duration: 30 }], 3);
  await addService("Обертывания и SPA", "Кедровая бочка", "массажист", [{ name: "", price: 500, duration: 20 }], 4);

  await addService("Восковая депиляция", "Восковая депиляция голени", "депиляция", [{ name: "", price: 1200, duration: 30 }], 1);
  await addService("Восковая депиляция", "Восковая депиляция бедра", "депиляция", [{ name: "", price: 1350, duration: 30 }], 2);
  await addService("Восковая депиляция", "Восковая депиляция подмышки", "депиляция", [{ name: "", price: 500, duration: 15 }], 3);

  await addService("Полимерная депиляция", "Полимерная депиляция бикини", "депиляция", [
    { name: "Классика", price: 1800, duration: 30 },
    { name: "Глубокое", price: 2500, duration: 45 },
  ], 1);
  await addService("Полимерная депиляция", "Полимерная депиляция голени", "депиляция", [{ name: "", price: 2500, duration: 30 }], 2);
  await addService("Полимерная депиляция", "Полимерная депиляция подмышки", "депиляция", [{ name: "", price: 1000, duration: 20 }], 3);

  await addService("Лазерная эпиляция", "Лазерная эпиляция бикини", "депиляция", [
    { name: "Классика", price: 4400, duration: 30 },
    { name: "Глубокое", price: 4800, duration: 45 },
  ], 1);
  await addService("Лазерная эпиляция", "Лазерная эпиляция ноги", "депиляция", [
    { name: "Голени", price: 4400, duration: 30 },
    { name: "Голени + бёдра", price: 7500, duration: 60 },
  ], 2);
  await addService("Лазерная эпиляция", "Лазерная эпиляция подмышки", "депиляция", [{ name: "", price: 3800, duration: 20 }], 3);
  await addService("Лазерная эпиляция", "Комплекс лазерной эпиляции", "депиляция", [
    { name: "Бикини глубокое + подмышки", price: 7000, duration: 45 },
    { name: "Бикини + подмышки + голени", price: 11000, duration: 75 },
    { name: "Бикини + подмышки + голени + бёдра", price: 14000, duration: 90 },
  ], 4);

  console.log("✅ All services seeded successfully!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add script to package.json**

Add to `scripts` in `package.json`:

```json
"db:seed-all": "tsx db/seed-all-services.ts"
```

- [ ] **Step 3: Commit**

```bash
git add db/seed-all-services.ts package.json
git commit -m "feat: add comprehensive services seed script with all profit-club.ru data"
```

---

### Task 3: Update Services API

**Files:**
- Modify: `app/api/services/route.ts`

- [ ] **Step 1: Return nested structure**

In `app/api/services/route.ts`, modify the GET handler to return categories → subgroups → services → variants. Read the file first and replace the GET handler. The response should be:

```json
{
  "categories": [
    {
      "id": 1, "name": "Парикмахерские услуги", "icon": "💇",
      "subgroups": [
        {
          "id": 1, "name": "Стрижки",
          "services": [
            {
              "id": 1, "name": "Стрижка женская", "price": "от 3300",
              "variants": [
                { "id": 1, "name": "Короткие волосы", "price": 3300, "duration": 60 },
                { "id": 2, "name": "Длинные волосы", "price": 4300, "duration": 90 }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Add imports for new tables and build the nested response.

- [ ] **Step 2: Commit**

```bash
git add app/api/services/route.ts
git commit -m "feat: services API returns nested categories/subgroups/variants"
```

---

### Task 4: Update Appointments API

**Files:**
- Modify: `app/api/appointments/route.ts`
- Modify: `app/api/available-slots/route.ts`

- [ ] **Step 1: Accept variantId in appointments**

In the POST handler, accept `variantId` from body. If provided, look up the variant to get price and duration. Use variant duration for the time calculation if set.

- [ ] **Step 2: Use variant duration in available-slots**

In `app/api/available-slots/route.ts`, if `variantId` query param is provided, use its duration instead of the service duration.

- [ ] **Step 3: Commit**

```bash
git add app/api/appointments/route.ts app/api/available-slots/route.ts
git commit -m "feat: support variantId in appointments and available-slots APIs"
```

---

### Task 5: Service Variant Modal Component

**Files:**
- Create: `components/ServiceVariantModal.tsx`

- [ ] **Step 1: Create the variant selection modal**

Create `components/ServiceVariantModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface Variant {
  id: number;
  name: string;
  price: number;
  duration: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (variant: Variant) => void;
  serviceName: string;
  variants: Variant[];
}

export default function ServiceVariantModal({ isOpen, onClose, onSelect, serviceName, variants }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const variant = variants.find((v) => v.id === selectedId);
    if (variant) onSelect(variant);
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl bg-[#111115] border-t border-white/[0.08] overflow-hidden animate-[slide-up_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-white">{serviceName}</h3>
          <p className="text-xs text-zinc-500 mt-1">Выберите вариант</p>
        </div>

        <div className="px-5 pb-3 space-y-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedId(v.id)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                selectedId === v.id
                  ? "border-[#B2223C] bg-[#B2223C]/10"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              <div className="text-left">
                <div className={`text-sm font-medium ${selectedId === v.id ? "text-white" : "text-zinc-300"}`}>
                  {v.name}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{v.duration} мин</div>
              </div>
              <div className={`text-sm font-bold ${selectedId === v.id ? "text-[#e8556e]" : "text-zinc-400"}`}>
                {v.price.toLocaleString()} ₽
              </div>
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 pt-2 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/[0.08] text-sm text-zinc-400">
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
            style={{ background: selectedId ? "#B2223C" : "rgba(178,34,60,0.3)" }}
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ServiceVariantModal.tsx
git commit -m "feat: add ServiceVariantModal for variant selection"
```

---

### Task 6: Update Booking UI

**Files:**
- Modify: `components/BookingServicesGrid.tsx` or equivalent booking page
- Modify: `components/MiniAppBooking.tsx`

- [ ] **Step 1: Add category tabs**

Update the booking services grid to show category tabs (horizontal scrollable chips) and group services by subgroups with section headers.

- [ ] **Step 2: Integrate variant modal**

When user taps a service card that has variants → open `ServiceVariantModal`. On variant selection → proceed with selected variant's price/duration.

- [ ] **Step 3: Pass variantId through booking flow**

Ensure `variantId` is passed to the `/api/appointments` POST request.

- [ ] **Step 4: Commit**

```bash
git add components/BookingServicesGrid.tsx components/MiniAppBooking.tsx components/BookingFlow.tsx
git commit -m "feat: category tabs, subgroup sections, variant modal in booking UI"
```

---

### Task 7: Update Masters

**Files:**
- Script or manual SQL

- [ ] **Step 1: Update master specializations**

Update existing masters and add new ones via SQL or seed script. Key assignments:

```sql
-- Update existing
UPDATE masters SET specialization = 'парикмахер' WHERE full_name = 'Маргарита Дереглазова';
UPDATE masters SET specialization = 'парикмахер' WHERE full_name = 'Наталья Зорькина';
UPDATE masters SET specialization = 'массажист' WHERE full_name = 'Оксана Склярова';
```

Insert new masters from the profit-club.ru staff page.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: update master specializations for service matching"
```

---

### Task 8: Build & Push

- [ ] **Step 1: Build**

```bash
npm run build
```

- [ ] **Step 2: Run seed**

```bash
npm run db:seed-all
```

- [ ] **Step 3: Push**

```bash
git add -A
git commit -m "feat: services restructure — categories, subgroups, variants with full data"
git push origin main
```
