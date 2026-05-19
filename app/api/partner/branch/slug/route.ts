import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salons } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Должны совпадать с RESERVED в app/(app)/[slug]/page.tsx
const RESERVED = new Set([
  "partner", "admin", "api", "login", "signup", "register",
  "salon", "booking", "miniapp", "profile", "telegram-webapp",
  "_next", "favicon.ico", "uploads", "media", "logo", "robots.txt",
  "sitemap.xml", "manifest.json", "static", "public", "www",
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  try {
    const { slug } = await req.json();
    const normalized = String(slug || "").toLowerCase().trim();

    if (!normalized) {
      return NextResponse.json({ error: "Введите адрес страницы" }, { status: 400 });
    }
    if (!SLUG_RE.test(normalized)) {
      return NextResponse.json({
        error: "Только латинские буквы, цифры и дефис (3-40 символов)",
      }, { status: 400 });
    }
    if (RESERVED.has(normalized)) {
      return NextResponse.json({ error: "Этот адрес зарезервирован системой" }, { status: 400 });
    }

    // Уникальность среди других салонов
    const conflict = await dbRetry(async () => {
      const [row] = await db
        .select({ id: salons.id })
        .from(salons)
        .where(and(eq(salons.slug, normalized), ne(salons.id, session.salonId)))
        .limit(1);
      return row;
    });
    if (conflict) {
      return NextResponse.json({ error: "Этот адрес уже занят" }, { status: 409 });
    }

    const [updated] = await dbRetry(() => db.update(salons)
      .set({ slug: normalized })
      .where(eq(salons.id, session.salonId))
      .returning({ id: salons.id, slug: salons.slug })
    );

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Slug PATCH error:", msg);
    return NextResponse.json({ error: "Не удалось обновить адрес", detail: msg }, { status: 500 });
  }
}

// Проверка доступности слага (live-validation на форме)
export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  try {
    const url = new URL(req.url);
    const slug = (url.searchParams.get("slug") || "").toLowerCase().trim();

    if (!slug) return NextResponse.json({ available: false, reason: "empty" });
    if (!SLUG_RE.test(slug)) return NextResponse.json({ available: false, reason: "invalid" });
    if (RESERVED.has(slug)) return NextResponse.json({ available: false, reason: "reserved" });

    const conflict = await dbRetry(async () => {
      const [row] = await db
        .select({ id: salons.id })
        .from(salons)
        .where(and(eq(salons.slug, slug), ne(salons.id, session.salonId)))
        .limit(1);
      return row;
    });

    return NextResponse.json({ available: !conflict });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ available: false, reason: "error", detail: msg }, { status: 500 });
  }
}
