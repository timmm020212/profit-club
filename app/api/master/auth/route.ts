import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { masters } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json({ error: "Missing initData" }, { status: 400 });
    }

    const botToken = process.env.MASTERS_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return NextResponse.json({ valid: false, error: "No hash" }, { status: 401 });
    }

    const entries: string[] = [];
    params.forEach((value, key) => {
      if (key !== "hash") entries.push(`${key}=${value}`);
    });
    entries.sort();
    const dataCheckString = entries.join("\n");

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

    const authDate = parseInt(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 300) {
      return NextResponse.json({ valid: false, error: "Data expired" }, { status: 401 });
    }

    const userJson = params.get("user");
    if (!userJson) {
      return NextResponse.json({ valid: false, error: "No user data" }, { status: 401 });
    }
    const user = JSON.parse(userJson);
    const telegramId = String(user.id);

    const rows = await db
      .select({
        id: masters.id,
        fullName: masters.fullName,
        specialization: masters.specialization,
        photoUrl: masters.photoUrl,
      })
      .from(masters)
      .where(eq(masters.telegramId, telegramId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ valid: false, error: "Not a master" }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      master: rows[0],
    });
  } catch (error) {
    console.error("Master auth error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}
