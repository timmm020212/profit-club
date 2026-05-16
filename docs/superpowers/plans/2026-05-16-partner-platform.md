# Partner Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить Profit Club в мульти-тенантную платформу — партнёры регистрируются по инвайту, получают свой кабинет и публичную страницу `/salon/[slug]` для клиентов.

**Architecture:** Расширяем текущий Next.js/Drizzle/PostgreSQL стек. Добавляем `salonId` ко всем ключевым таблицам. Существующий Profit Club становится салоном с id=1. Партнёрская аутентификация — отдельный JWT-куки `partner-token`, независимый от NextAuth.

**Tech Stack:** Next.js 15 App Router · TypeScript · Drizzle ORM · PostgreSQL (Supabase) · jose (JWT) · Tailwind

---

## Карта файлов

**Новые файлы:**
- `db/schema-postgres.ts` — дополнить таблицами `salons`, `partnerUsers`
- `lib/partner-auth.ts` — JWT утилиты для партнёров
- `lib/requirePartnerSession.ts` — защита partner API routes
- `scripts/seed-default-salon.ts` — создать дефолтный салон для Profit Club
- `app/partner/login/page.tsx` — форма входа партнёра
- `app/partner/join/page.tsx` — форма регистрации по инвайту
- `app/partner/tariff/page.tsx` — выбор тарифа
- `app/partner/layout.tsx` — общий лейаут с sidebar
- `components/partner/Sidebar.tsx` — боковая панель навигации
- `app/partner/dashboard/page.tsx` — главная кабинета
- `app/partner/bookings/page.tsx` — записи
- `app/partner/services/page.tsx` — услуги
- `app/partner/masters/page.tsx` — мастера
- `app/partner/schedule/page.tsx` — расписание
- `app/partner/profile/page.tsx` — профиль салона
- `app/partner/my-page/page.tsx` — ссылка + QR
- `app/partner/billing/page.tsx` — тариф и оплата
- `app/salon/[slug]/page.tsx` — публичная страница салона
- `app/api/partner/auth/login/route.ts`
- `app/api/partner/auth/logout/route.ts`
- `app/api/partner/register/route.ts`
- `app/api/partner/tariff/route.ts`
- `app/api/partner/dashboard/route.ts`
- `app/api/partner/bookings/route.ts`
- `app/api/partner/services/route.ts`
- `app/api/partner/masters/route.ts`
- `app/api/partner/profile/route.ts`
- `app/api/admin/invites/route.ts`
- `app/api/salon/[slug]/route.ts`

**Изменяемые файлы:**
- `db/schema-postgres.ts` — добавить `salonId` к `services`, `serviceCategories`, `serviceSubgroups`, `serviceVariants`, `masters`, `appointments`, `workSlots`
- `middleware.ts` — добавить защиту `/partner/*`
- `app/api/services/route.ts` — фильтровать по `salonId`
- `app/api/available-slots/route.ts` — фильтровать по `salonId`
- `app/api/appointments/route.ts` — проставлять `salonId`

---

## Task 1: DB Schema — новые таблицы salons и partnerUsers

**Files:**
- Modify: `db/schema-postgres.ts`
- Create: `scripts/seed-default-salon.ts`

- [ ] **Step 1: Добавить таблицы в схему**

Открыть `db/schema-postgres.ts`, добавить в конец файла перед последним экспортом:

```typescript
export const salons = pgTable("salons", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  phone: varchar("phone", { length: 30 }),
  logoUrl: text("logo_url"),
  ownerName: varchar("owner_name", { length: 200 }),
  inn: varchar("inn", { length: 20 }),
  tariff: varchar("tariff", { length: 20 }).notNull().default("basic"),
  isActive: boolean("is_active").notNull().default(false),
  inviteToken: varchar("invite_token", { length: 100 }).unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partnerUsers = pgTable("partner_users", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull().references(() => salons.id),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 200 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Salon = typeof salons.$inferSelect;
export type NewSalon = typeof salons.$inferInsert;
export type PartnerUser = typeof partnerUsers.$inferSelect;
export type NewPartnerUser = typeof partnerUsers.$inferInsert;
```

- [ ] **Step 2: Добавить salonId к ключевым таблицам**

В `db/schema-postgres.ts` добавить поле `salonId` в таблицы:

```typescript
// В таблицу serviceCategories добавить:
salonId: integer("salon_id").default(1),

// В таблицу serviceSubgroups добавить:
salonId: integer("salon_id").default(1),

// В таблицу services добавить:
salonId: integer("salon_id").default(1),

// В таблицу serviceVariants добавить:
salonId: integer("salon_id").default(1),

// В таблицу masters добавить:
salonId: integer("salon_id").default(1),

// В таблицу appointments добавить:
salonId: integer("salon_id").default(1),

// В таблицу workSlots добавить:
salonId: integer("salon_id").default(1),
```

- [ ] **Step 3: Применить схему к БД**

```bash
npm run db:push
```

Ожидаемый вывод: схема применена без ошибок.

- [ ] **Step 4: Создать скрипт seed дефолтного салона**

Создать `scripts/seed-default-salon.ts`:

```typescript
import { db } from '../db/index-postgres';
import { salons, partnerUsers } from '../db/schema';
import bcrypt from 'bcrypt';

async function seedDefaultSalon() {
  try {
    const [salon] = await db.insert(salons).values({
      id: 1,
      slug: 'profit-club',
      name: 'Profit Club',
      city: 'Москва',
      ownerName: 'Администратор',
      tariff: 'pro',
      isActive: true,
    }).onConflictDoNothing().returning();

    if (salon) {
      const hash = await bcrypt.hash('admin123', 10);
      await db.insert(partnerUsers).values({
        salonId: 1,
        email: 'admin@profit-club.ru',
        passwordHash: hash,
      }).onConflictDoNothing();
      console.log('✅ Default salon created: profit-club');
      console.log('   Login: admin@profit-club.ru / admin123');
    } else {
      console.log('ℹ️  Default salon already exists');
    }
  } catch (e) {
    console.error('❌ Error:', e);
  } finally {
    process.exit(0);
  }
}

seedDefaultSalon();
```

- [ ] **Step 5: Добавить скрипт в package.json**

В `package.json` в секцию `scripts` добавить:
```json
"db:seed-salon": "tsx scripts/seed-default-salon.ts"
```

- [ ] **Step 6: Запустить seed**

```bash
npm run db:seed-salon
```

- [ ] **Step 7: Commit**

```bash
git add db/schema-postgres.ts scripts/seed-default-salon.ts package.json
git commit -m "feat: add salons and partnerUsers tables, salonId to existing tables"
```

---

## Task 2: Partner Auth — JWT утилиты и middleware

**Files:**
- Create: `lib/partner-auth.ts`
- Create: `lib/requirePartnerSession.ts`
- Modify: `middleware.ts`

- [ ] **Step 1: Создать lib/partner-auth.ts**

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const SECRET = new TextEncoder().encode(
  process.env.PARTNER_JWT_SECRET || 'partner-dev-secret-change-in-prod'
);
const COOKIE = 'partner-token';
const EXPIRE = '30d';

export interface PartnerSession {
  salonId: number;
  salonSlug: string;
  salonName: string;
  partnerUserId: number;
  email: string;
}

export async function signPartnerToken(payload: PartnerSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(EXPIRE)
    .sign(SECRET);
}

export async function verifyPartnerToken(token: string): Promise<PartnerSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as PartnerSession;
  } catch {
    return null;
  }
}

export async function getPartnerSession(): Promise<PartnerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  return verifyPartnerToken(token);
}

export async function getPartnerSessionFromRequest(req: NextRequest): Promise<PartnerSession | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  return verifyPartnerToken(token);
}

export const PARTNER_COOKIE = COOKIE;
```

- [ ] **Step 2: Создать lib/requirePartnerSession.ts**

```typescript
import { NextResponse } from 'next/server';
import { getPartnerSession, PartnerSession } from './partner-auth';

export async function requirePartnerSession(): Promise<
  { session: PartnerSession; response: null } | { session: null; response: NextResponse }
> {
  const session = await getPartnerSession();
  if (!session) {
    return { session: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session, response: null };
}
```

- [ ] **Step 3: Обновить middleware.ts**

Заменить содержимое `middleware.ts`:

```typescript
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getPartnerSessionFromRequest } from "./lib/partner-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin protection via NextAuth
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const token = await getToken({ req: request });
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Partner dashboard protection
  if (
    pathname.startsWith("/partner") &&
    !pathname.startsWith("/partner/login") &&
    !pathname.startsWith("/partner/join") &&
    !pathname.startsWith("/partner/tariff")
  ) {
    const session = await getPartnerSessionFromRequest(request);
    if (!session) {
      return NextResponse.redirect(new URL("/partner/login", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    "/admin/((?!login).*)",
    "/partner/((?!login|join|tariff).*)",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

- [ ] **Step 4: Добавить PARTNER_JWT_SECRET в env**

В `.env.local` добавить:
```
PARTNER_JWT_SECRET=your-random-secret-here-change-in-production
```

- [ ] **Step 5: Commit**

```bash
git add lib/partner-auth.ts lib/requirePartnerSession.ts middleware.ts .env.local
git commit -m "feat: partner JWT auth utilities and middleware protection"
```

---

## Task 3: Invite System — создание инвайтов

**Files:**
- Create: `app/api/admin/invites/route.ts`

- [ ] **Step 1: Создать API создания инвайтов**

Создать `app/api/admin/invites/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/requireAdminSession";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function POST(request: NextRequest) {
  const { session, response } = await requireAdminSession();
  if (!session) return response;

  try {
    const { salonName, ownerName, phone, inn, city } = await request.json();
    if (!salonName) return NextResponse.json({ error: "salonName required" }, { status: 400 });

    const inviteToken = randomBytes(32).toString("hex");
    const slug = salonName
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 50) + "-" + Date.now().toString(36);

    const [salon] = await db.insert(salons).values({
      slug,
      name: salonName,
      ownerName: ownerName || null,
      phone: phone || null,
      inn: inn || null,
      city: city || null,
      tariff: "basic",
      isActive: false,
      inviteToken,
    }).returning();

    const inviteUrl = `${process.env.NEXTAUTH_URL}/partner/join?invite=${inviteToken}`;
    return NextResponse.json({ salon, inviteUrl });
  } catch (error) {
    console.error("Create invite error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function GET() {
  const { session, response } = await requireAdminSession();
  if (!session) return response;

  const allSalons = await db.select().from(salons).orderBy(salons.createdAt);
  return NextResponse.json(allSalons);
}
```

- [ ] **Step 2: Проверить вручную**

```bash
# Запустить dev-сервер
npm run dev

# В другом терминале — создать инвайт (нужна авторизованная сессия admin)
curl -X POST http://localhost:3000/api/admin/invites \
  -H "Content-Type: application/json" \
  -d '{"salonName":"Тест Салон","ownerName":"Иванов Иван","phone":"+79001234567"}'
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/invites/route.ts
git commit -m "feat: admin invite creation API"
```

---

## Task 4: Partner Registration — страница регистрации по инвайту

**Files:**
- Create: `app/partner/join/page.tsx`
- Create: `app/api/partner/register/route.ts`
- Create: `app/partner/tariff/page.tsx`
- Create: `app/api/partner/tariff/route.ts`
- Create: `app/partner/login/page.tsx`
- Create: `app/api/partner/auth/login/route.ts`
- Create: `app/api/partner/auth/logout/route.ts`

- [ ] **Step 1: Создать API регистрации**

Создать `app/api/partner/register/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { salons, partnerUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signPartnerToken, PARTNER_COOKIE } from "@/lib/partner-auth";

export async function POST(request: NextRequest) {
  try {
    const { inviteToken, email, password, ownerName, phone } = await request.json();
    if (!inviteToken || !email || !password) {
      return NextResponse.json({ error: "inviteToken, email, password required" }, { status: 400 });
    }

    const [salon] = await db.select().from(salons).where(eq(salons.inviteToken, inviteToken));
    if (!salon) return NextResponse.json({ error: "Invalid invite" }, { status: 400 });

    const existing = await db.select().from(partnerUsers).where(eq(partnerUsers.salonId, salon.id));
    if (existing.length > 0) return NextResponse.json({ error: "Already registered" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);

    // Update salon with owner info
    await db.update(salons).set({
      ownerName: ownerName || salon.ownerName,
      phone: phone || salon.phone,
      isActive: true,
      inviteToken: null, // consume token
    }).where(eq(salons.id, salon.id));

    const [partnerUser] = await db.insert(partnerUsers).values({
      salonId: salon.id,
      email,
      passwordHash,
    }).returning();

    const token = await signPartnerToken({
      salonId: salon.id,
      salonSlug: salon.slug,
      salonName: salon.name,
      partnerUserId: partnerUser.id,
      email,
    });

    const res = NextResponse.json({ ok: true, salonSlug: salon.slug });
    res.cookies.set(PARTNER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Создать страницу регистрации**

Создать `app/partner/join/page.tsx`:

```typescript
"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PartnerJoinPage() {
  const params = useSearchParams();
  const router = useRouter();
  const invite = params.get("invite") || "";
  const [form, setForm] = useState({ email: "", password: "", ownerName: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/partner/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken: invite, ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Ошибка"); setLoading(false); return; }
    router.push("/partner/tariff");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #ececf0" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.15em", color: "#1a1a2e", marginBottom: 24 }}>BEAUTYBOOK</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Регистрация партнёра</h1>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Создайте аккаунт для управления салоном</p>
        {!invite && <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>Неверная ссылка. Обратитесь к менеджеру.</div>}
        {error && <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { key: "ownerName", label: "ФИО владельца", type: "text", placeholder: "Иванова Анна Сергеевна" },
            { key: "phone", label: "Телефон", type: "tel", placeholder: "+7 (___) ___-__-__" },
            { key: "email", label: "Email (для входа)", type: "email", placeholder: "email@salon.ru" },
            { key: "password", label: "Пароль", type: "password", placeholder: "Минимум 8 символов" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                required={f.key === "email" || f.key === "password"}
                style={{ width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#111", outline: "none" }}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading || !invite}
            style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}
          >
            {loading ? "Регистрация..." : "Создать аккаунт →"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Создать API выбора тарифа**

Создать `app/api/partner/tariff/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const { tariff } = await request.json();
  if (!["basic", "advanced", "pro"].includes(tariff)) {
    return NextResponse.json({ error: "Invalid tariff" }, { status: 400 });
  }

  await db.update(salons).set({ tariff }).where(eq(salons.id, session.salonId));
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Создать страницу выбора тарифа**

Создать `app/partner/tariff/page.tsx`:

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const TARIFFS = [
  { id: "basic", name: "Базовый", price: "2 990", features: ["Страница салона", "Онлайн-запись", "Управление услугами и мастерами", "Расписание"] },
  { id: "advanced", name: "Продвинутый", price: "4 990", features: ["Всё из базового", "Telegram-бот для клиентов", "Уведомления клиентам"] },
  { id: "pro", name: "Профессиональный", price: "7 990", features: ["Всё из продвинутого", "Бот для мастеров", "Перенос записей", "Аналитика"] },
];

export default function TariffPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("basic");
  const [loading, setLoading] = useState(false);

  async function handleSelect() {
    setLoading(true);
    await fetch("/api/partner/tariff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tariff: selected }),
    });
    router.push("/partner/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #ececf0" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.15em", color: "#1a1a2e", marginBottom: 24 }}>BEAUTYBOOK</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Выберите тариф</h1>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Можно изменить в любой момент</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {TARIFFS.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                border: selected === t.id ? "2px solid #1a1a2e" : "1.5px solid #ececf0",
                borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                background: selected === t.id ? "#f5f5f8" : "#fafafa",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: selected === t.id ? "#1a1a2e" : "#333" }}>{t.name}</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "#1a1a2e" }}>{t.price} <span style={{ fontSize: 11, fontWeight: 400, color: "#aaa" }}>₽/мес</span></span>
              </div>
              <div style={{ fontSize: 11, color: "#999", lineHeight: 1.6 }}>{t.features.join(" · ")}</div>
            </div>
          ))}
        </div>
        <button
          onClick={handleSelect}
          disabled={loading}
          style={{ width: "100%", background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          {loading ? "Сохраняем..." : "Начать работу →"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Создать API login**

Создать `app/api/partner/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { partnerUsers, salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { signPartnerToken, PARTNER_COOKIE } from "@/lib/partner-auth";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "email and password required" }, { status: 400 });

    const [user] = await db.select().from(partnerUsers).where(eq(partnerUsers.email, email));
    if (!user) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });

    const [salon] = await db.select().from(salons).where(eq(salons.id, user.salonId));
    if (!salon || !salon.isActive) return NextResponse.json({ error: "Салон не активен" }, { status: 403 });

    const token = await signPartnerToken({
      salonId: salon.id,
      salonSlug: salon.slug,
      salonName: salon.name,
      partnerUserId: user.id,
      email: user.email,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(PARTNER_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

- [ ] **Step 6: Создать API logout**

Создать `app/api/partner/auth/logout/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { PARTNER_COOKIE } from "@/lib/partner-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PARTNER_COOKIE);
  return res;
}
```

- [ ] **Step 7: Создать страницу логина**

Создать `app/partner/login/page.tsx`:

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/partner/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Ошибка входа"); setLoading(false); return; }
    router.push("/partner/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", border: "1px solid #ececf0" }}>
        <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.15em", color: "#1a1a2e", marginBottom: 28 }}>BEAUTYBOOK</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Вход в кабинет</h1>
        <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Для партнёров платформы</p>
        {error && <div style={{ background: "#fff0f2", border: "1px solid #ffc0c8", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 13, color: "#c0392b" }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              style={{ width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#111", outline: "none" }} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>Пароль</label>
            <input type="password" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              style={{ width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0", borderRadius: 10, padding: "10px 12px", fontSize: 13, color: "#111", outline: "none" }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8 }}>
            {loading ? "Входим..." : "Войти →"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Проверить флоу**

```
1. Открыть http://localhost:3000/partner/login
2. Войти: admin@profit-club.ru / admin123
3. Убедиться что редиректит на /partner/dashboard
4. Открыть http://localhost:3000/partner/login (должен снова показать логин, не дашборд)
```

- [ ] **Step 9: Commit**

```bash
git add app/partner/ app/api/partner/ lib/partner-auth.ts lib/requirePartnerSession.ts middleware.ts
git commit -m "feat: partner registration, tariff selection, login/logout"
```

---

## Task 5: Partner Layout + Sidebar

**Files:**
- Create: `app/partner/layout.tsx`
- Create: `components/partner/PartnerSidebar.tsx`

- [ ] **Step 1: Создать sidebar компонент**

Создать `components/partner/PartnerSidebar.tsx`:

```typescript
"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { section: "Главное", items: [
    { href: "/partner/dashboard", icon: "🏠", label: "Главная" },
    { href: "/partner/bookings", icon: "📅", label: "Записи" },
  ]},
  { section: "Управление", items: [
    { href: "/partner/services", icon: "✂️", label: "Услуги" },
    { href: "/partner/masters", icon: "👩‍💼", label: "Мастера" },
    { href: "/partner/schedule", icon: "🕐", label: "Расписание" },
    { href: "/partner/my-page", icon: "🔗", label: "Моя страница" },
  ]},
  { section: "Аккаунт", items: [
    { href: "/partner/profile", icon: "👤", label: "Профиль салона" },
    { href: "/partner/billing", icon: "💳", label: "Тариф и оплата" },
  ]},
];

interface Props {
  salonName: string;
  tariff: string;
  onClose: () => void;
}

const TARIFF_LABELS: Record<string, string> = { basic: "Базовый", advanced: "Продвинутый", pro: "Профессиональный" };

export default function PartnerSidebar({ salonName, tariff, onClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/partner/auth/logout", { method: "POST" });
    router.push("/partner/login");
  }

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.15)", zIndex: 40 }} />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "80%", maxWidth: 280,
        background: "#fff", zIndex: 50, display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.1)", borderLeft: "1px solid #f0f0f0",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#111", marginBottom: 4 }}>{salonName}</div>
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, background: "#f0f0f5", color: "#555", borderRadius: 6, padding: "2px 8px" }}>
            {TARIFF_LABELS[tariff] || tariff}
          </span>
        </div>
        {/* Nav */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {NAV.map(group => (
            <div key={group.section}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ccc", padding: "10px 18px 4px" }}>{group.section}</div>
              {group.items.map(item => {
                const active = pathname === item.href;
                return (
                  <button key={item.href} onClick={() => navigate(item.href)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 18px", fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? "#1a1a2e" : "#666", background: active ? "#f2f2f6" : "transparent",
                    border: "none", borderLeft: `2px solid ${active ? "#1a1a2e" : "transparent"}`,
                    cursor: "pointer", textAlign: "left",
                  }}>
                    <span>{item.icon}</span>{item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #f0f0f0" }}>
          <button onClick={handleLogout} style={{ fontSize: 12, color: "#aaa", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            ← Выйти
          </button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Создать layout**

Создать `app/partner/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getPartnerSession } from "@/lib/partner-auth";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";
import PartnerShell from "@/components/partner/PartnerShell";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await getPartnerSession();
  if (!session) redirect("/partner/login");

  const [salon] = await db.select().from(salons).where(eq(salons.id, session.salonId));

  return (
    <PartnerShell salonName={salon?.name || session.salonName} tariff={salon?.tariff || "basic"}>
      {children}
    </PartnerShell>
  );
}
```

- [ ] **Step 3: Создать PartnerShell (client wrapper)**

Создать `components/partner/PartnerShell.tsx`:

```typescript
"use client";
import { useState } from "react";
import PartnerSidebar from "./PartnerSidebar";

interface Props {
  children: React.ReactNode;
  salonName: string;
  tariff: string;
}

export default function PartnerShell({ children, salonName, tariff }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7fa" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 30,
        background: "#fff", borderBottom: "1px solid #ececf0",
        padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#111", letterSpacing: "-0.02em" }}>{salonName}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>Партнёрский кабинет</div>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", gap: 4 }}
          aria-label="Меню"
        >
          <div style={{ width: 20, height: 2, background: "#333", borderRadius: 2 }} />
          <div style={{ width: 20, height: 2, background: "#333", borderRadius: 2 }} />
          <div style={{ width: 14, height: 2, background: "#333", borderRadius: 2 }} />
        </button>
      </header>

      {/* Main */}
      <main style={{ padding: "20px 16px", maxWidth: 800, margin: "0 auto" }}>
        {children}
      </main>

      {/* Sidebar */}
      {sidebarOpen && (
        <PartnerSidebar salonName={salonName} tariff={tariff} onClose={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/partner/layout.tsx components/partner/
git commit -m "feat: partner layout with sticky header and sidebar navigation"
```

---

## Task 6: Dashboard, Bookings, My Page

**Files:**
- Create: `app/partner/dashboard/page.tsx`
- Create: `app/api/partner/dashboard/route.ts`
- Create: `app/partner/bookings/page.tsx`
- Create: `app/api/partner/bookings/route.ts`
- Create: `app/partner/my-page/page.tsx`

- [ ] **Step 1: Dashboard API**

Создать `app/api/partner/dashboard/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const todayAppointments = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.salonId, session.salonId), eq(appointments.date, todayStr)));

  const total = todayAppointments.length;
  const confirmed = todayAppointments.filter(a => a.status === "confirmed").length;
  const cancelled = todayAppointments.filter(a => a.status === "cancelled").length;

  return NextResponse.json({ todayTotal: total, confirmed, cancelled, date: todayStr });
}
```

- [ ] **Step 2: Dashboard page**

Создать `app/partner/dashboard/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";

interface Stats { todayTotal: number; confirmed: number; cancelled: number; date: string; }

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "18px 20px", border: "1px solid #ececf0", flex: 1 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/partner/dashboard").then(r => r.json()).then(setStats);
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Главная</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>
        {stats ? `Сегодня, ${stats.date}` : "Загрузка..."}
      </p>
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard label="Записей сегодня" value={stats.todayTotal} />
          <StatCard label="Подтверждено" value={stats.confirmed} />
          <StatCard label="Отменено" value={stats.cancelled} />
        </div>
      )}
      {stats && stats.todayTotal === 0 && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 4 }}>Записей на сегодня нет</div>
          <div style={{ fontSize: 12, color: "#aaa" }}>Начните с добавления услуг и мастеров</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Bookings API**

Создать `app/api/partner/bookings/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { appointments, services, masters } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const rows = await db
    .select()
    .from(appointments)
    .where(eq(appointments.salonId, session.salonId))
    .orderBy(desc(appointments.createdAt))
    .limit(100);

  return NextResponse.json(rows);
}
```

- [ ] **Step 4: Bookings page**

Создать `app/partner/bookings/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Ожидает", color: "#b08800", bg: "#fffbe6" },
  confirmed: { label: "Подтверждено", color: "#1a7a4a", bg: "#edfaf3" },
  cancelled: { label: "Отменено", color: "#c0392b", bg: "#fff0f2" },
  completed: { label: "Завершено", color: "#555", bg: "#f5f5f5" },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/partner/bookings").then(r => r.json()).then(data => {
      setBookings(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 20 }}>Записи</h1>
      {bookings.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
          <div style={{ fontSize: 14, color: "#666" }}>Записей пока нет</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bookings.map(b => {
            const s = STATUS_LABELS[b.status] || STATUS_LABELS.pending;
            return (
              <div key={b.id} style={{ background: "#fff", borderRadius: 14, padding: "16px 18px", border: "1px solid #ececf0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111", marginBottom: 2 }}>{b.clientName || "Клиент"}</div>
                  <div style={{ fontSize: 12, color: "#999" }}>{b.date} · {b.time} · {b.serviceName || "Услуга"}</div>
                  {b.clientPhone && <div style={{ fontSize: 11, color: "#bbb", marginTop: 2 }}>{b.clientPhone}</div>}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: My Page**

Создать `app/partner/my-page/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";

export default function MyPagePage() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    fetch("/api/partner/profile").then(r => r.json()).then(data => {
      if (data.slug) setUrl(`${window.location.origin}/salon/${data.slug}`);
    });
  }, []);

  function copy() {
    navigator.clipboard.writeText(url);
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 4 }}>Моя страница</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 24 }}>Поделитесь ссылкой с клиентами</p>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Ссылка на страницу салона</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, background: "#f7f7fa", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#333", wordBreak: "break-all", border: "1px solid #ececf0" }}>
            {url || "Загрузка..."}
          </div>
          <button onClick={copy} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Скопировать
          </button>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 14, fontSize: 12, color: "#1a1a2e", fontWeight: 600, textDecoration: "underline" }}>
            Открыть страницу →
          </a>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/partner/dashboard/ app/partner/bookings/ app/partner/my-page/ app/api/partner/dashboard/ app/api/partner/bookings/
git commit -m "feat: partner dashboard, bookings list, my-page"
```

---

## Task 7: Services, Masters, Schedule, Profile, Billing

**Files:**
- Create: `app/api/partner/services/route.ts`
- Create: `app/api/partner/masters/route.ts`
- Create: `app/api/partner/profile/route.ts`
- Create: `app/partner/services/page.tsx`
- Create: `app/partner/masters/page.tsx`
- Create: `app/partner/schedule/page.tsx`
- Create: `app/partner/profile/page.tsx`
- Create: `app/partner/billing/page.tsx`

- [ ] **Step 1: Services API**

Создать `app/api/partner/services/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { services, serviceCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const rows = await db.select().from(services).where(eq(services.salonId, session.salonId));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;

  const body = await request.json();
  const { name, price, duration, description } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const [inserted] = await db.insert(services).values({
    name, price: price || null, duration: duration ? Number(duration) : null,
    description: description || "", salonId: session.salonId,
  }).returning();

  return NextResponse.json(inserted);
}
```

- [ ] **Step 2: Services page**

Создать `app/partner/services/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", price: "", duration: "", description: "" });
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetch("/api/partner/services").then(r => r.json()).then(d => { setServices(Array.isArray(d) ? d : []); setLoading(false); }); }, []);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/partner/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setServices(p => [data, ...p]); setForm({ name: "", price: "", duration: "", description: "" }); setShowForm(false); }
    setAdding(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>Услуги</h1>
        <button onClick={() => setShowForm(p => !p)} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={addService} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #ececf0", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "name", label: "Название *", placeholder: "Стрижка женская" },
            { key: "price", label: "Цена (₽)", placeholder: "3500" },
            { key: "duration", label: "Длительность (мин)", placeholder: "60" },
            { key: "description", label: "Описание", placeholder: "Описание услуги" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                required={f.key === "name"}
                style={{ width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
            </div>
          ))}
          <button type="submit" disabled={adding} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {adding ? "Сохраняем..." : "Сохранить"}
          </button>
        </form>
      )}

      {loading ? <div style={{ color: "#aaa", padding: 20 }}>Загрузка...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {services.length === 0 && <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center", color: "#aaa" }}>Услуг пока нет. Добавьте первую.</div>}
          {services.map(s => (
            <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #ececf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 2 }}>{s.duration ? `${s.duration} мин` : ""}{s.price ? ` · ${s.price} ₽` : ""}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Masters API**

Создать `app/api/partner/masters/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { masters } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const rows = await db.select().from(masters).where(eq(masters.salonId, session.salonId));
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const { name, specialization, phone } = await request.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const [row] = await db.insert(masters).values({ name, specialization: specialization || "", phone: phone || null, salonId: session.salonId, isActive: true }).returning();
  return NextResponse.json(row);
}
```

- [ ] **Step 4: Masters page**

Создать `app/partner/masters/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";

export default function MastersPage() {
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", specialization: "", phone: "" });
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetch("/api/partner/masters").then(r => r.json()).then(d => { setMasters(Array.isArray(d) ? d : []); setLoading(false); }); }, []);

  async function addMaster(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/partner/masters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setMasters(p => [...p, data]); setForm({ name: "", specialization: "", phone: "" }); setShowForm(false); }
    setAdding(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>Мастера</h1>
        <button onClick={() => setShowForm(p => !p)} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>+ Добавить</button>
      </div>

      {showForm && (
        <form onSubmit={addMaster} style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #ececf0", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { key: "name", label: "Имя *", placeholder: "Анна Иванова" },
            { key: "specialization", label: "Специализация", placeholder: "Парикмахер, колорист" },
            { key: "phone", label: "Телефон", placeholder: "+7 (___) ___-__-__" },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} required={f.key === "name"}
                style={{ width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none" }} />
            </div>
          ))}
          <button type="submit" disabled={adding} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {adding ? "Сохраняем..." : "Добавить мастера"}
          </button>
        </form>
      )}

      {loading ? <div style={{ color: "#aaa", padding: 20 }}>Загрузка...</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {masters.length === 0 && <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center", color: "#aaa" }}>Мастеров пока нет.</div>}
          {masters.map(m => (
            <div key={m.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #ececf0", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: "#f0f0f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👩‍💼</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{m.name}</div>
                <div style={{ fontSize: 12, color: "#aaa" }}>{m.specialization || "Без специализации"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Schedule page (заглушка)**

Создать `app/partner/schedule/page.tsx`:

```typescript
export default function SchedulePage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 8 }}>Расписание</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 20 }}>Управление рабочими слотами мастеров</p>
      <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #ececf0", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🕐</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 4 }}>Скоро</div>
        <div style={{ fontSize: 12, color: "#aaa" }}>Управление расписанием будет доступно в следующем обновлении</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Profile API и page**

Создать `app/api/partner/profile/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db";
import { salons } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const [salon] = await db.select().from(salons).where(eq(salons.id, session.salonId));
  return NextResponse.json(salon || {});
}

export async function PATCH(request: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const { name, city, address, phone, description } = await request.json();
  const [updated] = await db.update(salons).set({ name, city, address, phone, description }).where(eq(salons.id, session.salonId)).returning();
  return NextResponse.json(updated);
}
```

Создать `app/partner/profile/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", city: "", address: "", phone: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/partner/profile").then(r => r.json()).then(d => {
      setForm({ name: d.name || "", city: d.city || "", address: d.address || "", phone: d.phone || "", description: d.description || "" });
      setLoading(false);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/partner/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div style={{ color: "#aaa", padding: 20 }}>Загрузка...</div>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 20 }}>Профиль салона</h1>
      <form onSubmit={save} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0", display: "flex", flexDirection: "column", gap: 12 }}>
        {[
          { key: "name", label: "Название салона *", placeholder: "Студия красоты" },
          { key: "city", label: "Город", placeholder: "Москва" },
          { key: "address", label: "Адрес", placeholder: "ул. Пример, д. 1" },
          { key: "phone", label: "Телефон", placeholder: "+7 (___) ___-__-__" },
          { key: "description", label: "Описание", placeholder: "Расскажите о вашем салоне" },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 4 }}>{f.label}</label>
            <input value={form[f.key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} required={f.key === "name"}
              style={{ width: "100%", background: "#f7f7fa", border: "1.5px solid #ececf0", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none" }} />
          </div>
        ))}
        <button type="submit" disabled={saving} style={{ background: "#1a1a2e", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {saved ? "✓ Сохранено" : saving ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Billing page**

Создать `app/partner/billing/page.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";

const TARIFF_INFO: Record<string, { name: string; price: string; features: string[] }> = {
  basic: { name: "Базовый", price: "2 990 ₽/мес", features: ["Страница салона", "Онлайн-запись", "Услуги и мастера"] },
  advanced: { name: "Продвинутый", price: "4 990 ₽/мес", features: ["Всё из базового", "Telegram-бот для клиентов"] },
  pro: { name: "Профессиональный", price: "7 990 ₽/мес", features: ["Всё из продвинутого", "Бот для мастеров", "Аналитика"] },
};

export default function BillingPage() {
  const [tariff, setTariff] = useState("basic");

  useEffect(() => { fetch("/api/partner/profile").then(r => r.json()).then(d => { if (d.tariff) setTariff(d.tariff); }); }, []);

  const info = TARIFF_INFO[tariff] || TARIFF_INFO.basic;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111", marginBottom: 20 }}>Тариф и оплата</h1>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid #ececf0", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Текущий тариф</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111", marginBottom: 4 }}>{info.name}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>{info.price}</div>
        <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          {info.features.map(f => <li key={f} style={{ fontSize: 13, color: "#555", display: "flex", gap: 8 }}><span style={{ color: "#1a7a4a" }}>✓</span>{f}</li>)}
        </ul>
      </div>
      <div style={{ background: "#f7f7fa", borderRadius: 14, padding: 20, border: "1px solid #ececf0", fontSize: 13, color: "#999" }}>
        Для изменения тарифа или вопросов по оплате — свяжитесь с менеджером платформы.
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add app/partner/ app/api/partner/
git commit -m "feat: partner services, masters, profile, billing, schedule pages"
```

---

## Task 8: Публичная страница салона /salon/[slug]

**Files:**
- Create: `app/salon/[slug]/page.tsx`
- Create: `app/api/salon/[slug]/route.ts`

- [ ] **Step 1: API публичной страницы салона**

Создать `app/api/salon/[slug]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { db } from "@/db";
import { salons, services, masters } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const { slug } = await params;
  const [salon] = await db.select().from(salons).where(and(eq(salons.slug, slug), eq(salons.isActive, true)));
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const salonServices = await db.select().from(services).where(eq(services.salonId, salon.id));
  const salonMasters = await db.select({ id: masters.id, name: masters.name, specialization: masters.specialization, photoUrl: masters.photoUrl })
    .from(masters).where(and(eq(masters.salonId, salon.id), eq(masters.isActive, true)));

  return NextResponse.json({ salon, services: salonServices, masters: salonMasters });
}
```

- [ ] **Step 2: Публичная страница**

Создать `app/salon/[slug]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import Link from "next/link";

async function getSalonData(slug: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/salon/${slug}`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

export default async function SalonPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const data = await getSalonData(slug);
  if (!data) notFound();

  const { salon, services, masters } = data;

  return (
    <main style={{ minHeight: "100vh", background: "#f7f7fa" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #ececf0", padding: "20px 20px 16px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 4 }}>{salon.name}</h1>
        {salon.city && <p style={{ fontSize: 13, color: "#999" }}>{salon.city}{salon.address ? ` · ${salon.address}` : ""}</p>}
        {salon.description && <p style={{ fontSize: 13, color: "#666", marginTop: 8, lineHeight: 1.5 }}>{salon.description}</p>}
        {salon.phone && (
          <a href={`tel:${salon.phone}`} style={{ display: "inline-block", marginTop: 10, fontSize: 14, color: "#1a1a2e", fontWeight: 600, textDecoration: "none" }}>
            📞 {salon.phone}
          </a>
        )}
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
        {/* Services */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 12 }}>Услуги</h2>
        {services.length === 0 ? (
          <div style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>Услуги ещё не добавлены</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {services.map((s: any) => (
              <div key={s.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #ececf0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{s.name}</div>
                  {s.duration && <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{s.duration} мин</div>}
                </div>
                {s.price && <div style={{ fontWeight: 700, fontSize: 14, color: "#1a1a2e" }}>{s.price} ₽</div>}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <Link
          href={`/booking?salon=${slug}`}
          style={{
            display: "block", width: "100%", background: "#1a1a2e", color: "#fff",
            textAlign: "center", borderRadius: 14, padding: "16px", fontSize: 15,
            fontWeight: 700, textDecoration: "none", letterSpacing: "0.02em",
          }}
        >
          Записаться онлайн
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Проверить**

```
1. npm run dev
2. Открыть http://localhost:3000/salon/profit-club
3. Убедиться что показывает название, услуги
4. Кнопка "Записаться онлайн" ведёт на /booking?salon=profit-club
```

- [ ] **Step 4: Commit**

```bash
git add app/salon/ app/api/salon/
git commit -m "feat: public salon page /salon/[slug]"
```

---

## Task 9: Scope существующих API по salonId

**Files:**
- Modify: `app/api/services/route.ts`
- Modify: `app/api/appointments/route.ts`

- [ ] **Step 1: Обновить /api/services**

В `app/api/services/route.ts` добавить фильтрацию по `salonId` из query-параметра:

Найти строку `const allCategories = await db.select().from(serviceCategories)...` и добавить перед ней:

```typescript
// Определяем salonId из query или используем дефолтный
const salonSlug = searchParams.get("salon");
let salonId = 1; // дефолт — Profit Club
if (salonSlug) {
  const { salons } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const [s] = await db.select().from(salons).where(eq(salons.slug, salonSlug));
  if (s) salonId = s.id;
}
```

Затем добавить `.where(eq(serviceCategories.salonId, salonId))` к запросам categories, subgroups, services.

- [ ] **Step 2: Проверить**

```
GET http://localhost:3000/api/services?nested=true&salon=profit-club
```
Должен вернуть услуги Profit Club.

- [ ] **Step 3: Commit**

```bash
git add app/api/services/route.ts
git commit -m "feat: scope services API by salonId via ?salon= param"
```

---

## Task 10: Финальная проверка и push

- [ ] **Step 1: Полный флоу проверки**

```
1. npm run dev
2. /partner/login → войти как admin@profit-club.ru / admin123 → попасть на dashboard
3. Открыть меню (три полоски) → убедиться что все пункты работают
4. /partner/services → добавить тестовую услугу
5. /partner/masters → добавить тестового мастера
6. /partner/my-page → скопировать ссылку
7. Перейти по ссылке /salon/profit-club → убедиться что показывает данные
8. /partner/join?invite=INVALID → должен показать ошибку "Неверная ссылка"
```

- [ ] **Step 2: Финальный push**

```bash
git -c http.sslBackend=openssl push origin main
```

---

## Self-Review

**Покрытие спека:**
- ✅ Инвайт-система (Task 3)
- ✅ Регистрация по инвайту (Task 4)
- ✅ Выбор тарифа (Task 4)
- ✅ Партнёрский логин/логаут (Task 4)
- ✅ Layout + sidebar с навигацией (Task 5)
- ✅ Dashboard (Task 6)
- ✅ Записи (Task 6)
- ✅ Моя страница (Task 6)
- ✅ Услуги (Task 7)
- ✅ Мастера (Task 7)
- ✅ Расписание — заглушка, полная реализация в следующем этапе (Task 7)
- ✅ Профиль салона (Task 7)
- ✅ Тариф и оплата (Task 7)
- ✅ Публичная страница /salon/[slug] (Task 8)
- ✅ salonId на таблицах (Task 1)
- ✅ Middleware защита /partner/* (Task 2)

**Что НЕ в плане (намеренно, вне MVP):**
- Оплата подписки — активация вручную
- Полное расписание со слотами
- Скоупинг API available-slots по salonId (требует отдельного исследования логики слотов)
