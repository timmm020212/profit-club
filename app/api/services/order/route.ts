import { NextResponse } from "next/server";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {

    const body = await request.json().catch(() => ({}));
    const { mode, items } = body as {
      mode?: "desktop" | "mobile";
      items?: Array<{ id: number; order: number }>;
    };

    if (mode !== "desktop" && mode !== "mobile") {
      return NextResponse.json({ error: "Некорректный mode" }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items обязателен" }, { status: 400 });
    }

    for (const item of items) {
      const id = Number(item?.id);
      const order = Number(item?.order);
      if (!Number.isFinite(id) || !Number.isFinite(order)) {
        return NextResponse.json({ error: "Некорректные items" }, { status: 400 });
      }
    }

    await Promise.all(
      items.map((item) => {
        const id = Number(item.id);
        const order = Math.round(Number(item.order));
        return db
          .update(services)
          .set(mode === "desktop" ? { orderDesktop: order } : { orderMobile: order })
          .where(eq(services.id, id));
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating service order:", error);
    return NextResponse.json(
      { error: "Failed to update service order" },
      { status: 500 }
    );
  }
}
