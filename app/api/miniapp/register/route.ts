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

  const userJson = params.get("user");
  if (!userJson) return { valid: false };

  return { valid: true, user: JSON.parse(userJson) };
}

export async function POST(request: Request) {
  try {
    const { initData, name, phone, mid } = await request.json();

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
      await db.update(clients)
        .set({ telegramId, isVerified: true, verifiedAt: new Date().toISOString() })
        .where(eq(clients.id, phoneExists[0].id));
    } else {
      await db.insert(clients).values({
        name: name.trim(),
        phone: phone.trim(),
        telegramId,
        isVerified: true,
        createdAt: new Date().toISOString(),
        verifiedAt: new Date().toISOString(),
      });
    }

    // Return success immediately — Telegram calls run in background after response
    const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const welcomeText = `Добро пожаловать, ${name.trim()}! 👋\n\nВыберите действие:`;
    const welcomeKeyboard = {
      inline_keyboard: [
        [{ text: "📅 Записаться", web_app: { url: `${SITE_URL}/miniapp` } }],
        [{ text: "👤 Мои записи", callback_data: "my_appointments" }],
        [{ text: "ℹ️ О нас", callback_data: "about" }],
      ],
    };

    const tgApi = (method: string, body: any) =>
      fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(r => r.json()).catch(() => ({ ok: false }));

    // Fire Telegram calls without awaiting — return success immediately
    (async () => {
      let edited = false;
      if (mid) {
        const res = await tgApi("editMessageText", {
          chat_id: telegramId,
          message_id: Number(mid),
          text: welcomeText,
          reply_markup: welcomeKeyboard,
        });
        edited = !!res?.ok;
      }
      if (!edited) {
        await tgApi("sendMessage", { chat_id: telegramId, text: welcomeText, reply_markup: welcomeKeyboard });
      }
      if (SITE_URL.startsWith("https://")) {
        tgApi("setChatMenuButton", {
          chat_id: telegramId,
          menu_button: { type: "web_app", text: "📅 Записаться", web_app: { url: `${SITE_URL}/miniapp` } },
        });
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
