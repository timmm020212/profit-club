// app/api/miniapp/register/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

function validateInitData(initData: string, botToken: string): { valid: boolean; user?: any } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false };

  const entries: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") entries.push(`${key}=${value}`);
  });
  entries.sort();
  const dataCheckString = entries.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return { valid: false };

  const authDate = parseInt(params.get("auth_date") || "0");
  if (Math.floor(Date.now() / 1000) - authDate > 300) return { valid: false };

  const userJson = params.get("user");
  if (!userJson) return { valid: false };

  return { valid: true, user: JSON.parse(userJson) };
}

export async function POST(request: Request) {
  try {
    const { initData, name, phone } = await request.json();

    if (!initData || !name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    const { valid, user } = validateInitData(initData, botToken);
    if (!valid || !user) {
      return NextResponse.json({ error: "Invalid Telegram data" }, { status: 401 });
    }

    const telegramId = String(user.id);

    // Check if already registered
    const existing = await db.select({ id: clients.id }).from(clients)
      .where(eq(clients.telegramId, telegramId)).limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ success: true, alreadyRegistered: true });
    }

    // Check if phone already taken
    const phoneExists = await db.select({ id: clients.id }).from(clients)
      .where(eq(clients.phone, phone.trim())).limit(1);

    if (phoneExists.length > 0) {
      // Link telegramId to existing account
      await db.update(clients)
        .set({ telegramId, isVerified: true, verifiedAt: new Date().toISOString() })
        .where(eq(clients.id, phoneExists[0].id));
    } else {
      // Create new client
      await db.insert(clients).values({
        name: name.trim(),
        phone: phone.trim(),
        telegramId,
        isVerified: true,
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      });
    }

    // Return success immediately — client is registered
    // Send welcome message and set menu button in background (non-blocking)
    const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const welcomeText = `Добро пожаловать, ${name.trim()}! 👋\n\nВыберите действие:`;

    // Fire and forget — send welcome + set menu button
    const tgApi = (method: string, body: any) =>
      fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }).then(r => r.json()).then(r => {
        if (!r.ok) console.error(`Telegram ${method} error:`, r.description);
      }).catch(e => console.error(`Telegram ${method} failed:`, e.message));

    tgApi("sendMessage", {
      chat_id: telegramId,
      text: welcomeText,
      reply_markup: {
        inline_keyboard: [
          [{ text: "📅 Записаться", web_app: { url: `${SITE_URL}/miniapp` } }],
          [{ text: "👤 Мои записи", callback_data: "my_appointments" }],
          [{ text: "ℹ️ О нас", callback_data: "about" }],
        ],
      },
    });

    if (SITE_URL.startsWith("https://")) {
      tgApi("setChatMenuButton", {
        chat_id: telegramId,
        menu_button: {
          type: "web_app",
          text: "📅 Записаться",
          web_app: { url: `${SITE_URL}/miniapp` },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
