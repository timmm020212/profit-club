import { NextRequest, NextResponse } from "next/server";
import { db, dbRetry } from "@/db/index-postgres";
import { salons, partnerUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const { salonName, city, email, password } = await request.json();

    if (!salonName || !email || !password) {
      return NextResponse.json({ error: "salonName, email и password обязательны" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Пароль минимум 8 символов" }, { status: 400 });
    }

    const emailNorm = email.toLowerCase().trim();

    // Check email not taken
    const existing = await dbRetry(async () => {
      const [u] = await db.select().from(partnerUsers).where(eq(partnerUsers.email, emailNorm));
      return u;
    });
    if (existing) {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 400 });
    }

    // Generate unique slug from salon name
    const base = salonName
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 40);
    const slug = base + "-" + Date.now().toString(36);

    const passwordHash = await bcrypt.hash(password, 12);

    const salon = await dbRetry(async () => {
      const [s] = await db.insert(salons).values({
        slug,
        name: salonName,
        city: city || null,
        tariff: "basic",
        isActive: true,
      }).returning();
      return s;
    });

    await dbRetry(() => db.insert(partnerUsers).values({
      salonId: salon.id,
      email: emailNorm,
      passwordHash,
    }));

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Register error:", msg);
    return NextResponse.json({ error: "Ошибка регистрации. Попробуйте ещё раз." }, { status: 500 });
  }
}
