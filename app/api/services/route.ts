import { NextResponse } from "next/server";
import { db } from "@/db";
import { services, serviceCategories, serviceSubgroups, serviceVariants } from "@/db/schema";
import { eq, asc } from "drizzle-orm";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nested = searchParams.get("nested") === "true";

  if (nested) {
    try {
      const allCategories = await db.select().from(serviceCategories).orderBy(serviceCategories.order);
      const allSubgroups = await db.select().from(serviceSubgroups).orderBy(serviceSubgroups.order);
      const allServices = await db.select().from(services).orderBy(services.orderDesktop);
      const allVariants = await db.select().from(serviceVariants).orderBy(serviceVariants.order);

      const result = allCategories
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

      return NextResponse.json({ categories: result }, {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      console.error("Error fetching nested services:", error);
      return NextResponse.json(
        { error: "Failed to fetch nested services" },
        { status: 500 }
      );
    }
  }

  try {
    console.log("Fetching services...");
    const allServices = await db.select().from(services).orderBy(asc(services.orderDesktop));
    
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
