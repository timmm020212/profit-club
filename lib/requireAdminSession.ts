import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { db } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AdminPermission =
  | "schedule" | "bookings" | "masters" | "bots" | "optimize" | "inventory";

export interface AdminSessionData {
  role: "salonAdmin" | "admin";   // "admin" = legacy global platform admin (god-mode)
  adminId: number | null;          // null for legacy
  salonId: number | null;          // null for legacy global admin
  name: string;
  perms: Record<AdminPermission, boolean>;
}

type RequireAdminResult =
  | { session: AdminSessionData; response: null }
  | { session: null; response: NextResponse };

/**
 * Guards admin API routes.
 *   requireAdminSession()           - require any admin (salon or legacy).
 *   requireAdminSession("schedule") - additionally require the permission.
 *
 * For salon admins, performs a live DB lookup to enforce:
 *   - isActive must be true
 *   - sessionsInvalidatedAt must be older than the JWT's issuedAt
 *   - the specific permission flag must be true (if `perm` is supplied)
 *
 * For legacy global admins (`role === "admin"`), all permissions are granted
 * and the live lookup is skipped. They get god-mode access for backward
 * compatibility while migration to salon_admins is in progress.
 */
export async function requireAdminSession(perm?: AdminPermission): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "salonAdmin" && session.user.role !== "admin")) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Legacy platform admin — full god-mode, no DB lookup.
  if (session.user.role === "admin") {
    return {
      session: {
        role: "admin",
        adminId: null,
        salonId: null,
        name: session.user.name,
        perms: { schedule: true, bookings: true, masters: true, bots: true, optimize: true, inventory: true },
      },
      response: null,
    };
  }

  // salonAdmin: live lookup
  if (!session.user.adminId || !session.user.salonId) {
    return { session: null, response: NextResponse.json({ error: "Malformed session" }, { status: 401 }) };
  }
  const [a] = await db.select().from(salonAdmins).where(eq(salonAdmins.id, session.user.adminId)).limit(1);
  if (!a || !a.isActive || a.archivedAt) {
    return { session: null, response: NextResponse.json({ error: "Account disabled" }, { status: 401 }) };
  }
  if (a.sessionsInvalidatedAt && session.user.issuedAt
      && session.user.issuedAt * 1000 < a.sessionsInvalidatedAt.getTime()) {
    return { session: null, response: NextResponse.json({ error: "Session revoked" }, { status: 401 }) };
  }
  if (a.forcePasswordReset) {
    return { session: null, response: NextResponse.json({ error: "Password change required" }, { status: 403 }) };
  }
  const perms = {
    schedule:  a.canEditSchedule,
    bookings:  a.canEditBookings,
    masters:   a.canEditMasters,
    bots:      a.canEditBotFlows,
    optimize:  a.canRunOptimization,
    inventory: a.canEditInventory,
  };
  if (perm && !perms[perm]) {
    return { session: null, response: NextResponse.json({ error: "Forbidden", missingPermission: perm }, { status: 403 }) };
  }
  return {
    session: {
      role: "salonAdmin",
      adminId: a.id,
      salonId: a.salonId,
      name: a.name,
      perms,
    },
    response: null,
  };
}
