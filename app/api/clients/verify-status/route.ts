import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, pendingClients, telegramVerificationCodes } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Код подтверждения не указан" },
        { status: 400 }
      );
    }

    // LOGIN_ codes — check telegramVerificationCodes table
    if (code.startsWith("LOGIN_")) {
      const codeRow = await db.select().from(telegramVerificationCodes)
        .where(eq(telegramVerificationCodes.code, code))
        .limit(1);

      if (!codeRow.length) {
        return NextResponse.json({ verified: false, error: "Код не найден" }, { status: 404 });
      }

      if (!codeRow[0].isUsed) {
        return NextResponse.json({ verified: false, telegramId: null });
      }

      // Code was used by bot — find the client by telegramId
      const telegramId = codeRow[0].telegramId;
      if (!telegramId || telegramId === "pending") {
        return NextResponse.json({ verified: false, telegramId: null });
      }

      const client = await db.select().from(clients)
        .where(eq(clients.telegramId, telegramId))
        .limit(1);

      if (client.length > 0) {
        return NextResponse.json({
          verified: true,
          id: client[0].id,
          telegramId: client[0].telegramId,
          name: client[0].name,
          phone: client[0].phone,
        });
      }

      return NextResponse.json({ verified: false, telegramId: null });
    }

    // Regular verification codes — existing logic
    const client = await db.select().from(clients).where(eq(clients.verificationCode, code)).limit(1);

    if (client.length === 0) {
      const pending = await db
        .select()
        .from(pendingClients)
        .where(eq(pendingClients.verificationCode, code))
        .limit(1);

      if (pending.length > 0) {
        return NextResponse.json({
          verified: false,
          telegramId: null,
        });
      }

      return NextResponse.json(
        { verified: false, error: "Неверный код подтверждения" },
        { status: 404 }
      );
    }

    if (client[0].isVerified) {
      return NextResponse.json({
        verified: true,
        id: client[0].id,
        telegramId: client[0].telegramId || null,
        name: client[0].name,
        phone: client[0].phone,
      });
    }

    return NextResponse.json({
      verified: false,
      telegramId: null,
    });
  } catch (error) {
    console.error("Error checking verification status:", error);
    return NextResponse.json(
      { error: "Ошибка при проверке статуса" },
      { status: 500 }
    );
  }
}

