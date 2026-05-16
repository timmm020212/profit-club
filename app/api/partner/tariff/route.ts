import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { tariff } = await request.json();
  if (!["basic", "advanced", "pro"].includes(tariff)) {
    return NextResponse.json({ error: "Invalid tariff" }, { status: 400 });
  }

  await db.update(salons).set({ tariff }).where(eq(salons.id, session.salonId));
  return NextResponse.json({ ok: true });
}
