# Client Bot Simplification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove inline booking from client bot, add Mini App registration, gate all features behind registration.

**Architecture:** Rewrite `client-simple.ts` to a minimal bot that checks registration, shows menu with WebApp buttons, and delegates to existing handlers. Registration happens in a new Mini App page (`/miniapp/register`) with a dedicated API. Delete booking-flow, bot-texts, and entire engine directory.

**Tech Stack:** Telegraf, Next.js 15, Drizzle ORM + PostgreSQL, Telegram WebApp SDK

**Spec:** `docs/superpowers/specs/2026-03-25-client-bot-simplify-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/api/miniapp/register/route.ts` | Register client, send welcome via bot, set menu button |
| Create | `app/(app)/miniapp/register/page.tsx` | Server page for registration Mini App |
| Create | `components/MiniAppRegister.tsx` | Client component: registration form |
| Rewrite | `telegram-bot/client-simple.ts` | Minimal bot: /start, menu, about, registration gate |
| Modify | `telegram-bot/client/types.ts` | Remove BookingState, keep only what's needed |
| Modify | `components/MiniAppBooking.tsx` | Redirect unregistered users to /miniapp/register |
| Delete | `telegram-bot/client/booking-flow.ts` | Inline booking (replaced by Mini App) |
| Delete | `telegram-bot/bot-texts.ts` | DB step texts (no longer used) |
| Delete | `telegram-bot/engine/` | Entire engine directory (10 files) |

---

### Task 1: Registration API

**Files:**
- Create: `app/api/miniapp/register/route.ts`

- [ ] **Step 1: Create the registration endpoint**

```typescript
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

    // Send welcome message via bot
    const SITE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const welcomeText = `Добро пожаловать, ${name.trim()}! 👋\n\nВыберите действие:`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text: welcomeText,
        reply_markup: {
          inline_keyboard: [
            [{ text: "📅 Записаться", web_app: { url: `${SITE_URL}/miniapp` } }],
            [{ text: "👤 Мои записи", callback_data: "my_appointments" }],
            [{ text: "ℹ️ О нас", callback_data: "about" }],
          ],
        },
      }),
    });

    // Set menu button for this user
    if (SITE_URL.startsWith("https://")) {
      await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramId,
          menu_button: {
            type: "web_app",
            text: "📅 Записаться",
            web_app: { url: `${SITE_URL}/miniapp` },
          },
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/miniapp/register/route.ts
git commit -m "feat: add Mini App registration API"
```

---

### Task 2: Registration Mini App Page

**Files:**
- Create: `app/(app)/miniapp/register/page.tsx`
- Create: `components/MiniAppRegister.tsx`

- [ ] **Step 1: Create server page**

```typescript
// app/(app)/miniapp/register/page.tsx
import MiniAppRegister from "@/components/MiniAppRegister";

export default function MiniAppRegisterPage() {
  return (
    <main className="min-h-screen bg-[#09090D] text-white">
      <MiniAppRegister />
    </main>
  );
}
```

- [ ] **Step 2: Create registration form component**

```typescript
// components/MiniAppRegister.tsx
"use client";

import { useState, useEffect } from "react";

const FONT = "var(--font-montserrat)";

export default function MiniAppRegister() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [initData, setInitData] = useState("");

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      try { tg.setHeaderColor("#09090D"); } catch {}
      try { tg.setBackgroundColor("#09090D"); } catch {}
      if (tg.initData) setInitData(tg.initData);
      // Prefill name from Telegram
      if (tg.initDataUnsafe?.user?.first_name) {
        setName(tg.initDataUnsafe.user.first_name);
      }
    }
  }, []);

  function validateName(v: string) {
    if (!v.trim()) return "Введите ваше имя";
    if (v.trim().length < 2) return "Имя слишком короткое";
    return "";
  }

  function validatePhone(v: string) {
    if (!v.trim()) return "Введите номер телефона";
    if (!/^(\+7|7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}$/.test(v.trim()))
      return "Введите корректный номер";
    return "";
  }

  async function handleSubmit() {
    const ne = validateName(name);
    const pe = validatePhone(phone);
    setNameError(ne);
    setPhoneError(pe);
    if (ne || pe) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/miniapp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      setSuccess(true);
      // Close Mini App after short delay
      setTimeout(() => {
        const tg = (window as any).Telegram?.WebApp;
        if (tg) tg.close();
      }, 2000);
    } catch (e: any) {
      setSubmitError(e.message || "Ошибка. Попробуйте снова.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B2223C] to-[#e8556e] flex items-center justify-center shadow-xl shadow-[#B2223C]/30">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white" style={{ fontFamily: FONT }}>
          Регистрация завершена!
        </h2>
        <p className="text-sm text-white/40" style={{ fontFamily: FONT }}>
          Возвращайтесь в чат бота
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white mb-1" style={{ fontFamily: FONT }}>
          Регистрация
        </h1>
        <p className="text-sm text-white/40" style={{ fontFamily: FONT }}>
          Заполните данные для записи в Profit Club
        </p>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-[10px] text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider" style={{ fontFamily: FONT }}>
            Ваше имя
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); if (nameError) setNameError(validateName(e.target.value)); }}
            onBlur={(e) => setNameError(validateName(e.target.value))}
            placeholder="Как вас зовут?"
            className="w-full border rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
            style={{ fontFamily: FONT, color: "#fff", background: "rgba(255,255,255,0.06)", caretColor: "#e8556e", borderColor: nameError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)" }}
          />
          {nameError && <p className="mt-1 ml-0.5 text-[11px] text-red-400">{nameError}</p>}
        </div>

        <div>
          <label className="block text-[10px] text-white/35 mb-1.5 ml-0.5 uppercase tracking-wider" style={{ fontFamily: FONT }}>
            Телефон
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(validatePhone(e.target.value)); }}
            onBlur={(e) => setPhoneError(validatePhone(e.target.value))}
            placeholder="+7 (___) ___-__-__"
            className="w-full border rounded-xl px-3.5 py-3 text-sm outline-none transition-all"
            style={{ fontFamily: FONT, color: "#fff", background: "rgba(255,255,255,0.06)", caretColor: "#e8556e", borderColor: phoneError ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.1)" }}
          />
          {phoneError && <p className="mt-1 ml-0.5 text-[11px] text-red-400">{phoneError}</p>}
        </div>

        {submitError && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/15 rounded-xl px-3 py-2.5">
            {submitError}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all mt-6 flex items-center justify-center gap-2"
        style={{
          fontFamily: FONT,
          background: submitting ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #B2223C, #d4395a)",
          boxShadow: submitting ? "none" : "0 2px 12px rgba(178,34,60,0.25)",
        }}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Регистрация...
          </>
        ) : "Зарегистрироваться"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/miniapp/register/page.tsx" components/MiniAppRegister.tsx
git commit -m "feat: add Mini App registration page and form"
```

---

### Task 3: Rewrite Client Bot

**Files:**
- Rewrite: `telegram-bot/client-simple.ts`

- [ ] **Step 1: Rewrite client-simple.ts**

Replace the entire file with:

```typescript
import { config } from 'dotenv';
config({ path: '.env.local' });

import { Telegraf, Markup } from 'telegraf';
import { db } from '../db/index-postgres';
import { clients, telegramVerificationCodes } from '../db/schema-postgres';
import { eq, and, gt } from 'drizzle-orm';
import { registerAppointmentHandlers } from './client/appointment-manager';
import { startReminderLoop } from './client/reminders';
import { registerOptimizationHandlers } from './client/optimization-handler';

const SITE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function getBotToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN || '';
}

const bot = new Telegraf(getBotToken());

registerAppointmentHandlers(bot);
registerOptimizationHandlers(bot);

// ── Main menu for registered users ──────────────────────────
async function showMainMenu(ctx: any, name: string) {
  await ctx.reply(
    `Добро пожаловать, ${name}! 👋\n\nВыберите действие:`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('📅 Записаться', `${SITE_URL}/miniapp`)],
      [Markup.button.callback('👤 Мои записи', 'my_appointments')],
      [Markup.button.callback('ℹ️ О нас', 'about')],
    ])
  );
}

// ── Registration prompt for new users ───────────────────────
async function showRegistrationPrompt(ctx: any, firstName: string) {
  await ctx.reply(
    `Привет, ${firstName}! 👋\n\nДля доступа к записи необходимо зарегистрироваться:`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('📝 Регистрация', `${SITE_URL}/miniapp/register`)],
    ])
  );
}

// ── Set menu button for registered user ─────────────────────
function setMenuButton(chatId: number) {
  if (!SITE_URL.startsWith('https://')) return;
  bot.telegram.setChatMenuButton({
    chatId,
    menuButton: {
      type: 'web_app',
      text: '📅 Записаться',
      web_app: { url: `${SITE_URL}/miniapp` },
    },
  }).catch((err) => {
    console.error('[client-bot] Failed to set menu button:', err.message);
  });
}

// ── /start ──────────────────────────────────────────────────
bot.start(async (ctx) => {
  const telegramId = ctx.from?.id.toString();
  const firstName = ctx.from?.first_name || 'Клиент';
  if (!telegramId) return;

  const startPayload = ctx.startPayload;

  // Handle LOGIN_ deep links from site
  if (startPayload && startPayload.startsWith('LOGIN_')) {
    try {
      const codeRows = await db.select().from(telegramVerificationCodes)
        .where(and(
          eq(telegramVerificationCodes.code, startPayload),
          eq(telegramVerificationCodes.isUsed, false),
          gt(telegramVerificationCodes.expiresAt, new Date().toISOString())
        ))
        .limit(1);

      if (codeRows.length > 0) {
        await db.update(telegramVerificationCodes)
          .set({ isUsed: true, telegramId })
          .where(eq(telegramVerificationCodes.id, codeRows[0].id));

        const phone = codeRows[0].phone;
        if (phone) {
          await db.update(clients)
            .set({ telegramId, isVerified: true })
            .where(eq(clients.phone, phone));
        }

        await showMainMenu(ctx, firstName);
        setMenuButton(ctx.chat.id);
      } else {
        await ctx.reply('❌ Код устарел или уже использован.');
      }
    } catch (e) {
      console.error('Error handling LOGIN_ code:', e);
    }
    return;
  }

  // Check if registered
  try {
    const existing = await db.select().from(clients)
      .where(eq(clients.telegramId, telegramId)).limit(1);

    if (existing.length > 0) {
      const name = existing[0].name || firstName;
      await showMainMenu(ctx, name);
      setMenuButton(ctx.chat.id);
      return;
    }
  } catch {}

  // Not registered
  await showRegistrationPrompt(ctx, firstName);
});

// ── About ───────────────────────────────────────────────────
bot.action('about', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '💈 *Profit Club* — салон красоты\n\nМы предлагаем:\n• Профессиональные услуги\n• Опытных мастеров\n• Удобную запись онлайн',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('← Главное меню', 'menu')]]),
    }
  );
});

// ── Back to menu ────────────────────────────────────────────
async function handleBackToMenu(ctx: any) {
  await ctx.answerCbQuery();
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  const existing = await db.select().from(clients)
    .where(eq(clients.telegramId, telegramId)).limit(1);

  if (existing.length > 0) {
    await showMainMenu(ctx, existing[0].name || ctx.from?.first_name || 'Клиент');
  } else {
    await showRegistrationPrompt(ctx, ctx.from?.first_name || 'Клиент');
  }
}

bot.action('menu', handleBackToMenu);
bot.action('book_back_menu', handleBackToMenu);

// ── Launch ──────────────────────────────────────────────────
startReminderLoop();
console.log('[client-bot] Starting...');
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('[client-bot] Stopped.');
}).catch((error) => {
  console.error('[client-bot] Failed to start:', error);
});
console.log('[client-bot] Bot launched, listening for messages...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client-simple.ts
git commit -m "feat: rewrite client bot — registration gate, WebApp menu, no inline booking"
```

---

### Task 4: Clean Up — Delete Old Files

**Files:**
- Delete: `telegram-bot/client/booking-flow.ts`
- Delete: `telegram-bot/bot-texts.ts`
- Delete: `telegram-bot/engine/` (entire directory)
- Modify: `telegram-bot/client/types.ts` — remove BookingState

- [ ] **Step 1: Delete booking-flow.ts**

```bash
rm telegram-bot/client/booking-flow.ts
```

- [ ] **Step 2: Delete bot-texts.ts**

```bash
rm telegram-bot/bot-texts.ts
```

- [ ] **Step 3: Delete engine directory**

```bash
rm -rf telegram-bot/engine/
```

- [ ] **Step 4: Clean up types.ts**

Replace `telegram-bot/client/types.ts` with:

```typescript
// Client bot types — booking state removed (booking is now via Mini App)
```

Note: `bookingStates` is imported in `appointment-manager.ts` (line 5). Check if it's actually used there — if so, remove that import too.

- [ ] **Step 5: Remove bookingStates import from appointment-manager.ts**

In `telegram-bot/client/appointment-manager.ts`, remove line 5:

```typescript
import { bookingStates } from "./types";
```

Search the file for any usage of `bookingStates` and remove those references.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: delete booking-flow, bot-texts, engine — replaced by Mini App"
```

---

### Task 5: Update MiniAppBooking — Redirect Unregistered

**Files:**
- Modify: `components/MiniAppBooking.tsx`

- [ ] **Step 1: Add redirect for unregistered users**

In `components/MiniAppBooking.tsx`, in the `useEffect` where auth is handled, after the auth fetch succeeds but `data.client` is null — redirect to registration:

Find the block that sets telegramUser:

```typescript
        const data = await res.json();
        if (data.valid) {
          setTelegramUser({
            telegramId: data.telegramId,
            name: data.client?.name || data.telegramName || "",
            phone: data.client?.phone || "",
          });
        }
```

Replace with:

```typescript
        const data = await res.json();
        if (data.valid) {
          if (!data.client) {
            // Not registered — redirect to registration
            window.location.href = "/miniapp/register";
            return;
          }
          setTelegramUser({
            telegramId: data.telegramId,
            name: data.client.name || data.telegramName || "",
            phone: data.client.phone || "",
          });
        }
```

- [ ] **Step 2: Commit**

```bash
git add components/MiniAppBooking.tsx
git commit -m "feat: redirect unregistered users to /miniapp/register"
```

---

### Task 6: Manual Testing

- [ ] **Step 1: Verify bot starts without errors**

```bash
npx tsx telegram-bot/client-simple.ts
```

Expected: No import errors, bot launches successfully.

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No TypeScript errors, all pages compile.

- [ ] **Step 3: Test in Telegram**

1. Unregistered user → /start → "Для доступа необходимо зарегистрироваться" + "📝 Регистрация" button
2. Click registration → Mini App opens `/miniapp/register`
3. Fill name + phone → "Зарегистрироваться"
4. Bot sends welcome message with menu buttons
5. Menu button appears next to input field
6. Registered user → /start → welcome + menu
7. "📅 Записаться" opens Mini App booking
8. "👤 Мои записи" works
9. "ℹ️ О нас" works
