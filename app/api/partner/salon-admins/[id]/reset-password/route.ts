import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const body = await req.json();
    const password = typeof body?.password === "string" ? body.password : "";
    if (password.length < 8) return NextResponse.json({ error: "Пароль ≥ 8 символов" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    const [row] = await dbRetry(() => db.update(salonAdmins)
      .set({
        passwordHash,
        forcePasswordReset: true,
        sessionsInvalidatedAt: new Date(),
      })
      .where(and(eq(salonAdmins.id, id), eq(salonAdmins.salonId, session.salonId)))
      .returning({ id: salonAdmins.id })
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Reset-password:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
