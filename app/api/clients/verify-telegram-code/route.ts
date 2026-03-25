import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, pendingClients, telegramVerificationCodes } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log("=== verify-telegram-code endpoint called ===");
    
    let body;
    try {
      body = await request.json();
      console.log("Request body:", body);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Неверный формат данных" },
        { status: 400 }
      );
    }
    
    const { code, phone } = body;
    console.log("Extracted code:", code, "phone:", phone);

    // Валидация
    if (!code || !phone) {
      console.log("Validation failed: missing code or phone");
      return NextResponse.json(
        { error: "Код и телефон обязательны для заполнения" },
        { status: 400 }
      );
    }

    // Нормализуем код (убираем пробелы, приводим к верхнему регистру)
    const normalizedCode = code.toString().trim().toUpperCase();
    console.log("Normalized code:", normalizedCode);
    
    // Ищем код в таблице telegram_verification_codes
    console.log("Searching for code in database...");
    const verificationRecord = await db
      .select()
      .from(telegramVerificationCodes)
      .where(
        and(
          eq(telegramVerificationCodes.code, normalizedCode),
          eq(telegramVerificationCodes.isUsed, false),
          gt(telegramVerificationCodes.expiresAt, new Date())
        )
      );
    
    console.log(`Found ${verificationRecord.length} matching codes`);

    if (verificationRecord.length === 0) {
      return NextResponse.json(
        { error: "Неверный код подтверждения или код истек. Получите новый код в Telegram боте." },
        { status: 404 }
      );
    }

    const codeRecord = verificationRecord[0];
    const telegramId = codeRecord.telegramId;

    if (codeRecord.phone && codeRecord.phone !== phone) {
      return NextResponse.json(
        { error: "Телефон не совпадает с кодом подтверждения" },
        { status: 400 }
      );
    }

    // Ищем клиента по телефону
    const client = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1);
    let userClient = client[0];

    if (!userClient) {
      const pending = await db.select().from(pendingClients).where(eq(pendingClients.phone, phone)).limit(1);
      if (pending.length === 0) {
        return NextResponse.json(
          { error: "Клиент с таким телефоном не найден. Пожалуйста, сначала зарегистрируйтесь на сайте." },
          { status: 404 }
        );
      }

      const pendingRow = pending[0];
      const inserted = await db
        .insert(clients)
        .values({
          name: pendingRow.name,
          phone: pendingRow.phone,
          email: pendingRow.email || null,
          password: pendingRow.password || null,
          verificationCode: pendingRow.verificationCode,
          isVerified: true,
          telegramId,
          createdAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        })
        .returning();

      userClient = inserted[0];

      await db.delete(pendingClients).where(eq(pendingClients.id, pendingRow.id));
    }

    // Проверяем, не подтвержден ли уже этот клиент другим Telegram ID
    if (userClient.isVerified && userClient.telegramId && userClient.telegramId !== telegramId) {
      return NextResponse.json(
        { 
          error: "Этот аккаунт уже подтвержден другим Telegram аккаунтом",
          telegramId: userClient.telegramId 
        },
        { status: 409 }
      );
    }

    // Если уже подтвержден этим же Telegram ID
    if (userClient.isVerified && userClient.telegramId === telegramId) {
      // Помечаем код как использованный
      await db
        .update(telegramVerificationCodes)
        .set({ isUsed: true })
        .where(eq(telegramVerificationCodes.id, codeRecord.id));

      return NextResponse.json({
        success: true,
        verified: true,
        telegramId: telegramId,
        message: "Аккаунт уже подтвержден",
      });
    }

    // Сохраняем Telegram ID и подтверждаем регистрацию
    await db
      .update(clients)
      .set({
        isVerified: true,
        telegramId: telegramId,
        verifiedAt: new Date().toISOString(),
      })
      .where(eq(clients.id, userClient.id));

    await db.delete(pendingClients).where(eq(pendingClients.phone, userClient.phone));

    // Помечаем код как использованный
    await db
      .update(telegramVerificationCodes)
      .set({ isUsed: true })
      .where(eq(telegramVerificationCodes.id, codeRecord.id));

    console.log(`Client ${userClient.id} verified with Telegram ID: ${telegramId}`);

    return NextResponse.json({
      success: true,
      verified: true,
      telegramId: telegramId,
      message: "Telegram ID успешно сохранен! Теперь вы будете получать уведомления.",
    });
  } catch (error: any) {
    console.error("Error verifying telegram code:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    
    // Более детальное сообщение об ошибке
    let errorMessage = "Ошибка при проверке кода";
    if (error?.code === "ECONNREFUSED" || error?.code === "ETIMEDOUT") {
      errorMessage = "Ошибка подключения к базе данных. Проверьте настройки подключения.";
    } else if (error?.message) {
      errorMessage = `Ошибка: ${error.message}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

