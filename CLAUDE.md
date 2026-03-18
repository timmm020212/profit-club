# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (binds 0.0.0.0:3000)
npm run dev

# Bots (run separately in background)
npm run bot:masters    # Masters Telegram bot
npm run bot:start      # Admin Telegram bot
npm run bot:client     # Client Telegram bot

# Database
npm run db:push        # Push schema changes to SQLite
npm run db:studio      # Open Drizzle Studio
npm run db:seed        # Seed services
npm run db:seed-masters  # Seed masters

# Utilities
npm run lint
npm run reminders:send   # Send appointment reminders manually
npm run test:appointment # Insert a test appointment

# Build
npm run build
```

## Architecture

**Stack:** Next.js 15 App Router · TypeScript · Tailwind CSS · SQLite (better-sqlite3 + drizzle-orm) · NextAuth v4 · Telegraf bots

**Database:** `profit_club.db` in root. Schema in `db/schema-sqlite.ts`. Import DB as `import { db } from "@/db"` (re-exports from `db/index-sqlite.ts`). All bots must also use `../db/index-sqlite` and `../db/schema-sqlite` — NOT PostgreSQL.

**Key tables:** `services`, `masters`, `admins`, `appointments`, `workSlots`, `workSlotChangeRequests`, `clients`, `pendingClients`, `telegramVerificationCodes`, `reminderSent`

**Auth:** NextAuth v4 credentials (username + bcrypt password) against `admins` table. Config in `lib/auth.ts`. Admin routes protected by middleware. Session check in API routes via `lib/requireAdminSession.ts`.

**Booking flow:**
1. Admin creates `workSlots` for a master → master confirms via Telegram (`confirm_X` / `reject_X` callbacks)
2. Only `isConfirmed = true` slots appear on admin timeline
3. Client books via `/booking/[serviceId]` → `BookingModal` → `/api/available-slots` calculates free time → `/api/appointments` POST
4. Available slots logic: dates ≤1 day away require confirmed workSlot; dates 2+ days use confirmed slot if exists, else salon hours 08:00–20:00

**Change requests flow:**
- Master-initiated: `type = "time_change"` — appears in `AdminWorkSlotChangeRequests`
- Admin-initiated: `type = "admin_update"` (set via `mode = "create_from_admin"` in POST body) — filtered OUT of admin panel, notification sent to master via MASTERS_BOT_TOKEN with `confirm_request_X` / `reject_request_X` callbacks

**Client registration flow:** `/api/clients/register` creates a `pendingClients` row + verification code → client enters code in Telegram via `client-simple.ts` → `/api/clients/verify-telegram-code` promotes to `clients` table. `telegramVerificationCodes` handles the Telegram-initiated reverse flow (bot → webapp).

**Telegram bots:**
- `masters-bot-full.ts` — handles `confirm_X`/`reject_X` (work slot creation) and `confirm_request_X`/`reject_request_X` (change requests)
- `admin-bot-full.ts` — admin notifications
- `client-simple.ts` — client appointment management + registration verification

**Telegram webapp:** `app/telegram-webapp/edit/` — edit page served inside Telegram WebApp context.

**Debugging available-slots:** append `?debug=1` to `/api/available-slots` to get a verbose JSON response with reason codes (`ROLE_MISMATCH`, `NO_CONFIRMED_WORKDAY_STRICT`, etc.) instead of an empty array.

**Role matching:** `executorRole` on services is matched against master `specialization` using substring match (e.g. "парикмахер" matches "Парикмахер-стилист"). Logic in `app/api/available-slots/route.ts`.

**`duration` field on services** is stored as integer (minutes). Old data may have been text — always save as number.

**Design system:**
- Dark admin UI: `bg-[#0D0D11]`, violet/indigo gradients, `backdrop-filter` on sticky headers creates stacking context — use `createPortal` to `document.body` for modals (`z-[9999]`)
- Client booking UI: dark `bg-[#09090D]`, brand red `#B2223C → #e8556e` gradient
- Fonts: `var(--font-playfair)` (headings), `var(--font-montserrat)` (body/UI), `var(--font-inter)`
- Date formatting: always use `getFullYear/getMonth/getDate` — never `toISOString().slice(0,10)` (timezone bug)
