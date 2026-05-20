import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { materials } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.category === "string") patch.category = body.category.trim() || null;
    if ("lowStockThreshold" in body) {
      if (body.lowStockThreshold == null || body.lowStockThreshold === "") {
        patch.lowStockThreshold = null;
      } else {
        const n = Number(body.lowStockThreshold);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: "lowStockThreshold must be a non-negative number" }, { status: 400 });
        }
        patch.lowStockThreshold = String(n);
      }
    }
    if (typeof body?.isActive === "boolean") patch.isActive = body.isActive;
    // Unit change is forbidden by design (past quantities lose meaning).
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }
    const [row] = await dbRetry(() => db
      .update(materials)
      .set(patch)
      .where(and(eq(materials.id, id), eq(materials.salonId, session.salonId)))
      .returning()
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Materials PATCH:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
    const [row] = await dbRetry(() => db
      .update(materials)
      .set({ isActive: false, archivedAt: new Date() })
      .where(and(eq(materials.id, id), eq(materials.salonId, session.salonId)))
      .returning()
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Materials DELETE:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
