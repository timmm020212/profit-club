import { NextResponse } from "next/server";
import { db } from "@/db";
import { telegramVerificationCodes } from "@/db/schema";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Reuse the same bot-username resolution used by the register route
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

export async function POST() {
  try {
    // "LOGIN_" (6 chars) + 4 hex chars = 10 chars — fits the code column (length: 10)
    const code = "LOGIN_" + crypto.randomBytes(2).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    await db.insert(telegramVerificationCodes).values({
      code,
      telegramId: "pending", // Will be filled by the bot when the user opens the deep link
      expiresAt,
      isUsed: false,
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
