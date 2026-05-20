import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db/index-postgres";
import { appointmentMaterialUsage } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { returnFifo, ConsumedLot } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(appointmentMaterialUsage)
        .where(and(eq(appointmentMaterialUsage.id, id), eq(appointmentMaterialUsage.salonId, session.salonId)))
        .for("update");
      if (!row) throw new Error("not_found");
      const consumed = (row.lotsConsumed as unknown as ConsumedLot[]) || [];
      await returnFifo(tx, session.salonId, consumed);
      await tx
        .delete(appointmentMaterialUsage)
        .where(eq(appointmentMaterialUsage.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "not_found") return NextResponse.json({ error: "not found" }, { status: 404 });
    console.error("Usage DELETE:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
