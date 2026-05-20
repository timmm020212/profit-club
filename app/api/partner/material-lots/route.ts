import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { materials, materialLots } from "@/db/schema";
import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const sp = req.nextUrl.searchParams;
    const materialId = sp.get("materialId") ? Number(sp.get("materialId")) : null;
    const from = sp.get("from");
    const to = sp.get("to");
    const supplier = sp.get("supplier");
    const conds = [eq(materialLots.salonId, session.salonId)];
    if (materialId) conds.push(eq(materialLots.materialId, materialId));
    if (from) conds.push(gte(materialLots.arrivedAt, from));
    if (to)   conds.push(lte(materialLots.arrivedAt, to));
    if (supplier) conds.push(ilike(materialLots.supplier, `%${supplier}%`));

    const rows = await dbRetry(() => db
      .select({
        id: materialLots.id,
        materialId: materialLots.materialId,
        materialName: materials.name,
        materialUnit: materials.unit,
        qtyInitial: materialLots.qtyInitial,
        qtyRemaining: materialLots.qtyRemaining,
        pricePerUnit: materialLots.pricePerUnit,
        supplier: materialLots.supplier,
        arrivedAt: materialLots.arrivedAt,
        note: materialLots.note,
        createdAt: materialLots.createdAt,
      })
      .from(materialLots)
      .innerJoin(materials, eq(materials.id, materialLots.materialId))
      .where(and(...conds))
      .orderBy(desc(materialLots.arrivedAt), desc(materialLots.id))
      .limit(500)
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Lots GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await req.json();
    const materialId = Number(body?.materialId);
    const qty = Number(body?.qty);
    const pricePerUnit = Math.round(Number(body?.pricePerUnit));
    const arrivedAt = typeof body?.arrivedAt === "string" ? body.arrivedAt : "";
    const supplier = typeof body?.supplier === "string" && body.supplier.trim() ? body.supplier.trim() : null;
    const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;

    if (!materialId)              return NextResponse.json({ error: "materialId required" }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0)
                                   return NextResponse.json({ error: "qty must be > 0" }, { status: 400 });
    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0)
                                   return NextResponse.json({ error: "pricePerUnit must be ≥ 0" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(arrivedAt))
                                   return NextResponse.json({ error: "arrivedAt must be YYYY-MM-DD" }, { status: 400 });

    // Ensure material belongs to this salon
    const [m] = await dbRetry(() => db
      .select({ id: materials.id })
      .from(materials)
      .where(and(eq(materials.id, materialId), eq(materials.salonId, session.salonId)))
    );
    if (!m) return NextResponse.json({ error: "material not found" }, { status: 404 });

    const [row] = await dbRetry(() => db
      .insert(materialLots)
      .values({
        salonId: session.salonId,
        materialId,
        qtyInitial: qty.toFixed(2),
        qtyRemaining: qty.toFixed(2),
        pricePerUnit,
        supplier,
        arrivedAt,
        note,
      })
      .returning()
    );
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Lots POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
