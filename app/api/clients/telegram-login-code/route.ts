import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, telegramVerificationCodes } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

async function getBotUsername(): Promise<string> {
  if (process.env.TELEGRAM_BOT_USERNAME) {
    return process.env.TELEGRAM_BOT_USERNAME;
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  if (botToken) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.result?.username) {
          return data.result.username;
        }
      }
    } catch {
      // Fall through to default
    }
  }

  return "ProfitClub_bot";
}

export async function POST(request: Request) {
  try {
    const code = "LOGIN_" + crypto.randomBytes(2).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Try to get phone from request body (optional)
    let phone: string | undefined;
    try {
      const body = await request.json();
      if (body?.phone) phone = String(body.phone).trim();
    } catch {}

    // If phone provided, verify the client exists
    if (phone) {
      const existing = await db.select({ id: clients.id })
        .from(clients)
        .where(eq(clients.phone, phone))
        .limit(1);
      if (!existing.length) phone = undefined; // client not found, ignore phone
    }

    await db.insert(telegramVerificationCodes).values({
      code,
      telegramId: "pending",
      phone: phone || null,
      expiresAt,
      isUsed: false,
      createdAt: new Date().toISOString(),
    });

    const botUsername = await getBotUsername();

    return NextResponse.json({
      code,
      botUrl: `https://t.me/${botUsername}?start=${code}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ошибка генерации кода" },
      { status: 500 }
    );
  }
}
