import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rl = rateLimit(`login:${ip}`, 5, 60 * 1000); // 5 attempts per minute
    if (!rl.ok) return rateLimitResponse();

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
        { error: "Неверный телефон или пароль" },
        { status: 401 }
      );
    }

    const client = found[0];

    const storedPassword = client.password || "";
    let valid: boolean;

    // Support both bcrypt hashes and plain-text passwords (legacy)
    if (storedPassword.startsWith("$2")) {
      valid = await bcrypt.compare(password, storedPassword);
    } else {
      valid = storedPassword === password;
      // Migrate plaintext password to bcrypt on successful login
      if (valid) {
        const hash = await bcrypt.hash(password, 12);
        await db.update(clients).set({ password: hash }).where(eq(clients.id, client.id));
      }
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Неверный телефон или пароль" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      id: client.id,
      name: client.name,
      phone: client.phone,
      telegramId: client.telegramId || null,
      isVerified: client.isVerified,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Ошибка при входе" },
      { status: 500 }
    );
  }
}
