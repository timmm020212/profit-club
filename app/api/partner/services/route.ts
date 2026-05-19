import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { services } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Normalize price: accept "1500", "1500 ₽", "1 500", "1500.50" → store as "1500 ₽"
function normalizePrice(input: unknown): string | null {
  if (input === null || input === undefined || input === "") return null;
  const digits = String(input).replace(/\D/g, "");
  if (!digits) return null;
  return `${digits} ₽`;
}

const VALID_BADGES = new Set(["accent", "discount", "dark", "light"]);

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const rows = await dbRetry(() => db
      .select()
      .from(services)
      .where(eq(services.salonId, session.salonId))
      .orderBy(asc(services.orderDesktop))
    );
    return NextResponse.json(rows);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Services GET error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await request.json();
    const {
      name,
      price,
      duration,
      description,
      imageUrl,
      category,
      executorRole,
      badgeText,
      badgeType,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }

    const normalizedBadgeType = badgeType
      ? VALID_BADGES.has(String(badgeType).toLowerCase())
        ? String(badgeType).toLowerCase()
        : null
      : null;

    const [inserted] = await dbRetry(() => db.insert(services).values({
      name: name.trim(),
      price: normalizePrice(price),
      duration: duration ? Math.max(5, Number(duration)) : 60,
      description: description?.toString().trim() || "",
      imageUrl: imageUrl?.toString().trim() || null,
      category: category?.toString().trim() || null,
      executorRole: executorRole?.toString().trim() || null,
      badgeText: badgeText?.toString().trim() || null,
      badgeType: normalizedBadgeType,
      salonId: session.salonId,
    }).returning());

    return NextResponse.json(inserted);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Services POST error:", msg);
    return NextResponse.json({ error: "Не удалось создать услугу", detail: msg }, { status: 500 });
  }
}
