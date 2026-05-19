import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { masters } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function clean(s: unknown, max = 255): string | null {
  if (s === null || s === undefined) return null;
  const str = String(s).trim();
  if (!str) return null;
  return str.slice(0, max);
}

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const rows = await dbRetry(() => db
      .select({
        id: masters.id,
        fullName: masters.fullName,
        specialization: masters.specialization,
        phone: masters.phone,
        telegramId: masters.telegramId,
        photoUrl: masters.photoUrl,
        isActive: masters.isActive,
        showOnSite: masters.showOnSite,
        createdAt: masters.createdAt,
      })
      .from(masters)
      .where(and(eq(masters.salonId, session.salonId), eq(masters.isActive, true)))
      .orderBy(asc(masters.id))
    );
    return NextResponse.json(rows);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Masters GET error:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await request.json();
    const { fullName, specialization, phone, telegramId, photoUrl, showOnSite } = body;

    const cleanName = clean(fullName);
    const cleanSpec = clean(specialization);
    if (!cleanName) {
      return NextResponse.json({ error: "ФИО обязательно" }, { status: 400 });
    }
    if (!cleanSpec) {
      return NextResponse.json({ error: "Укажите специализацию" }, { status: 400 });
    }

    const [inserted] = await dbRetry(() => db.insert(masters).values({
      fullName: cleanName,
      specialization: cleanSpec,
      phone: clean(phone, 50),
      telegramId: clean(telegramId, 50),
      photoUrl: clean(photoUrl, 500),
      showOnSite: showOnSite !== false,
      isActive: true,
      commissionPercent: 50,
      createdAt: new Date().toISOString(),
      salonId: session.salonId,
    }).returning());

    return NextResponse.json(inserted);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Masters POST error:", msg);
    return NextResponse.json({ error: "Не удалось создать мастера", detail: msg }, { status: 500 });
  }
}
