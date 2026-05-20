import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "salonAdmin" || !session.user.adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 8) return NextResponse.json({ error: "Новый пароль ≥ 8 символов" }, { status: 400 });
    if (oldPassword === newPassword) return NextResponse.json({ error: "Новый пароль совпадает со старым" }, { status: 400 });

    const [a] = await dbRetry(() => db.select().from(salonAdmins).where(eq(salonAdmins.id, session.user.adminId!)).limit(1));
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
    const oldOk = await bcrypt.compare(oldPassword, a.passwordHash);
    if (!oldOk) return NextResponse.json({ error: "Текущий пароль неверен" }, { status: 400 });

    const newHash = await bcrypt.hash(newPassword, 10);
    await dbRetry(() => db.update(salonAdmins)
      .set({
        passwordHash: newHash,
        forcePasswordReset: false,
        sessionsInvalidatedAt: new Date(),
      })
      .where(eq(salonAdmins.id, a.id))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Change-password:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
