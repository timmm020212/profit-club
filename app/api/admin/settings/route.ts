import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminSession } from "@/lib/requireAdminSession";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db.select().from(adminSettings);
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value || "";
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({}, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

    const existing = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    if (existing.length > 0) {
      await db.update(adminSettings).set({ value: String(value) }).where(eq(adminSettings.key, key));
    } else {
      await db.insert(adminSettings).values({ key, value: String(value) });
    }

    return NextResponse.json({ key, value: String(value) });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}
