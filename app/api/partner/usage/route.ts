import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { appointmentMaterialUsage, materials, appointments } from "@/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const sp = req.nextUrl.searchParams;
    const conds = [eq(appointmentMaterialUsage.salonId, session.salonId)];
    if (sp.get("appointmentId")) conds.push(eq(appointmentMaterialUsage.appointmentId, Number(sp.get("appointmentId"))));
    if (sp.get("materialId"))    conds.push(eq(appointmentMaterialUsage.materialId, Number(sp.get("materialId"))));
    if (sp.get("from")) conds.push(gte(appointments.appointmentDate, sp.get("from")!));
    if (sp.get("to"))   conds.push(lte(appointments.appointmentDate, sp.get("to")!));

    const rows = await dbRetry(() => db
      .select({
        id: appointmentMaterialUsage.id,
        appointmentId: appointmentMaterialUsage.appointmentId,
        materialId: appointmentMaterialUsage.materialId,
        materialName: materials.name,
        materialUnit: materials.unit,
        quantity: appointmentMaterialUsage.quantity,
        totalCost: appointmentMaterialUsage.totalCost,
        shortfall: appointmentMaterialUsage.shortfall,
        createdAt: appointmentMaterialUsage.createdAt,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        clientName: appointments.clientName,
      })
      .from(appointmentMaterialUsage)
      .innerJoin(materials, eq(materials.id, appointmentMaterialUsage.materialId))
      .innerJoin(appointments, eq(appointments.id, appointmentMaterialUsage.appointmentId))
      .where(and(...conds))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime), desc(appointmentMaterialUsage.id))
      .limit(500)
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Usage GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
