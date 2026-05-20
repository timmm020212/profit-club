import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VALID_RANKS = ["main", "secondary"] as const;
const PERM_FIELDS = ["canEditSchedule", "canEditBookings", "canEditMasters", "canEditBotFlows", "canRunOptimization", "canEditInventory"] as const;

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
    if (typeof body?.rank === "string" && VALID_RANKS.includes(body.rank)) patch.rank = body.rank;
    if (typeof body?.isActive === "boolean") patch.isActive = body.isActive;
    for (const k of PERM_FIELDS) {
      if (typeof body?.[k] === "boolean") patch[k] = body[k];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }

    const [row] = await dbRetry(() => db
      .update(salonAdmins)
      .set(patch)
      .where(and(eq(salonAdmins.id, id), eq(salonAdmins.salonId, session.salonId)))
      .returning({
        id: salonAdmins.id,
        salonId: salonAdmins.salonId,
        username: salonAdmins.username,
        name: salonAdmins.name,
        rank: salonAdmins.rank,
        isActive: salonAdmins.isActive,
        forcePasswordReset: salonAdmins.forcePasswordReset,
        lastLoginAt: salonAdmins.lastLoginAt,
        sessionsInvalidatedAt: salonAdmins.sessionsInvalidatedAt,
        canEditSchedule: salonAdmins.canEditSchedule,
        canEditBookings: salonAdmins.canEditBookings,
        canEditMasters: salonAdmins.canEditMasters,
        canEditBotFlows: salonAdmins.canEditBotFlows,
        canRunOptimization: salonAdmins.canRunOptimization,
        canEditInventory: salonAdmins.canEditInventory,
        createdAt: salonAdmins.createdAt,
        archivedAt: salonAdmins.archivedAt,
      })
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Salon-admins PATCH:", msg);
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

    // Must be deactivated first (safety: don't archive an active admin)
    const [existing] = await dbRetry(() => db.select({ id: salonAdmins.id, isActive: salonAdmins.isActive })
      .from(salonAdmins)
      .where(and(eq(salonAdmins.id, id), eq(salonAdmins.salonId, session.salonId)))
      .limit(1));
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (existing.isActive) return NextResponse.json({ error: "Деактивируйте администратора перед удалением" }, { status: 400 });

    await dbRetry(() => db.update(salonAdmins)
      .set({ archivedAt: new Date() })
      .where(eq(salonAdmins.id, id))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Salon-admins DELETE:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
