import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salons, partnerUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signPartnerToken, PARTNER_COOKIE } from "@/lib/partner-auth";

export async function POST(request: NextRequest) {
  try {
    const { inviteToken, email, password, ownerName, phone } = await request.json();
    if (!inviteToken || !email || !password) {
      return NextResponse.json({ error: "inviteToken, email, password required" }, { status: 400 });
    }

    const [salon] = await db.select().from(salons).where(eq(salons.inviteToken, inviteToken));
    if (!salon) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });

    const existing = await db.select().from(partnerUsers).where(eq(partnerUsers.salonId, salon.id));
    if (existing.length > 0) return NextResponse.json({ error: "Already registered" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);

    await db.update(salons).set({
      ownerName: ownerName || salon.ownerName,
      phone: phone || salon.phone,
      isActive: true,
      inviteToken: null,
    }).where(eq(salons.id, salon.id));

    const [partnerUser] = await db.insert(partnerUsers).values({
      salonId: salon.id,
      email,
      passwordHash,
    }).returning();

    const token = await signPartnerToken({
      salonId: salon.id,
      salonSlug: salon.slug,
      salonName: salon.name,
      partnerUserId: partnerUser.id,
      email,
    });

    const res = NextResponse.json({ ok: true, salonSlug: salon.slug });
    res.cookies.set(PARTNER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
