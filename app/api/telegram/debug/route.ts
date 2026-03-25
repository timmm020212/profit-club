import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasClientToken: !!process.env.TELEGRAM_BOT_TOKEN,
    clientTokenPrefix: process.env.TELEGRAM_BOT_TOKEN?.slice(0, 5) || "NONE",
    hasMastersToken: !!process.env.MASTERS_BOT_TOKEN,
    mastersTokenPrefix: process.env.MASTERS_BOT_TOKEN?.slice(0, 5) || "NONE",
    nextauthUrl: process.env.NEXTAUTH_URL || "NOT SET",
    hasDbUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  });
}
