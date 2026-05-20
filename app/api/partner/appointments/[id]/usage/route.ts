import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { appointments, materials, appointmentMaterialUsage } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { consumeFifo } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const appointmentId = Number(idStr);
    if (!appointmentId) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const body = await req.json();
    const items: { materialId: number; quantity: number }[] = Array.isArray(body?.items) ? body.items : [];
    const cleaned = items
      .map(i => ({ materialId: Number(i.materialId), quantity: Number(i.quantity) }))
      .filter(i => Number.isFinite(i.materialId) && i.materialId > 0
                && Number.isFinite(i.quantity) && i.quantity > 0);

    if (cleaned.length === 0) return NextResponse.json({ usages: [], totalCost: 0, anyShortfall: false });

    // Dedup check — reject duplicate materialIds before entering the transaction
    const materialIdSet = new Set(cleaned.map(i => i.materialId));
    if (materialIdSet.size !== cleaned.length) {
      return NextResponse.json({ error: "duplicate materialId" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // Verify appointment belongs to this salon (inside tx — atomic with FIFO consumption)
      const [appt] = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.salonId, session.salonId)));
      if (!appt) throw new Error("appointment_not_found");

      // Verify every material belongs to this salon (inside tx — atomic)
      const ids = [...materialIdSet];
      const owned = await tx
        .select({ id: materials.id })
        .from(materials)
        .where(and(eq(materials.salonId, session.salonId), inArray(materials.id, ids)));
      if (owned.length !== materialIdSet.size) throw new Error("unknown_material");

      // Idempotency guard — reject if usage already committed for this appointment
      const existing = await tx
        .select({ id: appointmentMaterialUsage.id })
        .from(appointmentMaterialUsage)
        .where(eq(appointmentMaterialUsage.appointmentId, appointmentId))
        .limit(1);
      if (existing.length > 0) throw new Error("already_committed");

      const usages = [];
      let totalCost = 0;
      let anyShortfall = false;
      for (const it of cleaned) {
        const fifo = await consumeFifo(tx, session.salonId, it.materialId, it.quantity);
        const [row] = await tx
          .insert(appointmentMaterialUsage)
          .values({
            salonId: session.salonId,
            appointmentId,
            materialId: it.materialId,
            quantity: it.quantity.toFixed(2),
            totalCost: fifo.totalCost,
            lotsConsumed: fifo.consumed,
            shortfall: fifo.shortfall.toFixed(2),
          })
          .returning();
        usages.push(row);
        totalCost += fifo.totalCost;
        if (fifo.shortfall > 0) anyShortfall = true;
      }
      return { usages, totalCost, anyShortfall };
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "already_committed") {
      return NextResponse.json({ error: "Списание уже выполнено для этой записи" }, { status: 409 });
    }
    if (msg === "unknown_material") {
      return NextResponse.json({ error: "unknown material" }, { status: 400 });
    }
    if (msg === "appointment_not_found") {
      return NextResponse.json({ error: "appointment not found" }, { status: 404 });
    }
    console.error("Usage POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
