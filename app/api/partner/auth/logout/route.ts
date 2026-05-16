import { NextResponse } from "next/server";
import { PARTNER_COOKIE } from "@/lib/partner-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PARTNER_COOKIE);
  return res;
}
