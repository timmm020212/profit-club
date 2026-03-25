import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    // Parse initData (URL-encoded string)
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return NextResponse.json({ valid: false, error: "No hash" }, { status: 401 });
    }

    // Build data_check_string: sorted key=value pairs excluding hash
    const entries: string[] = [];
    params.forEach((value, key) => {
      if (key !== "hash") entries.push(`${key}=${value}`);
    });
    entries.sort();
    const dataCheckString = entries.join("\n");

    // HMAC validation
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();
    const computedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (computedHash !== hash) {
      return NextResponse.json({ valid: false, error: "Invalid hash" }, { status: 401 });
    }

    // Check auth_date freshness (5 minutes)
    const authDate = parseInt(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return NextResponse.json({ valid: false, error: "Data expired" }, { status: 401 });
    }

    // Extract user
    const userJson = params.get("user");
    if (!userJson) {
      return NextResponse.json({ valid: false, error: "No user data" }, { status: 401 });
    }
    const user = JSON.parse(userJson);
    const telegramId = String(user.id);
    const telegramName = [user.first_name, user.last_name].filter(Boolean).join(" ");

    // Look up client
    let client: { id: number; name: string; phone: string } | null = null;
    try {
      const rows = await db
        .select({ id: clients.id, name: clients.name, phone: clients.phone })
        .from(clients)
        .where(eq(clients.telegramId, telegramId))
        .limit(1);
      if (rows.length > 0) {
        client = {
          id: rows[0].id,
          name: rows[0].name || "",
          phone: rows[0].phone || "",
        };
      }
    } catch (e) {
      console.error("Error looking up client:", e);
    }

    return NextResponse.json({
      valid: true,
      telegramId,
      telegramName,
      client,
    });
  } catch (error) {
    console.error("Mini App auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
