import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { partnerUsers, salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signPartnerToken, PARTNER_COOKIE } from "@/lib/partner-auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "email and password required" }, { status: 400 });

    const [user] = await db.select().from(partnerUsers).where(eq(partnerUsers.email, email));
    if (!user) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

    const [salon] = await db.select().from(salons).where(eq(salons.id, user.salonId));
    if (!salon || !salon.isActive) return NextResponse.json({ error: "Салон не активен" }, { status: 403 });

    const token = await signPartnerToken({
      salonId: salon.id,
      salonSlug: salon.slug,
      salonName: salon.name,
      partnerUserId: user.id,
      email: user.email,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(PARTNER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
