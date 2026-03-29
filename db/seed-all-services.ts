import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "./index-postgres";
import { serviceCategories, serviceSubgroups, services, serviceVariants } from "./schema-postgres";

async function seed() {
  console.log("Seeding categories...");

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

  const subgroupsData = [
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
    { categoryName: "Мужской зал", name: "Стрижки и укладки", order: 1 },
    { categoryName: "Мужской зал", name: "Борода", order: 2 },
    { categoryName: "Мужской зал", name: "Окрашивание и тонирование", order: 3 },
    { categoryName: "Визаж", name: "Макияж", order: 1 },
    { categoryName: "Визаж", name: "Брови и ресницы", order: 2 },
    { categoryName: "Визаж", name: "Перманентный макияж", order: 3 },
    { categoryName: "Маникюр и педикюр", name: "Маникюр", order: 1 },
    { categoryName: "Маникюр и педикюр", name: "Педикюр", order: 2 },
    { categoryName: "Косметология", name: "Аппаратная косметология", order: 1 },
    { categoryName: "Косметология", name: "Инъекции и контурная пластика", order: 2 },
    { categoryName: "Косметология", name: "Мезотерапия", order: 3 },
    { categoryName: "Косметология", name: "Чистки и пилинги", order: 4 },
    { categoryName: "Косметология", name: "PRP-терапия", order: 5 },
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

  async function add(subgroup: string, name: string, role: string, variants: { name: string; price: number; duration: number }[], order: number) {
    const [svc] = await db.insert(services).values({
      name, description: "",
      price: variants.length === 1 && !variants[0].name ? String(variants[0].price) : `от ${Math.min(...variants.map(v => v.price))}`,
      duration: variants[0].duration,
      executorRole: role,
      subgroupId: subMap[subgroup],
      orderDesktop: order, orderMobile: order,
    }).returning();
    if (variants.length > 1 || (variants.length === 1 && variants[0].name)) {
      await db.insert(serviceVariants).values(
        variants.map((v, i) => ({ serviceId: svc.id, name: v.name, price: v.price, duration: v.duration, order: i + 1 }))
      );
    }
  }

  // ПАРИКМАХЕРСКИЕ
  await add("Стрижки", "Стрижка женская", "парикмахер", [{ name: "Короткие волосы", price: 3300, duration: 60 }, { name: "Длинные волосы", price: 4300, duration: 90 }], 1);
  await add("Стрижки", "Стрижка чёлки", "парикмахер", [{ name: "", price: 1500, duration: 20 }], 2);
  await add("Стрижки", "Детская стрижка", "парикмахер", [{ name: "", price: 1500, duration: 30 }], 3);
  await add("Стрижки", "Подростковая стрижка", "парикмахер", [{ name: "Простая", price: 2000, duration: 40 }, { name: "Сложная", price: 3000, duration: 60 }], 4);
  await add("Укладки", "Укладка", "парикмахер", [{ name: "Короткие", price: 2500, duration: 40 }, { name: "Средние", price: 3200, duration: 50 }, { name: "Длинные", price: 4200, duration: 60 }], 1);
  await add("Вечерние и свадебные причёски", "Причёска вечерняя", "парикмахер", [{ name: "Короткие", price: 4000, duration: 60 }, { name: "Длинные", price: 5000, duration: 90 }], 1);
  await add("Вечерние и свадебные причёски", "Причёска свадебная", "парикмахер", [{ name: "Короткие", price: 6800, duration: 90 }, { name: "Длинные", price: 8000, duration: 120 }], 2);
  await add("Окрашивание", "Окрашивание корней", "парикмахер", [{ name: "", price: 3200, duration: 60 }], 1);
  await add("Окрашивание", "Окрашивание в один тон", "парикмахер", [{ name: "Короткие", price: 5300, duration: 90 }, { name: "Средние", price: 6500, duration: 120 }, { name: "Длинные", price: 10000, duration: 150 }], 2);
  await add("Мелирование", "Мелирование на фольгу", "парикмахер", [{ name: "Короткие", price: 7200, duration: 120 }, { name: "Средние", price: 8800, duration: 150 }, { name: "Длинные", price: 11000, duration: 180 }], 1);
  await add("Сложное окрашивание", "Шатуш / Балаяж", "парикмахер", [{ name: "Короткие", price: 14000, duration: 180 }, { name: "Средние", price: 16000, duration: 210 }, { name: "Длинные", price: 18000, duration: 240 }], 1);
  await add("Блондирование", "Блондирование", "парикмахер", [{ name: "Корни", price: 2500, duration: 60 }, { name: "Короткие", price: 3000, duration: 90 }, { name: "Средние", price: 4500, duration: 120 }, { name: "Длинные", price: 6000, duration: 150 }], 1);
  await add("Аиртач", "Аиртач + тонирование", "парикмахер", [{ name: "Короткие (контуринг)", price: 8000, duration: 150 }, { name: "Средние (контуринг)", price: 10000, duration: 180 }, { name: "Средние", price: 16000, duration: 240 }, { name: "Длинные", price: 20000, duration: 270 }, { name: "Очень длинные", price: 25000, duration: 300 }], 1);
  await add("Смывка", "Смывка", "парикмахер", [{ name: "Короткие", price: 10000, duration: 180 }, { name: "Средние", price: 14000, duration: 210 }, { name: "Длинные", price: 18000, duration: 240 }], 1);
  await add("Плетение и ламинирование", "Плетение кос / хвост", "парикмахер", [{ name: "", price: 2000, duration: 30 }], 1);
  await add("Плетение и ламинирование", "Ламинирование", "парикмахер", [{ name: "Короткие", price: 4000, duration: 60 }, { name: "Средние", price: 4700, duration: 75 }, { name: "Длинные", price: 5300, duration: 90 }], 2);
  await add("Уходы для волос", "Уход Davines", "парикмахер", [{ name: "Базовый", price: 1000, duration: 20 }, { name: "Премиум", price: 3500, duration: 40 }], 1);
  await add("Уходы для волос", "Уход К18", "парикмахер", [{ name: "Короткие", price: 1500, duration: 20 }, { name: "Длинные", price: 2500, duration: 30 }], 2);
  await add("Уходы для волос", "Сушка по форме", "парикмахер", [{ name: "", price: 1000, duration: 20 }], 3);

  // МУЖСКОЙ ЗАЛ
  await add("Стрижки и укладки", "Стрижка мужская", "барбер", [{ name: "", price: 2800, duration: 45 }], 1);
  await add("Стрижки и укладки", "Мужская укладка", "барбер", [{ name: "", price: 950, duration: 15 }], 2);
  await add("Стрижки и укладки", "Мужская окантовка", "барбер", [{ name: "", price: 600, duration: 15 }], 3);
  await add("Стрижки и укладки", "Премиальное бритье", "барбер", [{ name: "", price: 1000, duration: 30 }], 4);
  await add("Борода", "Моделирование бороды", "барбер", [{ name: "", price: 800, duration: 20 }], 1);
  await add("Борода", "Тонирование бороды", "барбер", [{ name: "", price: 800, duration: 20 }], 2);
  await add("Борода", "Камуфляж седины", "барбер", [{ name: "", price: 1000, duration: 30 }], 3);
  await add("Окрашивание и тонирование", "Мужское тонирование", "барбер", [{ name: "", price: 2000, duration: 40 }], 1);
  await add("Окрашивание и тонирование", "Окрашивание корней (муж)", "барбер", [{ name: "", price: 3200, duration: 60 }], 2);

  // ВИЗАЖ
  await add("Макияж", "Макияж дневной", "визажист", [{ name: "", price: 2500, duration: 45 }], 1);
  await add("Макияж", "Макияж вечерний", "визажист", [{ name: "", price: 3000, duration: 60 }], 2);
  await add("Макияж", "Макияж свадебный", "визажист", [{ name: "", price: 3200, duration: 60 }], 3);
  await add("Макияж", "Экспресс макияж", "визажист", [{ name: "", price: 1300, duration: 20 }], 4);
  await add("Брови и ресницы", "Окрашивание бровей", "визажист", [{ name: "", price: 400, duration: 15 }], 1);
  await add("Брови и ресницы", "Окрашивание ресниц", "визажист", [{ name: "", price: 400, duration: 15 }], 2);
  await add("Брови и ресницы", "Коррекция формы бровей", "визажист", [{ name: "", price: 700, duration: 20 }], 3);
  await add("Брови и ресницы", "Кератинирование ресниц", "визажист", [{ name: "", price: 3000, duration: 60 }], 4);
  await add("Брови и ресницы", "Кератинирование бровей", "визажист", [{ name: "", price: 2000, duration: 45 }], 5);
  await add("Перманентный макияж", "Перманентный макияж губ", "визажист", [{ name: "", price: 8000, duration: 120 }], 1);
  await add("Перманентный макияж", "Перманентный макияж бровей", "визажист", [{ name: "", price: 8000, duration: 120 }], 2);
  await add("Перманентный макияж", "Межресничный татуаж", "визажист", [{ name: "", price: 7000, duration: 90 }], 3);

  // МАНИКЮР И ПЕДИКЮР
  await add("Маникюр", "Маникюр + покрытие гель-лак", "маникюр", [{ name: "", price: 3200, duration: 90 }], 1);
  await add("Маникюр", "Маникюр + коррекция ногтей", "маникюр", [{ name: "", price: 3950, duration: 120 }], 2);
  await add("Маникюр", "Пилочный маникюр", "маникюр", [{ name: "", price: 1950, duration: 60 }], 3);
  await add("Маникюр", "Мужской маникюр", "маникюр", [{ name: "", price: 1850, duration: 60 }], 4);
  await add("Маникюр", "Маникюр без покрытия", "маникюр", [{ name: "", price: 1650, duration: 45 }], 5);
  await add("Маникюр", "Маникюр + наращивание", "маникюр", [{ name: "Стандарт", price: 4650, duration: 150 }, { name: "Сложное", price: 5650, duration: 180 }], 6);
  await add("Маникюр", "Снятие гель-лака", "маникюр", [{ name: "", price: 1100, duration: 30 }], 7);
  await add("Педикюр", "Педикюр", "маникюр", [{ name: "", price: 3000, duration: 90 }], 1);
  await add("Педикюр", "Педикюр с покрытием гель-лак", "маникюр", [{ name: "", price: 4150, duration: 120 }], 2);
  await add("Педикюр", "Педикюр мужской", "маникюр", [{ name: "", price: 3300, duration: 90 }], 3);

  // КОСМЕТОЛОГИЯ
  await add("Аппаратная косметология", "LPG массаж (тело)", "косметолог", [{ name: "1 процедура", price: 5000, duration: 50 }, { name: "Абонемент 6", price: 30000, duration: 50 }, { name: "Абонемент 10", price: 50000, duration: 50 }], 1);
  await add("Аппаратная косметология", "LPG массаж (лицо)", "косметолог", [{ name: "Лицо", price: 3200, duration: 30 }, { name: "Лицо+шея+декольте", price: 4200, duration: 30 }, { name: "Лицо+уход", price: 5500, duration: 45 }], 2);
  await add("Аппаратная косметология", "MediSculpt", "косметолог", [{ name: "1 зона", price: 4000, duration: 30 }, { name: "2 зоны", price: 7000, duration: 45 }], 3);
  await add("Аппаратная косметология", "Geneo комплекс", "косметолог", [{ name: "", price: 8800, duration: 60 }], 4);
  await add("Аппаратная косметология", "LED-терапия", "косметолог", [{ name: "Лицо", price: 4500, duration: 40 }, { name: "Лицо и шея", price: 5000, duration: 40 }, { name: "Лицо+шея+декольте", price: 5500, duration: 40 }], 5);
  await add("Аппаратная косметология", "Криолиполиз", "косметолог", [{ name: "Подбородок", price: 16000, duration: 60 }, { name: "1 насадка", price: 19000, duration: 60 }, { name: "2 насадки", price: 33000, duration: 90 }], 6);
  await add("Аппаратная косметология", "Endosphere", "косметолог", [{ name: "", price: 6000, duration: 75 }], 7);
  await add("Аппаратная косметология", "IPL Lumenis M22", "косметолог", [{ name: "До 150 импульсов", price: 10250, duration: 30 }, { name: "150-300 импульсов", price: 14150, duration: 45 }], 8);
  await add("Аппаратная косметология", "Resur FX", "косметолог", [{ name: "Лицо", price: 20200, duration: 45 }, { name: "Лицо+шея", price: 25200, duration: 60 }, { name: "Лицо+шея+декольте", price: 30200, duration: 75 }], 9);
  await add("Инъекции и контурная пластика", "Диспорт", "косметолог", [{ name: "1 ед.", price: 140, duration: 30 }], 1);
  await add("Инъекции и контурная пластика", "Ботокс", "косметолог", [{ name: "1 ед.", price: 380, duration: 30 }], 2);
  await add("Инъекции и контурная пластика", "Релатокс", "косметолог", [{ name: "50 ед.", price: 15000, duration: 30 }], 3);
  await add("Инъекции и контурная пластика", "Sculptra", "косметолог", [{ name: "", price: 42000, duration: 60 }], 4);
  await add("Инъекции и контурная пластика", "Профайло", "косметолог", [{ name: "", price: 21400, duration: 45 }], 5);
  await add("Мезотерапия", "Мезотерапия лица", "косметолог", [{ name: "", price: 4500, duration: 30 }], 1);
  await add("Мезотерапия", "Mesoeye", "косметолог", [{ name: "", price: 15200, duration: 30 }], 2);
  await add("Мезотерапия", "Mesosculpt", "косметолог", [{ name: "", price: 10200, duration: 30 }], 3);
  await add("Мезотерапия", "Курасен", "косметолог", [{ name: "1 ампула", price: 8200, duration: 30 }], 4);
  await add("Чистки и пилинги", "УЗ чистка лица", "косметолог", [{ name: "", price: 1500, duration: 30 }], 1);
  await add("Чистки и пилинги", "Косметическая чистка", "косметолог", [{ name: "", price: 4500, duration: 60 }], 2);
  await add("Чистки и пилинги", "Уход EGIA", "косметолог", [{ name: "", price: 5750, duration: 60 }], 3);
  await add("Чистки и пилинги", "Пилинг Harmony", "косметолог", [{ name: "Золушки", price: 7500, duration: 45 }, { name: "Isecret", price: 7600, duration: 45 }, { name: "BIOR", price: 6500, duration: 45 }, { name: "MELP", price: 8600, duration: 45 }], 4);
  await add("PRP-терапия", "Regenlab PRP", "косметолог", [{ name: "Синяя пробирка", price: 9000, duration: 30 }, { name: "ACR Plus", price: 41450, duration: 60 }], 1);

  // УХОД ЗА ТЕЛОМ И ДЕПИЛЯЦИЯ
  await add("Массаж", "Массаж женский", "массажист", [{ name: "30 мин", price: 1500, duration: 30 }, { name: "60 мин", price: 2500, duration: 60 }, { name: "Всё тело 90 мин", price: 3500, duration: 90 }], 1);
  await add("Массаж", "Массаж мужской", "массажист", [{ name: "30 мин", price: 2000, duration: 30 }, { name: "60 мин", price: 3000, duration: 60 }, { name: "Всё тело 90 мин", price: 4000, duration: 90 }], 2);
  await add("Массаж", "Массаж детский", "массажист", [{ name: "30 мин", price: 1500, duration: 30 }, { name: "60 мин", price: 2000, duration: 60 }], 3);
  await add("Массаж", "Стоун терапия", "массажист", [{ name: "", price: 3500, duration: 90 }], 4);
  await add("Обертывания и SPA", "Обертывание водорослями", "массажист", [{ name: "", price: 4200, duration: 60 }], 1);
  await add("Обертывания и SPA", "Обертывание T-Shock", "массажист", [{ name: "", price: 3100, duration: 45 }], 2);
  await add("Обертывания и SPA", "Пилинг тела", "массажист", [{ name: "", price: 1800, duration: 30 }], 3);
  await add("Обертывания и SPA", "Кедровая бочка", "массажист", [{ name: "", price: 500, duration: 20 }], 4);
  await add("Восковая депиляция", "Депиляция голени", "депиляция", [{ name: "", price: 1200, duration: 30 }], 1);
  await add("Восковая депиляция", "Депиляция бёдра", "депиляция", [{ name: "", price: 1350, duration: 30 }], 2);
  await add("Восковая депиляция", "Депиляция подмышки", "депиляция", [{ name: "", price: 500, duration: 15 }], 3);
  await add("Полимерная депиляция", "Полимерная бикини", "депиляция", [{ name: "Классика", price: 1800, duration: 30 }, { name: "Глубокое", price: 2500, duration: 45 }], 1);
  await add("Полимерная депиляция", "Полимерная голени", "депиляция", [{ name: "", price: 2500, duration: 30 }], 2);
  await add("Полимерная депиляция", "Полимерная подмышки", "депиляция", [{ name: "", price: 1000, duration: 20 }], 3);
  await add("Лазерная эпиляция", "Лазерная бикини", "депиляция", [{ name: "Классика", price: 4400, duration: 30 }, { name: "Глубокое", price: 4800, duration: 45 }], 1);
  await add("Лазерная эпиляция", "Лазерная ноги", "депиляция", [{ name: "Голени", price: 4400, duration: 30 }, { name: "Голени+бёдра", price: 7500, duration: 60 }], 2);
  await add("Лазерная эпиляция", "Лазерная подмышки", "депиляция", [{ name: "", price: 3800, duration: 20 }], 3);
  await add("Лазерная эпиляция", "Комплекс лазерной эпиляции", "депиляция", [{ name: "Бикини+подмышки", price: 7000, duration: 45 }, { name: "Бикини+подмышки+голени", price: 11000, duration: 75 }, { name: "Полный комплекс", price: 14000, duration: 90 }], 4);

  console.log("✅ All services seeded!");
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
