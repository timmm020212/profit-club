import { NextResponse } from "next/server";
import { db, testConnection } from "@/db";
import { clients, pendingClients } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

// Генерация уникального кода подтверждения
function generateVerificationCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Получение username бота
async function getBotUsername(): Promise<string> {
  // Сначала проверяем переменную окружения
  if (process.env.TELEGRAM_BOT_USERNAME) {
    return process.env.TELEGRAM_BOT_USERNAME;
  }
  
  // Пытаемся получить username из API Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.result?.username) {
        console.log("Bot username from API:", data.result.username);
        return data.result.username;
      }
    }
  } catch (error) {
    console.error("Error fetching bot username from API:", error);
  }
  
  // Fallback на дефолтное значение
  const defaultUsername = "Profit_Clup_stv_bot";
  console.log("Using default bot username:", defaultUsername);
  return defaultUsername;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const rl = rateLimit(`register:${ip}`, 3, 60 * 60 * 1000); // 3 registrations per hour
  if (!rl.ok) return rateLimitResponse();

  try {
    // Проверяем подключение к базе данных перед обработкой запроса
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error("Database connection test failed");
      return NextResponse.json(
        { error: "Не удалось подключиться к базе данных. Убедитесь, что PostgreSQL запущен и доступен." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, phone, email, password } = body;

    console.log("Registration request received:", { name, phone, email: email ? "provided" : "not provided" });

    // Валидация
    if (!name || !phone || !password) {
      console.error("Validation failed: missing required fields");
      return NextResponse.json(
        { error: "Имя, телефон и пароль обязательны для заполнения" },
        { status: 400 }
      );
    }

    // Проверяем, не зарегистрирован ли уже пользователь с таким телефоном (подтверждённый)
    let existingClient;
    try {
      existingClient = await db.select().from(clients).where(eq(clients.phone, phone)).limit(1);
    } catch (dbError: any) {
      console.error("Database error when checking existing client:", dbError);
      
      // Более детальная обработка ошибок подключения
      let errorMessage = "Ошибка подключения к базе данных.";
      
      if (dbError?.code === "ECONNREFUSED" || dbError?.code === "ETIMEDOUT") {
        errorMessage = "Не удалось подключиться к базе данных. Убедитесь, что PostgreSQL запущен.";
      } else if (dbError?.code === "3D000") {
        errorMessage = "База данных не найдена. Проверьте настройки подключения.";
      } else if (dbError?.code === "28P01") {
        errorMessage = "Неверные учетные данные для подключения к базе данных.";
      } else if (dbError?.message) {
        errorMessage = `Ошибка базы данных: ${dbError.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    if (existingClient.length > 0 && existingClient[0].isVerified) {
      console.log("Client already verified:", phone);
      return NextResponse.json(
        { error: "Пользователь с таким телефоном уже зарегистрирован и подтвержден" },
        { status: 409 }
      );
    }

    // Создаем/обновляем черновик регистрации (до подтверждения через Telegram)
    const verificationCode = generateVerificationCode();
    const hashedPassword = await bcrypt.hash(password, 12);

    const existingPending = await db
      .select()
      .from(pendingClients)
      .where(eq(pendingClients.phone, phone))
      .limit(1);

    if (existingPending.length > 0) {
      await db
        .update(pendingClients)
        .set({
          name: name,
          email: email || null,
          password: hashedPassword,
          verificationCode,
        })
        .where(eq(pendingClients.id, existingPending[0].id));
    } else {
      await db.insert(pendingClients).values({
        name: name,
        phone,
        email: email || null,
        password: password,
        verificationCode,
        createdAt: new Date().toISOString(),
      });
    }

    const botUsername = await getBotUsername();
    return NextResponse.json({
      success: true,
      verificationCode,
      botUsername,
    });
  } catch (error: any) {
    console.error("Error registering client:", error);
    
    // Проверяем, если это ошибка парсинга JSON
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      return NextResponse.json(
        { error: "Неверный формат данных" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error?.message || "Ошибка при регистрации. Попробуйте еще раз." },
      { status: 500 }
    );
  }
}

