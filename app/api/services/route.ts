import { NextResponse } from "next/server";
import { db, dbRetry } from "@/db/index-postgres";
import { services, serviceCategories, serviceSubgroups, serviceVariants, salons } from "@/db/schema";
import { eq, asc } from "drizzle-orm";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nested = searchParams.get("nested") === "true";
  const salonSlug = searchParams.get("salon");

  // Resolve salonId: if ?salon=slug provided, look up the salon; otherwise default to 1
  let salonId = 1;
  if (salonSlug) {
    const salonRow = await dbRetry(() =>
      db.select({ id: salons.id }).from(salons).where(eq(salons.slug, salonSlug)).limit(1)
    );
    if (salonRow.length > 0) {
      salonId = salonRow[0].id;
    }
  }

  if (nested) {
    try {
      const [allCategories, allSubgroups, allServices, allVariants] = await Promise.all([
        dbRetry(() => db.select().from(serviceCategories).where(eq(serviceCategories.salonId, salonId)).orderBy(serviceCategories.order)),
        dbRetry(() => db.select().from(serviceSubgroups).where(eq(serviceSubgroups.salonId, salonId)).orderBy(serviceSubgroups.order)),
        dbRetry(() => db.select().from(services).where(eq(services.salonId, salonId)).orderBy(services.orderDesktop)),
        dbRetry(() => db.select().from(serviceVariants).where(eq(serviceVariants.salonId, salonId)).orderBy(serviceVariants.order)),
      ]);

      // 1) Build the "real" category tree (legacy admin-managed structure)
      const subgroupIds = new Set(allSubgroups.map(sg => sg.id));
      const realTree = allCategories
        .filter(c => c.isActive)
        .map(cat => ({
          ...cat,
          subgroups: allSubgroups
            .filter(sg => sg.categoryId === cat.id)
            .map(sg => ({
              ...sg,
              services: allServices
                .filter(s => s.subgroupId === sg.id)
                .map(s => ({
                  ...s,
                  variants: allVariants.filter(v => v.serviceId === s.id),
                })),
            })),
        }));

      // 2) Find "orphan" services (no subgroupId or pointing to missing subgroup)
      //    These are services created via the partner cabinet UI which only sets
      //    a flat `category` string. Group them by that string.
      const orphans = allServices.filter(s => !s.subgroupId || !subgroupIds.has(s.subgroupId));
      const orphansByCategory = new Map<string, typeof orphans>();
      for (const svc of orphans) {
        const key = (svc.category || "").trim() || "Другое";
        if (!orphansByCategory.has(key)) orphansByCategory.set(key, []);
        orphansByCategory.get(key)!.push(svc);
      }

      // 3) Index real categories by normalized name for merging
      type RealCat = (typeof realTree)[number];
      const realByName = new Map<string, RealCat>();
      for (const cat of realTree) {
        realByName.set(cat.name.toLowerCase().trim(), cat);
      }

      // 4) Distribute orphan groups:
      //    - If their category string matches an existing real category → append as "Другие" subgroup
      //    - Otherwise → create a fully synthetic category
      let pseudoId = -1;
      const syntheticTree: RealCat[] = [];

      for (const [name, svcs] of orphansByCategory) {
        const key = name.toLowerCase().trim();
        const target = realByName.get(key);
        const builtSvcs = svcs.map(s => ({
          ...s,
          variants: allVariants.filter(v => v.serviceId === s.id),
        }));

        if (target) {
          // Merge into existing real category as a "Другие" subgroup
          target.subgroups.push({
            id: pseudoId--,
            categoryId: target.id,
            name: "Другие",
            order: 9000,
            salonId,
            services: builtSvcs,
          });
        } else {
          // Brand-new synthetic category
          const catId = pseudoId--;
          syntheticTree.push({
            id: catId,
            name,
            icon: null,
            order: 9000,
            isActive: true,
            salonId,
            subgroups: [{
              id: pseudoId--,
              categoryId: catId,
              name,
              order: 0,
              salonId,
              services: builtSvcs,
            }],
          });
        }
      }

      // 5) Combine — real tree first (with merged orphans), brand-new synthetic at the end
      const combined = [...realTree, ...syntheticTree];

      return NextResponse.json({ categories: combined }, {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error fetching nested services:", msg);
      return NextResponse.json(
        { error: "Failed to fetch nested services", detail: msg },
        { status: 500 }
      );
    }
  }

  try {
    console.log("Fetching services...");
    const allServices = await db.select().from(services).where(eq(services.salonId, salonId)).orderBy(asc(services.orderDesktop));
    
    // Преобразуем в нужный формат
    const formattedServices = allServices.map((service: any) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      imageUrl: service.imageUrl || null,
      category: (service as any).category ?? null,
      orderDesktop: service.orderDesktop,
      orderMobile: service.orderMobile,
      badgeText: service.badgeText,
      badgeType: service.badgeType,
      executorRole: (service as any).executorRole ?? null,
    }));
    
    console.log(`Found ${formattedServices.length} services`);
    return NextResponse.json(formattedServices, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error("Error fetching services from PostgreSQL:", error);
    
    // Если база пуста, вернем моковые данные
    const mockServices = [
      {
        id: 1,
        name: "Стрижка женская",
        description: "Профессиональная стрижка женских волос с учетом ваших пожеланий и типа лица",
        price: "2500 ₽",
        duration: "1 час",
        imageUrl: null,
        category: "Парикмахерские услуги",
        executorRole: "парикмахер",
        orderDesktop: 1,
        orderMobile: 1,
        badgeText: null,
        badgeType: null
      },
      {
        id: 2,
        name: "Маникюр классический",
        description: "Классический маникюр с покрытием гель-лаком",
        price: "1500 ₽",
        duration: "1.5 часа",
        imageUrl: null,
        category: "Ногтевой сервис",
        executorRole: "мастер ногтевого сервиса",
        orderDesktop: 2,
        orderMobile: 2,
        badgeText: null,
        badgeType: null
      },
      {
        id: 3,
        name: "Массаж спины",
        description: "Расслабляющий массаж спины для снятия напряжения и улучшения кровообращения",
        price: "2000 ₽",
        duration: "45 минут",
        imageUrl: null,
        category: "Массаж",
        executorRole: "массажист",
        orderDesktop: 3,
        orderMobile: 3,
        badgeText: null,
        badgeType: null
      }
    ];
    
    return NextResponse.json(mockServices, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  }
}

export async function POST(request: Request) {
  try {

    const body = await request.json().catch(() => ({}));
    const {
      name,
      description,
      price,
      duration,
      imageUrl,
      category,
      executorRole,
      orderDesktop,
      orderMobile,
      badgeText,
      badgeType
    } = body;

    if (!name || !price || !duration) {
      return NextResponse.json(
        { error: "name, price, and duration are required" },
        { status: 400 }
      );
    }

    // Сохраняем услугу в базу данных
    const inserted = await db
      .insert(services)
      .values({
        name,
        description: description || '',
        price,
        duration: duration || 60,
        imageUrl: imageUrl || null,
        category: category || null,
        orderDesktop: orderDesktop || 0,
        orderMobile: orderMobile || 0,
        badgeText: badgeText || null,
        badgeType: badgeType || null,
        executorRole: executorRole || null,
      })
      .returning();

    console.log("Service created successfully:", inserted[0]);
    
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

// DELETE метод для удаления услуги
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const serviceId = Number(id);
    if (isNaN(serviceId)) {
      return NextResponse.json(
        { error: "Invalid service ID" },
        { status: 400 }
      );
    }

    // Проверяем что услуга существует
    const existingService = await db
      .select()
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (!existingService.length) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Удаляем услугу
    await db.delete(services).where(eq(services.id, serviceId));

    console.log("Service deleted successfully:", serviceId);
    
    return NextResponse.json(
      { message: "Service deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
