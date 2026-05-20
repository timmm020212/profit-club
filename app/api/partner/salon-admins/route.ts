import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,50}$/;
const PASSWORD_MIN = 8;
const VALID_RANKS = ["main", "secondary"] as const;

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";
  try {
    const rows = await dbRetry(() => db
      .select({
        id: salonAdmins.id,
        username: salonAdmins.username,
        name: salonAdmins.name,
        rank: salonAdmins.rank,
        isActive: salonAdmins.isActive,
        forcePasswordReset: salonAdmins.forcePasswordReset,
        lastLoginAt: salonAdmins.lastLoginAt,
        sessionsInvalidatedAt: salonAdmins.sessionsInvalidatedAt,
        archivedAt: salonAdmins.archivedAt,
        canEditSchedule: salonAdmins.canEditSchedule,
        canEditBookings: salonAdmins.canEditBookings,
        canEditMasters:  salonAdmins.canEditMasters,
        canEditBotFlows: salonAdmins.canEditBotFlows,
        canRunOptimization: salonAdmins.canRunOptimization,
        canEditInventory: salonAdmins.canEditInventory,
        createdAt: salonAdmins.createdAt,
      })
      .from(salonAdmins)
      .where(includeArchived
        ? eq(salonAdmins.salonId, session.salonId)
        : and(eq(salonAdmins.salonId, session.salonId), isNull(salonAdmins.archivedAt)))
      .orderBy(asc(salonAdmins.name))
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Salon-admins GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const rank = typeof body?.rank === "string" ? body.rank : "secondary";

    if (!USERNAME_RE.test(username)) return NextResponse.json({ error: "Логин должен быть 3-50 латинских букв/цифр/_-" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
    if (password.length < PASSWORD_MIN) return NextResponse.json({ error: `Пароль ≥ ${PASSWORD_MIN} символов` }, { status: 400 });
    if (!VALID_RANKS.includes(rank as typeof VALID_RANKS[number])) return NextResponse.json({ error: "Неверный статус" }, { status: 400 });

    // Global uniqueness check (username is GLOBALLY unique — not per-salon)
    const [existing] = await dbRetry(() => db.select({ id: salonAdmins.id })
      .from(salonAdmins)
      .where(eq(salonAdmins.username, username))
      .limit(1));
    if (existing) return NextResponse.json({ error: "Логин уже занят" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const [row] = await dbRetry(() => db
      .insert(salonAdmins)
      .values({
        salonId: session.salonId,
        username,
        name,
        rank,
        passwordHash,
        // Permissions from body (defaults applied)
        canEditSchedule:    body.canEditSchedule    !== false,
        canEditBookings:    body.canEditBookings    !== false,
        canEditMasters:     body.canEditMasters     === true,
        canEditBotFlows:    body.canEditBotFlows    === true,
        canRunOptimization: body.canRunOptimization === true,
        canEditInventory:   body.canEditInventory   === true,
      })
      .returning()
    );
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Salon-admins POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
