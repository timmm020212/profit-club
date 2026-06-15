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

    // Generate unique slug: transliterate cyrillic → latin, keep only [a-z0-9-]
    const TRANSLIT: Record<string, string> = {
      "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"e","ж":"zh","з":"z",
      "и":"i","й":"y","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r",
      "с":"s","т":"t","у":"u","ф":"f","х":"kh","ц":"ts","ч":"ch","ш":"sh","щ":"shch",
      "ъ":"","ы":"y","ь":"","э":"e","ю":"yu","я":"ya",
    };
    const transliterated = String(salonName).toLowerCase().split("")
      .map((ch: string) => TRANSLIT[ch] ?? ch)
      .join("");
    const base = transliterated
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 40)
      || "salon"; // fallback if name has no representable characters
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
    const err = error as { message?: string; cause?: { message?: string; code?: string; detail?: string } };
    const msg = err?.message ?? String(error);
    // Drizzle wraps PG errors; the actual reason lives in error.cause.
    const causeMsg = err?.cause?.message ?? "";
    const causeCode = err?.cause?.code ?? "";
    const fullDetail = [msg, causeCode && `[${causeCode}]`, causeMsg].filter(Boolean).join(" — ");
    console.error("Register error:", fullDetail, err?.cause);

    const probe = `${msg} ${causeMsg}`;
    if (/unique constraint/i.test(probe) && /slug/i.test(probe)) {
      return NextResponse.json({ error: "Слаг уже занят. Попробуйте другое название." }, { status: 400 });
    }
    if (/unique constraint/i.test(probe) && /email/i.test(probe)) {
      return NextResponse.json({ error: "Этот email уже зарегистрирован" }, { status: 400 });
    }
    // Specific common Supabase / Postgres failure modes — guide the user.
    if (/relation .* does not exist/i.test(probe) || causeCode === "42P01") {
      return NextResponse.json({
        error: "Таблица partner_users не существует в БД. Запустите db:push.",
        detail: fullDetail,
      }, { status: 500 });
    }
    if (/permission denied/i.test(probe) || causeCode === "42501") {
      return NextResponse.json({
        error: "У пользователя БД нет прав на partner_users. Проверьте Supabase RLS / роль.",
        detail: fullDetail,
      }, { status: 500 });
    }
    if (/connection|ECONNREFUSED|ETIMEDOUT|terminated|EAI_AGAIN/i.test(probe)) {
      return NextResponse.json({
        error: "Не удалось подключиться к БД. Проверьте DATABASE_URL и доступность Supabase.",
        detail: fullDetail,
      }, { status: 500 });
    }
    return NextResponse.json({ error: "Ошибка регистрации. Попробуйте ещё раз.", detail: fullDetail }, { status: 500 });
  }
}
