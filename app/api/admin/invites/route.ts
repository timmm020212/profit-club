import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdminSession";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { response } = await requireAdminSession();
  if (response) return response;

  try {
    const { salonName, ownerName, phone, inn, city } = await request.json();
    if (!salonName) return NextResponse.json({ error: "salonName required" }, { status: 400 });

    const inviteToken = randomBytes(32).toString("hex");
    const slug =
      salonName
        .toLowerCase()
        .replace(/[^a-zа-яё0-9\s]/gi, "")
        .trim()
        .replace(/\s+/g, "-")
        .substring(0, 50) +
      "-" +
      Date.now().toString(36);

    const [salon] = await db
      .insert(salons)
      .values({
        slug,
        name: salonName,
        ownerName: ownerName || null,
        phone: phone || null,
        inn: inn || null,
        city: city || null,
        tariff: "basic",
        isActive: false,
        inviteToken,
      })
      .returning();

    const inviteUrl = `${process.env.NEXTAUTH_URL}/partner/join?invite=${inviteToken}`;
    return NextResponse.json({ salon, inviteUrl });
  } catch (error) {
    console.error("Create invite error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const allSalons = await db.select().from(salons).orderBy(salons.createdAt);
  return NextResponse.json(allSalons);
}
