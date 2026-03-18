import { NextResponse } from "next/server";
import { db } from "@/db";
import { workSlots } from "@/db/schema-sqlite";

export const dynamic = "force-dynamic";

// GET /api/debug-work-slots-all
// Возвращает все рабочие дни с полями adminUpdateStatus, isConfirmed и основными данными
export async function GET() {
  try {
    const rows = await db.select().from(workSlots);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error in debug-work-slots-all:", error);
    return NextResponse.json({ error: "Failed to fetch debug work slots" }, { status: 500 });
  }
}
