import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { db } from "@/db/index-postgres";
import { salonAdmins, admins } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AdminPermission =
  | "schedule" | "bookings" | "masters" | "bots" | "optimize" | "inventory";

type RequireAdminResult =
  | { session: Session; response: null }
  | { session: null; response: NextResponse };

/**
 * Guards admin API routes.
 *
 * Backwards compatible: existing callers using `const { response } = await requireAdminSession(); if (response) return response;`
 * pattern continue to work. `session.user.X` access (existing pattern) continues to work — the helper returns
 * the raw NextAuth session.
 *
 * For salonAdmin role: live DB lookup overwrites `session.user.perms` with fresh values from `salon_admins`,
 * enforces `isActive`, `archivedAt`, `sessionsInvalidatedAt vs issuedAt`, `forcePasswordReset`, and (if `perm` arg
 * given) the specific permission flag.
 *
 * For legacy `admin` role: lightweight live lookup on `admins.isActive` so deactivation revokes sessions.
 * God-mode perms (all true) are kept on the session.
 */
export async function requireAdminSession(perm?: AdminPermission): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "salonAdmin" && session.user.role !== "admin")) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Legacy platform admin — god-mode but live isActive check
  if (session.user.role === "admin") {
    const adminIdNum = Number(session.user.id);
    if (!Number.isFinite(adminIdNum)) {
      return { session: null, response: NextResponse.json({ error: "Malformed session" }, { status: 401 }) };
    }
    const [pa] = await db.select({ isActive: admins.isActive }).from(admins).where(eq(admins.id, adminIdNum)).limit(1);
    if (!pa || !pa.isActive) {
      return { session: null, response: NextResponse.json({ error: "Account disabled" }, { status: 401 }) };
    }
    // perms in legacy mode are all true; session.user.perms already snapshot to all-true at login
    return { session, response: null };
  }

  // salonAdmin: live lookup
  if (!session.user.adminId || !session.user.salonId) {
    return { session: null, response: NextResponse.json({ error: "Malformed session" }, { status: 401 }) };
  }
  const [a] = await db.select().from(salonAdmins).where(eq(salonAdmins.id, session.user.adminId)).limit(1);
  if (!a || !a.isActive || a.archivedAt) {
    return { session: null, response: NextResponse.json({ error: "Account disabled" }, { status: 401 }) };
  }
  // Fail-closed: if invalidatedAt is set, ANY JWT without a valid issuedAt is rejected.
  if (a.sessionsInvalidatedAt) {
    const issuedAt = session.user.issuedAt;
    if (!issuedAt || issuedAt * 1000 < a.sessionsInvalidatedAt.getTime()) {
      return { session: null, response: NextResponse.json({ error: "Session revoked" }, { status: 401 }) };
    }
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
  // Overwrite the snapshot in session.user.perms with fresh DB values so callers see live state.
  session.user.perms = perms;
  return { session, response: null };
}
