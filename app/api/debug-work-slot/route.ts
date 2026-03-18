import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlots } from "@/db/schema-sqlite";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// GET /api/debug-work-slot?id=123
// Возвращает сырой work_slot по id, включая adminUpdateStatus
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const slotId = id ? Number(id) : NaN;

    if (!slotId || Number.isNaN(slotId)) {
      return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
    }

    const rows = await db.select().from(workSlots).where(eq(workSlots.id, slotId));

    if (!rows.length) {
      return NextResponse.json({ error: "Слот не найден" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error in debug-work-slot:", error);
    return NextResponse.json({ error: "Failed to fetch debug work slot" }, { status: 500 });
  }
}
