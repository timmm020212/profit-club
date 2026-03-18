import { NextResponse } from "next/server";
import { db, testConnection } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        { error: "Не удалось подключиться к базе данных. Убедитесь, что PostgreSQL запущен и доступен." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const phone = String(body?.phone || "").trim();
    const password = String(body?.password || "");

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Телефон и пароль обязательны" },
        { status: 400 }
      );
    }

    const found = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1);

    if (found.length === 0) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const client = found[0];

    if (!client.isVerified) {
      return NextResponse.json(
        { error: "Аккаунт не подтверждён через Telegram" },
        { status: 403 }
      );
    }

    if ((client.password || "") !== password) {
      return NextResponse.json(
        { error: "Неверный пароль" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      name: client.name,
      telegramId: client.telegramId || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ошибка при входе" },
      { status: 500 }
    );
  }
}
