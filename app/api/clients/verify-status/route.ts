import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, pendingClients } from "@/db/schema-sqlite";
import { eq } from "drizzle-orm";

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

    // Ищем клиента по коду подтверждения
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

    // Если клиент подтвержден, также сохраняем в localStorage через ответ
    if (client[0].isVerified) {
      return NextResponse.json({
        verified: true,
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

