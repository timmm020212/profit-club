# Telegram Mini App Booking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Telegram Mini App that opens the full booking UI (identical to the website) directly inside Telegram via the bot's menu button.

**Architecture:** One new Next.js page at `/miniapp` reuses existing `BookingServicesGrid` and `BookingModal` components. A new auth API validates Telegram `initData` via HMAC-SHA256. Existing components get a new optional `telegramUser` prop threaded through the chain.

**Tech Stack:** Next.js 15, React 19, Telegram WebApp SDK, HMAC-SHA256 (Node crypto), Drizzle ORM + PostgreSQL

**Spec:** `docs/superpowers/specs/2026-03-24-miniapp-booking-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `app/api/miniapp/auth/route.ts` | Validate Telegram `initData`, return client data |
| Create | `app/(app)/miniapp/layout.tsx` | Minimal layout with Telegram WebApp SDK script |
| Create | `app/(app)/miniapp/page.tsx` | Server page rendering `MiniAppBooking` |
| Create | `components/MiniAppBooking.tsx` | Client component: auth + renders grid with telegramUser |
| Modify | `components/BookingServicesGrid.tsx` | Accept & forward `telegramUser` prop to BookingModal |
| Modify | `components/BookingModal.tsx` | Accept `telegramUser`, prefill step 4, handle `WebApp.close()` |
| Modify | `app/api/appointments/route.ts` | Auto-register client in `clients` table on booking |
| Modify | `telegram-bot/client-simple.ts` | Set menu button to open Mini App |

---

### Task 1: Auth API — Telegram initData Validation

**Files:**
- Create: `app/api/miniapp/auth/route.ts`

- [ ] **Step 1: Create the auth endpoint**

```typescript
// app/api/miniapp/auth/route.ts
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
```

- [ ] **Step 2: Verify endpoint works**

Run: `npm run dev` and test with curl:
```bash
curl -X POST http://localhost:3000/api/miniapp/auth \
  -H "Content-Type: application/json" \
  -d '{"initData":"test"}'
```
Expected: 401 response with `{"valid":false,"error":"No hash"}`

- [ ] **Step 3: Commit**

```bash
git add app/api/miniapp/auth/route.ts
git commit -m "feat: add Telegram Mini App auth API with HMAC-SHA256 validation"
```

---

### Task 2: Mini App Layout and Page

**Files:**
- Create: `app/(app)/miniapp/layout.tsx`
- Create: `app/(app)/miniapp/page.tsx`

- [ ] **Step 1: Create miniapp layout**

```typescript
// app/(app)/miniapp/layout.tsx
import Script from "next/script";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Profit Club — Запись",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}
```

- [ ] **Step 2: Create miniapp page**

```typescript
// app/(app)/miniapp/page.tsx
import MiniAppBooking from "@/components/MiniAppBooking";

export default function MiniAppPage() {
  return (
    <main className="min-h-screen bg-[#09090D] text-white">
      <MiniAppBooking />
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(app)/miniapp/layout.tsx app/(app)/miniapp/page.tsx
git commit -m "feat: add Mini App layout and page"
```

---

### Task 3: MiniAppBooking Client Component

**Files:**
- Create: `components/MiniAppBooking.tsx`

- [ ] **Step 1: Create the component**

```typescript
// components/MiniAppBooking.tsx
"use client";

import { useState, useEffect } from "react";
import BookingServicesGrid from "./BookingServicesGrid";

interface TelegramUser {
  telegramId: string;
  name: string;
  phone: string;
}

type AuthState = "loading" | "ready" | "error";

export default function MiniAppBooking() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const tg = (window as any).Telegram?.WebApp;
        if (!tg || !tg.initData) {
          setErrorMsg("Откройте через Telegram");
          setAuthState("error");
          return;
        }

        tg.ready();
        tg.expand();

        const res = await fetch("/api/miniapp/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData }),
        });

        if (!res.ok) {
          setErrorMsg("Ошибка авторизации");
          setAuthState("error");
          return;
        }

        const data = await res.json();
        if (!data.valid) {
          setErrorMsg("Ошибка авторизации");
          setAuthState("error");
          return;
        }

        setTelegramUser({
          telegramId: data.telegramId,
          name: data.client?.name || data.telegramName || "",
          phone: data.client?.phone || "",
        });
        setAuthState("ready");
      } catch {
        setErrorMsg("Не удалось подключиться к серверу");
        setAuthState("error");
      }
    }

    init();
  }, []);

  if (authState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-7 h-7 rounded-full border-2 border-[#B2223C]/20 border-t-[#B2223C] animate-spin" />
      </div>
    );
  }

  if (authState === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6 text-center">
        <p className="text-white/50 text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
          {errorMsg}
        </p>
        <button
          onClick={() => { setAuthState("loading"); location.reload(); }}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
          style={{
            fontFamily: "var(--font-montserrat)",
            background: "linear-gradient(135deg, #B2223C, #d4395a)",
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <section className="py-6 md:py-10">
      <div className="container mx-auto px-4 max-w-6xl">
        <BookingServicesGrid telegramUser={telegramUser} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/MiniAppBooking.tsx
git commit -m "feat: add MiniAppBooking component with Telegram auth"
```

---

### Task 4: Thread telegramUser Through BookingServicesGrid

**Files:**
- Modify: `components/BookingServicesGrid.tsx` (lines 22, 231-233)

- [ ] **Step 1: Add telegramUser prop**

In `BookingServicesGrid.tsx`, change the component signature from:

```typescript
export default function BookingServicesGrid({ carousel = false }: { carousel?: boolean }) {
```

to:

```typescript
interface TelegramUser {
  telegramId: string;
  name: string;
  phone: string;
}

export default function BookingServicesGrid({ carousel = false, telegramUser }: { carousel?: boolean; telegramUser?: TelegramUser | null }) {
```

- [ ] **Step 2: Pass telegramUser to BookingModal**

In `BookingServicesGrid.tsx`, change the BookingModal render (around line 232) from:

```tsx
<BookingModal service={activeService} onClose={() => setActiveService(null)} />
```

to:

```tsx
<BookingModal service={activeService} onClose={() => setActiveService(null)} telegramUser={telegramUser} />
```

- [ ] **Step 3: Verify site still works**

Run: `npm run dev`, open `http://localhost:3000/booking` — the grid should render normally (telegramUser is undefined, no change in behavior).

- [ ] **Step 4: Commit**

```bash
git add components/BookingServicesGrid.tsx
git commit -m "feat: thread telegramUser prop through BookingServicesGrid to BookingModal"
```

---

### Task 5: Modify BookingModal — Prefill & WebApp.close()

**Files:**
- Modify: `components/BookingModal.tsx` (Props interface, state init, step 5 close)

- [ ] **Step 1: Add telegramUser prop to interface**

In `BookingModal.tsx`, change the Props interface (around line 59) from:

```typescript
interface Props {
  service: Service;
  onClose: () => void;
}
```

to:

```typescript
interface Props {
  service: Service;
  onClose: () => void;
  telegramUser?: {
    telegramId: string;
    name: string;
    phone: string;
  } | null;
}
```

And update the destructuring (around line 64):

```typescript
export default function BookingModal({ service, onClose, telegramUser }: Props) {
```

- [ ] **Step 2: Prefill clientName and clientPhone from telegramUser**

In `BookingModal.tsx`, change the state initializations (around lines 78-79) from:

```typescript
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
```

to:

```typescript
  const [clientName, setClientName] = useState(telegramUser?.name || "");
  const [clientPhone, setClientPhone] = useState(telegramUser?.phone || "");
```

- [ ] **Step 3: Pass telegramId in handleSubmit**

In `BookingModal.tsx`, in `handleSubmit` (around line 161), change the fetch body from:

```typescript
          clientTelegramId: typeof window !== "undefined" ? localStorage.getItem("profit_club_telegram_id") || undefined : undefined,
```

to:

```typescript
          clientTelegramId: telegramUser?.telegramId || (typeof window !== "undefined" ? localStorage.getItem("profit_club_telegram_id") || undefined : undefined),
```

- [ ] **Step 4: Handle onClose differently on step 5 in Mini App**

In `BookingModal.tsx`, in the step 5 success button (around line 529), change from:

```tsx
              <button
                onClick={onClose}
                className={`mt-5 w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all shadow-lg shadow-[#B2223C]/20 hover:shadow-[#B2223C]/35 hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${GRAD}`}
                style={{ fontFamily: FONT }}
              >
                В главное меню
              </button>
```

to:

```tsx
              <button
                onClick={() => {
                  const tg = (window as any).Telegram?.WebApp;
                  if (tg && telegramUser) {
                    tg.close();
                  } else {
                    onClose();
                  }
                }}
                className={`mt-5 w-full py-3.5 rounded-2xl text-sm font-semibold text-white transition-all shadow-lg shadow-[#B2223C]/20 hover:shadow-[#B2223C]/35 hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r ${GRAD}`}
                style={{ fontFamily: FONT }}
              >
                {telegramUser ? "Закрыть" : "В главное меню"}
              </button>
```

- [ ] **Step 5: Verify site modal still works normally**

Run: `npm run dev`, open `http://localhost:3000/booking`, click a service, go through the booking flow. Everything should work as before (telegramUser is undefined).

- [ ] **Step 6: Commit**

```bash
git add components/BookingModal.tsx
git commit -m "feat: add telegramUser support to BookingModal — prefill, telegramId, WebApp.close()"
```

---

### Task 6: Auto-Register Client in Appointments API

**Files:**
- Modify: `app/api/appointments/route.ts` (POST handler, around line 457-474)

- [ ] **Step 1: Add auto-registration logic**

In `app/api/appointments/route.ts`, in the POST handler, find the block (around line 457-474):

```typescript
    if (finalTelegramId) {
      console.log(`Using Telegram ID from request: ${finalTelegramId}`);
      // Пытаемся подтянуть данные клиента из регистрации
      try {
        const client = await db
          .select()
          .from(clients)
          .where(eq(clients.telegramId, finalTelegramId));

        if (client.length > 0) {
          finalClientName = client[0].name || finalClientName;
          if (!finalClientPhone && client[0].phone) {
            finalClientPhone = client[0].phone;
          }
        }
      } catch (e) {
        console.error("Error fetching client by Telegram ID", e);
      }
```

Replace with:

```typescript
    if (finalTelegramId) {
      console.log(`Using Telegram ID from request: ${finalTelegramId}`);
      try {
        const existingClient = await db
          .select()
          .from(clients)
          .where(eq(clients.telegramId, finalTelegramId));

        if (existingClient.length > 0) {
          finalClientName = existingClient[0].name || finalClientName;
          if (!finalClientPhone && existingClient[0].phone) {
            finalClientPhone = existingClient[0].phone;
          }
        } else if (finalClientName && finalClientPhone) {
          // Auto-register client from Mini App booking
          try {
            await db.insert(clients).values({
              name: finalClientName,
              phone: finalClientPhone,
              telegramId: finalTelegramId,
              isVerified: true,
              createdAt: new Date().toISOString(),
              verifiedAt: new Date().toISOString(),
            });
            console.log(`Auto-registered client: ${finalClientName}, tgId=${finalTelegramId}`);
          } catch (regErr) {
            // Ignore duplicate — client may have been registered between check and insert
            console.error("Auto-registration error (may be duplicate):", regErr);
          }
        }
      } catch (e) {
        console.error("Error fetching client by Telegram ID", e);
      }
```

- [ ] **Step 2: Commit**

```bash
git add app/api/appointments/route.ts
git commit -m "feat: auto-register Telegram clients on first Mini App booking"
```

---

### Task 7: Set Bot Menu Button

**Files:**
- Modify: `telegram-bot/client-simple.ts` (after bot.launch)

- [ ] **Step 1: Add setChatMenuButton call**

In `telegram-bot/client-simple.ts`, find the launch block (around line 378):

```typescript
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('[client-bot] Stopped.');
}).catch((error) => {
  console.error('[client-bot] Failed to start:', error);
});
```

Replace with:

```typescript
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log('[client-bot] Stopped.');
}).catch((error) => {
  console.error('[client-bot] Failed to start:', error);
});

// Set Mini App menu button (visible next to text input in all chats)
if (SITE_URL.startsWith('https://')) {
  bot.telegram.setChatMenuButton({
    menuButton: {
      type: 'web_app',
      text: '📅 Записаться',
      web_app: { url: `${SITE_URL}/miniapp` },
    },
  }).then(() => {
    console.log(`[client-bot] Menu button set → ${SITE_URL}/miniapp`);
  }).catch((err) => {
    console.error('[client-bot] Failed to set menu button:', err.message);
  });
} else {
  console.log('[client-bot] Skipping menu button — SITE_URL is not HTTPS (Telegram requires HTTPS for WebApps)');
}
```

- [ ] **Step 2: Commit**

```bash
git add telegram-bot/client-simple.ts
git commit -m "feat: set Telegram Mini App menu button for client bot"
```

---

### Task 8: Manual Testing Checklist

- [ ] **Step 1: Test `/miniapp` page loads in browser**

Open `http://localhost:3000/miniapp` — should show error "Откройте через Telegram" (no `initData`).

- [ ] **Step 2: Test existing booking flow on site is unchanged**

Open `http://localhost:3000/booking`, click a service, complete the full booking flow. Verify: no regressions in UI or functionality.

- [ ] **Step 3: Test with ngrok + Telegram (production-like)**

If HTTPS available (ngrok):
1. Set `NEXTAUTH_URL=https://xxx.ngrok.io` in `.env.local`
2. Restart bot and dev server
3. Open bot in Telegram → menu button should appear
4. Tap menu button → Mini App opens with services grid
5. Select service → booking modal opens with prefilled data
6. Complete booking → appointment created, Mini App closes

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Telegram Mini App booking — complete implementation"
```
