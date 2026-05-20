import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { materials, materialLots } from "@/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";

  try {
    const rows = await dbRetry(() => db
      .select({
        id: materials.id,
        name: materials.name,
        unit: materials.unit,
        category: materials.category,
        lowStockThreshold: materials.lowStockThreshold,
        isActive: materials.isActive,
        archivedAt: materials.archivedAt,
        currentStock: sql<string>`COALESCE(SUM(${materialLots.qtyRemaining}), 0)`,
        totalValue: sql<string>`COALESCE(SUM(${materialLots.qtyRemaining} * ${materialLots.pricePerUnit}), 0)`,
      })
      .from(materials)
      .leftJoin(materialLots, eq(materialLots.materialId, materials.id))
      .where(includeArchived
        ? eq(materials.salonId, session.salonId)
        : and(eq(materials.salonId, session.salonId), isNull(materials.archivedAt)))
      .groupBy(materials.id)
      .orderBy(asc(materials.name))
    );
    // avgPrice in копейки per unit; null if no stock
    const enriched = rows.map(r => {
      const stock = Number(r.currentStock);
      const value = Number(r.totalValue);
      return {
        ...r,
        currentStock: stock,
        totalValue: value,
        avgPrice: stock > 0 ? Math.round(value / stock) : null,
      };
    });
    return NextResponse.json(enriched);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Materials GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

const ALLOWED_UNITS = ["g", "ml", "pcs", "m"] as const;

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const unit = typeof body?.unit === "string" ? body.unit : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!ALLOWED_UNITS.includes(unit as typeof ALLOWED_UNITS[number])) {
      return NextResponse.json({ error: "unit must be g | ml | pcs | m" }, { status: 400 });
    }
    const category = typeof body?.category === "string" && body.category.trim() ? body.category.trim() : null;
    const thr = body?.lowStockThreshold != null && body.lowStockThreshold !== ""
      ? String(Number(body.lowStockThreshold))
      : null;

    const [row] = await dbRetry(() => db
      .insert(materials)
      .values({ salonId: session.salonId, name, unit, category, lowStockThreshold: thr })
      .returning()
    );
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Materials POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
