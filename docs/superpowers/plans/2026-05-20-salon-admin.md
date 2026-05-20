# Salon Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert legacy single-tenant `/admin` into a per-salon staff role managed by partners — new `salon_admins` table, 6 permission toggles, force password reset, kick-everywhere session control, plus multi-tenant scope refactor of all admin queries.

**Architecture:** New table `salon_admins` separate from platform `admins`. NextAuth `admin` provider tries `salon_admins` first then falls back to platform `admins`. JWT carries `salonId`, `adminId`, `perms` snapshot and a custom `issuedAt`; live-lookup in `requireAdminSession` enforces session invalidation and permission changes immediately. All `/admin/*` data queries get a `WHERE salonId = session.salonId` filter for the salon-admin role.

**Tech Stack:** Next.js 15 App Router · NextAuth v4 JWT · Drizzle ORM · Postgres (Supabase) · bcrypt cost 10 · BeautyBook UI tokens.

**Reference spec:** [`docs/superpowers/specs/2026-05-20-salon-admin-design.md`](../specs/2026-05-20-salon-admin-design.md)

**Project conventions (must follow):**
- DB import: `import { db, dbRetry } from "@/db/index-postgres"`
- Dates: `getFullYear/getMonth/getDate` (never `toISOString().slice(0,10)`)
- All money in копейки (integer); no money in this feature
- Verifier: `npm run build` (no test framework in repo)
- Migrations: `db:push` fails on Supabase permission error → use direct SQL bootstrap script pattern (see `scripts/create-inventory-tables.mjs`)
- Branch: `main`. Push directly. Retry on SSL handshake intermittent.

---

## File map

| File | What |
|---|---|
| `db/schema-postgres.ts` | + `salonAdmins` table + types |
| `scripts/create-salon-admins.mjs` | One-time bootstrap SQL workaround for db:push permission error |
| `lib/auth.ts` | Admin provider checks `salon_admins` first, fallback to `admins` |
| `lib/requireAdminSession.ts` | Add optional `perm` arg + live-lookup + session-invalidation check |
| `app/api/partner/salon-admins/route.ts` | GET list, POST create |
| `app/api/partner/salon-admins/[id]/route.ts` | PATCH update, DELETE soft-archive |
| `app/api/partner/salon-admins/[id]/reset-password/route.ts` | POST reset (force_password_reset=true, sessions_invalidated_at=now) |
| `app/api/partner/salon-admins/[id]/kick/route.ts` | POST kick-everywhere |
| `app/partner/administrator/page.tsx` | Server wrapper, prefetch list |
| `app/partner/administrator/AdminsClient.tsx` | List UI + add button |
| `components/partner/AdminAccountEditor.tsx` | Modal for create/edit + reset/kick/activate |
| `components/partner/PartnerShell.tsx` | + sidebar nav item «Администратор» |
| `app/admin/login/change-password/page.tsx` | Force-reset password screen |
| `app/api/admin/change-password/route.ts` | POST endpoint for the change |
| **DELETE** `app/(app)/admin/analytics/` | Dead route |
| **DELETE** `app/(app)/admin/services/` | Dead route |
| **DELETE** `components/AdminSiteServicesManager.tsx*` | Dead components |
| `app/(app)/admin/page.tsx` | Add `salonId` filter to all DB queries |
| `app/api/work-slots-admin/route.ts` | + salonId filter via requireAdminSession |
| `app/api/work-slot-change-requests-admin/route.ts` | + salonId filter |
| `app/api/work-slots-stream/route.ts` (SSE) | + salonId filter |
| `app/api/admin/optimize-schedule/{apply,send}/route.ts` | + salonId filter |
| `app/api/admin/preliminary-confirm/route.ts` | + salonId filter |
| `app/api/admin/schedule-block/route.ts` | + salonId filter |
| Various admin UI components | Get `disabled` prop or hide based on session.perms |
| `BRIEF_FOR_GEMINI.md` | Update §3 + §6 |

---

## Task 1: `salon_admins` schema + bootstrap

**Files:**
- Modify: `db/schema-postgres.ts`
- Create: `scripts/create-salon-admins.mjs`

- [ ] **Step 1: Smoke test plan**

After this task `salon_admins` table exists in Supabase Postgres with all columns from spec §2, `npm run build` passes, and the Drizzle types `SalonAdmin`/`NewSalonAdmin` are inferable.

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Append to `db/schema-postgres.ts`**

Add this code after the `reviews` table (above the existing type exports). Confirm `uniqueIndex`, `timestamp`, `boolean`, `varchar`, `integer`, `serial`, `pgTable` are already imported at the top.

```ts
export const salonAdmins = pgTable("salon_admins", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull(),
  username: varchar("username", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  rank: varchar("rank", { length: 20 }).notNull().default("secondary"),
  passwordHash: varchar("password_hash", { length: 200 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  forcePasswordReset: boolean("force_password_reset").notNull().default(false),
  sessionsInvalidatedAt: timestamp("sessions_invalidated_at"),
  lastLoginAt: timestamp("last_login_at"),
  telegramId: varchar("telegram_id", { length: 50 }),

  canEditSchedule:     boolean("can_edit_schedule").notNull().default(true),
  canEditBookings:     boolean("can_edit_bookings").notNull().default(true),
  canEditMasters:      boolean("can_edit_masters").notNull().default(false),
  canEditBotFlows:     boolean("can_edit_bot_flows").notNull().default(false),
  canRunOptimization:  boolean("can_run_optimization").notNull().default(false),
  canEditInventory:    boolean("can_edit_inventory").notNull().default(false),

  createdAt: timestamp("created_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
}, (table) => [
  uniqueIndex("salon_admins_salon_username_idx").on(table.salonId, table.username),
]);

export type SalonAdmin = typeof salonAdmins.$inferSelect;
export type NewSalonAdmin = typeof salonAdmins.$inferInsert;
```

- [ ] **Step 4: Try `db:push`**

Run: `npm run db:push`
Expected: Likely fails with "must be owner of table bot_buttons" — pre-existing Supabase permission error. If it succeeds, skip Step 5.

- [ ] **Step 5: Bootstrap SQL script (only if db:push failed)**

Create `scripts/create-salon-admins.mjs`:

```js
// ONE-TIME BOOTSTRAP SCRIPT.
// Canonical schema lives in db/schema-postgres.ts — DO NOT use this script
// as a source of truth. It exists because `drizzle-kit push` fails on a
// pre-existing Supabase permission issue on legacy tables.

import { config } from "dotenv";
config({ path: ".env.local" });

import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const sql = `
CREATE TABLE IF NOT EXISTS salon_admins (
  id SERIAL PRIMARY KEY,
  salon_id INTEGER NOT NULL,
  username VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  rank VARCHAR(20) NOT NULL DEFAULT 'secondary',
  password_hash VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  force_password_reset BOOLEAN NOT NULL DEFAULT FALSE,
  sessions_invalidated_at TIMESTAMP,
  last_login_at TIMESTAMP,
  telegram_id VARCHAR(50),
  can_edit_schedule BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_bookings BOOLEAN NOT NULL DEFAULT TRUE,
  can_edit_masters BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_bot_flows BOOLEAN NOT NULL DEFAULT FALSE,
  can_run_optimization BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS salon_admins_salon_username_idx
  ON salon_admins (salon_id, username);
`;

try {
  await client.query(sql);
  console.log("OK: salon_admins table created (or already exists)");
} catch (e) {
  console.error("FAIL:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
```

Run: `node scripts/create-salon-admins.mjs`
Expected: `OK: salon_admins table created (or already exists)`.

- [ ] **Step 6: Add salon_admins to drizzle.config.ts tablesFilter**

In `drizzle.config.ts` find the `tablesFilter` array and append `"salon_admins"` to the list (alphabetical order is fine, just add it).

- [ ] **Step 7: Build + commit**

```bash
npm run build                                     # must PASS
git add db/schema-postgres.ts scripts/create-salon-admins.mjs drizzle.config.ts
git commit -m "feat(db): add salon_admins table for per-salon admin accounts"
git push origin main
```

---

## Task 2: NextAuth provider + requireAdminSession + types

**Files:**
- Modify: `lib/auth.ts` (admin provider authorize, JWT callback, session callback, NextAuth module declaration)
- Modify: `lib/requireAdminSession.ts` (add `perm` arg, live-lookup, session invalidation check)

- [ ] **Step 1: Smoke test plan**

After this task:
- Logging into `/admin/login` with a salon_admin record's credentials returns a session with `role: "salonAdmin"`, `salonId`, `adminId`, `perms` populated.
- Logging in with platform `admins` table credentials still works (legacy fallback, `role: "admin"`, no `salonId`).
- All 17 existing API routes using `requireAdminSession()` (no args) continue working — they get back `{ session, response }` same as before, with additional fields on `session.user`.
- New API routes can call `requireAdminSession("schedule")` (or any other permission) and get 403 if the salon-admin doesn't have that flag.
- `npm run build` passes.

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Extend NextAuth module declarations in `lib/auth.ts`**

In `lib/auth.ts`, replace the existing `declare module "next-auth"` block with this expanded version (preserves all existing fields, adds the new ones):

```ts
declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email?: string;
    role?: string;
    salonId?: number;
    salonSlug?: string;
    salonName?: string;
    // Salon admin fields
    adminId?: number;
    perms?: {
      schedule: boolean;
      bookings: boolean;
      masters: boolean;
      bots: boolean;
      optimize: boolean;
      inventory: boolean;
    };
    forcePasswordReset?: boolean;
    issuedAt?: number;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email?: string;
      role?: string;
      salonId?: number;
      salonSlug?: string;
      salonName?: string;
      adminId?: number;
      perms?: {
        schedule: boolean;
        bookings: boolean;
        masters: boolean;
        bots: boolean;
        optimize: boolean;
        inventory: boolean;
      };
      forcePasswordReset?: boolean;
      issuedAt?: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    salonId?: number;
    salonSlug?: string;
    salonName?: string;
    adminId?: number;
    perms?: {
      schedule: boolean;
      bookings: boolean;
      masters: boolean;
      bots: boolean;
      optimize: boolean;
      inventory: boolean;
    };
    forcePasswordReset?: boolean;
    issuedAt?: number;
  }
}
```

- [ ] **Step 4: Rewrite the admin provider in `lib/auth.ts`**

In the same file, find the existing admin provider:

```ts
CredentialsProvider({
  id: "credentials",
  name: "Admin",
  credentials: { ... },
  async authorize(credentials) {
    // ... existing code ...
  },
}),
```

Replace its `authorize` function with this. **Keep** the provider `id: "credentials"` and `name: "Admin"` as-is so the existing `/admin/login` form keeps working unchanged.

```ts
async authorize(credentials) {
  const username = String(credentials?.username || "");
  const password = String(credentials?.password || "");

  const rl = rateLimit(`admin-login:${username}`, 5, 60 * 1000);
  if (!rl.ok) return null;
  if (!username || !password) return null;

  try {
    // 1. Try salon_admins first (the new per-salon role)
    const [sa] = await db.select().from(salonAdmins)
      .where(eq(salonAdmins.username, username))
      .limit(1);
    if (sa) {
      if (!sa.isActive || sa.archivedAt) return null;
      const valid = await bcrypt.compare(password, sa.passwordHash);
      if (!valid) return null;
      // Track last login (best-effort, don't fail auth if this fails)
      try {
        await db.update(salonAdmins)
          .set({ lastLoginAt: new Date() })
          .where(eq(salonAdmins.id, sa.id));
      } catch {}
      return {
        id: sa.id.toString(),
        name: sa.name,
        role: "salonAdmin",
        salonId: sa.salonId,
        adminId: sa.id,
        perms: {
          schedule:  sa.canEditSchedule,
          bookings:  sa.canEditBookings,
          masters:   sa.canEditMasters,
          bots:      sa.canEditBotFlows,
          optimize:  sa.canRunOptimization,
          inventory: sa.canEditInventory,
        },
        forcePasswordReset: sa.forcePasswordReset,
        issuedAt: Math.floor(Date.now() / 1000),
      };
    }

    // 2. Fallback: platform admin (legacy, god-mode in scoped queries)
    const [pa] = await db.select().from(admins)
      .where(eq(admins.username, username))
      .limit(1);
    if (!pa || !pa.isActive) return null;
    const valid = await bcrypt.compare(password, pa.passwordHash);
    if (!valid) return null;
    return {
      id: pa.id.toString(),
      name: pa.name,
      role: "admin",
      // Legacy admins have all perms (god mode); salonId stays undefined
      perms: { schedule: true, bookings: true, masters: true, bots: true, optimize: true, inventory: true },
      issuedAt: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    console.error("Admin auth error:", error);
    return null;
  }
}
```

Add `salonAdmins` to the existing `@/db/schema` import line at the top of the file (next to `admins`, `partnerUsers`, `salons`).

- [ ] **Step 5: Update JWT + session callbacks**

In `lib/auth.ts`, find the existing `callbacks` block. Replace the `jwt` and `session` callbacks with these expanded versions that carry the new salon-admin fields through:

```ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.name = user.name;
      token.role = user.role;
      if (user.role === "partner") {
        token.salonId = user.salonId;
        token.salonSlug = user.salonSlug;
        token.salonName = user.salonName;
      }
      if (user.role === "salonAdmin" || user.role === "admin") {
        token.adminId = user.adminId;
        token.salonId = user.salonId;
        token.perms = user.perms;
        token.forcePasswordReset = user.forcePasswordReset;
        token.issuedAt = user.issuedAt;
      }
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user && token) {
      session.user.id = token.id as string;
      session.user.name = token.name as string;
      session.user.role = token.role;
      if (token.role === "partner") {
        session.user.salonId = token.salonId;
        session.user.salonSlug = token.salonSlug;
        session.user.salonName = token.salonName;
      }
      if (token.role === "salonAdmin" || token.role === "admin") {
        session.user.adminId = token.adminId;
        session.user.salonId = token.salonId;
        session.user.perms = token.perms;
        session.user.forcePasswordReset = token.forcePasswordReset;
        session.user.issuedAt = token.issuedAt;
      }
    }
    return session;
  },
},
```

- [ ] **Step 6: Rewrite `lib/requireAdminSession.ts`**

Overwrite the entire file (it currently has 16 lines):

```ts
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { db } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AdminPermission =
  | "schedule" | "bookings" | "masters" | "bots" | "optimize" | "inventory";

export interface AdminSessionData {
  role: "salonAdmin" | "admin";   // "admin" = legacy global platform admin (god-mode)
  adminId: number | null;          // null for legacy
  salonId: number | null;          // null for legacy global admin
  name: string;
  perms: Record<AdminPermission, boolean>;
}

type RequireAdminResult =
  | { session: AdminSessionData; response: null }
  | { session: null; response: NextResponse };

/**
 * Guards admin API routes.
 *   requireAdminSession()           - require any admin (salon or legacy).
 *   requireAdminSession("schedule") - additionally require the permission.
 *
 * For salon admins, performs a live DB lookup to enforce:
 *   - isActive must be true
 *   - sessionsInvalidatedAt must be older than the JWT's issuedAt
 *   - the specific permission flag must be true (if `perm` is supplied)
 *
 * For legacy global admins (`role === "admin"`), all permissions are granted
 * and the live lookup is skipped. They get god-mode access for backward
 * compatibility while migration to salon_admins is in progress.
 */
export async function requireAdminSession(perm?: AdminPermission): Promise<RequireAdminResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "salonAdmin" && session.user.role !== "admin")) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  // Legacy platform admin — full god-mode, no DB lookup.
  if (session.user.role === "admin") {
    return {
      session: {
        role: "admin",
        adminId: null,
        salonId: null,
        name: session.user.name,
        perms: { schedule: true, bookings: true, masters: true, bots: true, optimize: true, inventory: true },
      },
      response: null,
    };
  }

  // salonAdmin: live lookup
  if (!session.user.adminId || !session.user.salonId) {
    return { session: null, response: NextResponse.json({ error: "Malformed session" }, { status: 401 }) };
  }
  const [a] = await db.select().from(salonAdmins).where(eq(salonAdmins.id, session.user.adminId)).limit(1);
  if (!a || !a.isActive || a.archivedAt) {
    return { session: null, response: NextResponse.json({ error: "Account disabled" }, { status: 401 }) };
  }
  if (a.sessionsInvalidatedAt && session.user.issuedAt
      && session.user.issuedAt * 1000 < a.sessionsInvalidatedAt.getTime()) {
    return { session: null, response: NextResponse.json({ error: "Session revoked" }, { status: 401 }) };
  }
  if (a.forcePasswordReset) {
    return { session: null, response: NextResponse.json({ error: "Password change required" }, { status: 403 }) };
  }
  const perms = {
    schedule:  a.canEditSchedule,
    bookings:  a.canEditBookings,
    masters:   a.canEditMasters,
    bots:      a.canEditBotFlows,
    optimize:  a.canRunOptimization,
    inventory: a.canEditInventory,
  };
  if (perm && !perms[perm]) {
    return { session: null, response: NextResponse.json({ error: "Forbidden", missingPermission: perm }, { status: 403 }) };
  }
  return {
    session: {
      role: "salonAdmin",
      adminId: a.id,
      salonId: a.salonId,
      name: a.name,
      perms,
    },
    response: null,
  };
}
```

- [ ] **Step 7: Build + commit**

Run: `npm run build`
Expected: PASS. All 17 callers of `requireAdminSession()` should still type-check because the no-arg signature is backwards compatible.

```bash
git add lib/auth.ts lib/requireAdminSession.ts
git commit -m "feat(auth): salon_admin role with permissions + live-lookup guard"
git push origin main
```

---

## Task 3: Partner API for salon-admins

**Files:**
- Create: `app/api/partner/salon-admins/route.ts` (GET, POST)
- Create: `app/api/partner/salon-admins/[id]/route.ts` (PATCH, DELETE)
- Create: `app/api/partner/salon-admins/[id]/reset-password/route.ts` (POST)
- Create: `app/api/partner/salon-admins/[id]/kick/route.ts` (POST)

- [ ] **Step 1: Smoke test plan**

```
GET    /api/partner/salon-admins                       → list of salon's admins (archived excluded by default)
POST   /api/partner/salon-admins                       → create {username, name, password, rank, perms?}
PATCH  /api/partner/salon-admins/<id>                  → update name/rank/perms/isActive
DELETE /api/partner/salon-admins/<id>                  → soft archive (only if isActive=false)
POST   /api/partner/salon-admins/<id>/reset-password   → {password} → updates hash, sets forcePasswordReset=true + sessionsInvalidatedAt=now
POST   /api/partner/salon-admins/<id>/kick             → sessions_invalidated_at=now
```

All routes guarded by `requirePartnerSession`. All filter by `session.salonId`. Username unique per salon.

- [ ] **Step 2: Verify starting state**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/partner/salon-admins`
Expected: 404 (route doesn't exist yet).

- [ ] **Step 3: Create list + create route**

Create `app/api/partner/salon-admins/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,50}$/;
const PASSWORD_MIN = 8;
const VALID_RANKS = ["main", "secondary"] as const;

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";
  try {
    const rows = await dbRetry(() => db
      .select({
        id: salonAdmins.id,
        username: salonAdmins.username,
        name: salonAdmins.name,
        rank: salonAdmins.rank,
        isActive: salonAdmins.isActive,
        forcePasswordReset: salonAdmins.forcePasswordReset,
        lastLoginAt: salonAdmins.lastLoginAt,
        sessionsInvalidatedAt: salonAdmins.sessionsInvalidatedAt,
        archivedAt: salonAdmins.archivedAt,
        canEditSchedule: salonAdmins.canEditSchedule,
        canEditBookings: salonAdmins.canEditBookings,
        canEditMasters:  salonAdmins.canEditMasters,
        canEditBotFlows: salonAdmins.canEditBotFlows,
        canRunOptimization: salonAdmins.canRunOptimization,
        canEditInventory: salonAdmins.canEditInventory,
        createdAt: salonAdmins.createdAt,
      })
      .from(salonAdmins)
      .where(includeArchived
        ? eq(salonAdmins.salonId, session.salonId)
        : and(eq(salonAdmins.salonId, session.salonId), isNull(salonAdmins.archivedAt)))
      .orderBy(asc(salonAdmins.name))
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Salon-admins GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await req.json();
    const username = typeof body?.username === "string" ? body.username.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const rank = typeof body?.rank === "string" ? body.rank : "secondary";

    if (!USERNAME_RE.test(username)) return NextResponse.json({ error: "Логин должен быть 3-50 латинских букв/цифр/_-" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
    if (password.length < PASSWORD_MIN) return NextResponse.json({ error: `Пароль ≥ ${PASSWORD_MIN} символов` }, { status: 400 });
    if (!VALID_RANKS.includes(rank as typeof VALID_RANKS[number])) return NextResponse.json({ error: "Неверный статус" }, { status: 400 });

    // Check uniqueness within salon
    const [existing] = await dbRetry(() => db.select({ id: salonAdmins.id })
      .from(salonAdmins)
      .where(and(eq(salonAdmins.salonId, session.salonId), eq(salonAdmins.username, username)))
      .limit(1));
    if (existing) return NextResponse.json({ error: "Логин уже занят в вашем салоне" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const [row] = await dbRetry(() => db
      .insert(salonAdmins)
      .values({
        salonId: session.salonId,
        username,
        name,
        rank,
        passwordHash,
        // Permissions from body (defaults applied)
        canEditSchedule:    body.canEditSchedule    !== false,
        canEditBookings:    body.canEditBookings    !== false,
        canEditMasters:     body.canEditMasters     === true,
        canEditBotFlows:    body.canEditBotFlows    === true,
        canRunOptimization: body.canRunOptimization === true,
        canEditInventory:   body.canEditInventory   === true,
      })
      .returning()
    );
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Salon-admins POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create PATCH + DELETE**

Create `app/api/partner/salon-admins/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const VALID_RANKS = ["main", "secondary"] as const;
const PERM_FIELDS = ["canEditSchedule", "canEditBookings", "canEditMasters", "canEditBotFlows", "canRunOptimization", "canEditInventory"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body?.rank === "string" && VALID_RANKS.includes(body.rank)) patch.rank = body.rank;
    if (typeof body?.isActive === "boolean") patch.isActive = body.isActive;
    for (const k of PERM_FIELDS) {
      if (typeof body?.[k] === "boolean") patch[k] = body[k];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }

    const [row] = await dbRetry(() => db
      .update(salonAdmins)
      .set(patch)
      .where(and(eq(salonAdmins.id, id), eq(salonAdmins.salonId, session.salonId)))
      .returning()
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Salon-admins PATCH:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

    // Must be deactivated first (safety: don't archive an active admin)
    const [existing] = await dbRetry(() => db.select({ id: salonAdmins.id, isActive: salonAdmins.isActive })
      .from(salonAdmins)
      .where(and(eq(salonAdmins.id, id), eq(salonAdmins.salonId, session.salonId)))
      .limit(1));
    if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (existing.isActive) return NextResponse.json({ error: "Деактивируйте администратора перед удалением" }, { status: 400 });

    await dbRetry(() => db.update(salonAdmins)
      .set({ archivedAt: new Date() })
      .where(eq(salonAdmins.id, id))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Salon-admins DELETE:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create reset-password**

Create `app/api/partner/salon-admins/[id]/reset-password/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const body = await req.json();
    const password = typeof body?.password === "string" ? body.password : "";
    if (password.length < 8) return NextResponse.json({ error: "Пароль ≥ 8 символов" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    const [row] = await dbRetry(() => db.update(salonAdmins)
      .set({
        passwordHash,
        forcePasswordReset: true,
        sessionsInvalidatedAt: new Date(),
      })
      .where(and(eq(salonAdmins.id, id), eq(salonAdmins.salonId, session.salonId)))
      .returning({ id: salonAdmins.id })
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Reset-password:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 6: Create kick endpoint**

Create `app/api/partner/salon-admins/[id]/kick/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

    const [row] = await dbRetry(() => db.update(salonAdmins)
      .set({ sessionsInvalidatedAt: new Date() })
      .where(and(eq(salonAdmins.id, id), eq(salonAdmins.salonId, session.salonId)))
      .returning({ id: salonAdmins.id })
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Kick:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 7: Build + commit**

```bash
npm run build                                     # must PASS
git add app/api/partner/salon-admins/
git commit -m "feat(api): partner CRUD + reset-password + kick endpoints for salon_admins"
git push origin main
```

---

## Task 4: Partner UI — `/partner/administrator` + sidebar

**Files:**
- Modify: `components/partner/PartnerShell.tsx` (sidebar nav item)
- Create: `app/partner/administrator/page.tsx` (server wrapper)
- Create: `app/partner/administrator/AdminsClient.tsx` (list UI)
- Create: `components/partner/AdminAccountEditor.tsx` (modal)

- [ ] **Step 1: Smoke test plan**

After this task:
- New sidebar item «Администратор» appears between «Тарифы» and «Профиль» (in `accountNav`).
- `/partner/administrator` shows list of salon admins from `GET /api/partner/salon-admins`.
- «+ Добавить администратора» opens modal; saving creates new admin.
- Click on a row opens edit modal with reset-password / kick / activate / delete actions.

- [ ] **Step 2: Add sidebar item**

In `components/partner/PartnerShell.tsx`, find the `accountNav` array. Add this item **before** "Профиль":

```ts
{ href: "/partner/administrator", label: "Администратор", icon: "user"   },
```

(Reuse the existing `user` icon path from the icon map — it's already defined.)

- [ ] **Step 3: Create server wrapper**

Create `app/partner/administrator/page.tsx`:

```ts
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminsClient from "./AdminsClient";

export const dynamic = "force-dynamic";

export default async function AdministratorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "partner" || !session.user.salonId) {
    redirect("/partner/join");
  }
  return <AdminsClient />;
}
```

- [ ] **Step 4: Create AdminAccountEditor modal**

Create `components/partner/AdminAccountEditor.tsx`. This is a long file (~400 lines) following the same pattern as `MaterialEditor` from the inventory feature. It must include:

- Form fields: username (only on create, disabled in edit), name, rank (segment control "main"/"secondary"), password (only on create, with "сгенерировать" button)
- 6 permission toggles (canEditSchedule, canEditBookings, canEditMasters, canEditBotFlows, canRunOptimization, canEditInventory) — render as 6 switch rows with labels in Russian
- In edit-mode, three action blocks at the bottom:
  - "Сбросить пароль" — collapsible: new password input + generate button + "Сохранить и сбросить сессии" button → POST `/api/partner/salon-admins/[id]/reset-password`
  - "Выгнать отовсюду" — double-click confirm button (uses the same pattern as `AppointmentDetailModal`'s cancel button) → POST `/api/partner/salon-admins/[id]/kick`
  - "Активировать"/"Деактивировать" toggle → PATCH `{isActive}`
  - "Удалить" (only when isActive=false) → DELETE
- Backdrop blur, body scroll lock, Escape close
- BeautyBook palette, Montserrat

The implementer must reference `components/partner/MaterialEditor.tsx` for the visual pattern. Build the file with these exact prop interfaces:

```ts
export interface SalonAdminData {
  id: number;
  username: string;
  name: string;
  rank: "main" | "secondary";
  isActive: boolean;
  forcePasswordReset: boolean;
  lastLoginAt: string | null;
  sessionsInvalidatedAt: string | null;
  canEditSchedule: boolean;
  canEditBookings: boolean;
  canEditMasters: boolean;
  canEditBotFlows: boolean;
  canRunOptimization: boolean;
  canEditInventory: boolean;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial: SalonAdminData | null;
  onClose: () => void;
  onSaved: () => void;     // reload list
  onDeleted?: () => void;  // reload list after archive
}

export default function AdminAccountEditor(props: Props) { ... }
```

Pseudo-flow for save:
```ts
if (mode === "create") {
  POST /api/partner/salon-admins {username, name, rank, password, canEditSchedule, ...}
} else {
  PATCH /api/partner/salon-admins/[id] {name, rank, canEditSchedule, ...}
}
```

Use random hex for "сгенерировать" button:
```ts
const generated = Array.from(crypto.getRandomValues(new Uint8Array(8)))
  .map(b => b.toString(16).padStart(2, "0")).join("");
setPasswordInput(generated);
// Also copy to clipboard:
navigator.clipboard.writeText(generated).catch(() => {});
```

- [ ] **Step 5: Create AdminsClient**

Create `app/partner/administrator/AdminsClient.tsx`. List UI in the style of `app/partner/masters/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import AdminAccountEditor, { SalonAdminData } from "@/components/partner/AdminAccountEditor";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  green: "#1FB46A", greenSft: "#E3F8EE",
  red: "#EF4444", redSft: "#FCE5E5",
  amber: "#F59E0B", amberSft: "#FEF3C7",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

function initialsOf(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "никогда";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "никогда";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} д назад`;
}

export default function AdminsClient() {
  const [admins, setAdmins] = useState<SalonAdminData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ open: boolean; mode: "create" | "edit"; data: SalonAdminData | null }>({
    open: false, mode: "create", data: null,
  });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/partner/salon-admins");
      const d = await r.json();
      if (Array.isArray(d)) setAdmins(d);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function activePermCount(a: SalonAdminData): { on: number; total: number } {
    const flags = [a.canEditSchedule, a.canEditBookings, a.canEditMasters, a.canEditBotFlows, a.canRunOptimization, a.canEditInventory];
    return { on: flags.filter(Boolean).length, total: flags.length };
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
          letterSpacing: "-0.025em", fontFamily: "var(--font-montserrat)" }}>Администратор</h1>
        <div style={{ fontSize: 13, color: c.txtMute, marginTop: 4, fontFamily: "var(--font-montserrat)" }}>
          {admins.length === 0 ? "Сотрудники салона с доступом в админ-панель"
            : `${admins.length} ${admins.length === 1 ? "администратор" : admins.length < 5 ? "администратора" : "администраторов"}`}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button"
          onClick={() => setEditor({ open: true, mode: "create", data: null })}
          style={{
            padding: "11px 18px", borderRadius: 11,
            background: c.primary, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)",
            boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
          }}>+ Добавить администратора</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>
      ) : admins.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
          padding: "40px 24px", textAlign: "center", fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: c.txtDark, marginBottom: 6 }}>
            Администраторов пока нет
          </div>
          <div style={{ fontSize: 13, color: c.txtMute, maxWidth: 360, margin: "0 auto", lineHeight: 1.5 }}>
            Добавьте первого администратора — он сможет работать в админ-панели от имени вашего салона. Все права настраиваются переключателями.
          </div>
        </div>
      ) : (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {admins.map((a, i) => {
            const pc = activePermCount(a);
            const rank = a.rank === "main" ? "главный" : "доп.";
            const statusLabel = !a.isActive ? "заблокирован" : a.forcePasswordReset ? "смена пароля" : "активен";
            const statusColor = !a.isActive ? c.red : a.forcePasswordReset ? c.amber : c.green;
            const statusBg = !a.isActive ? c.redSft : a.forcePasswordReset ? c.amberSft : c.greenSft;
            return (
              <div key={a.id} style={{ borderBottom: i < admins.length - 1 ? `1px solid ${c.borderSoft}` : "none" }}>
                <button type="button"
                  onClick={() => setEditor({ open: true, mode: "edit", data: a })}
                  style={{
                    width: "100%", textAlign: "left", border: "none", background: c.bg,
                    padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    fontFamily: "var(--font-montserrat)", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = c.bgSoft)}
                  onMouseLeave={e => (e.currentTarget.style.background = c.bg)}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, #7B61FF, #5B3FE5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 800, flexShrink: 0,
                  }}>{initialsOf(a.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: c.txtDark }}>{a.name}</span>
                      <span style={{
                        padding: "2px 7px", borderRadius: 7,
                        background: c.bgSoft, color: c.txtBody,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                      }}>{rank}</span>
                      <span style={{
                        padding: "2px 7px", borderRadius: 7,
                        background: statusBg, color: statusColor,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                      }}>{statusLabel}</span>
                    </div>
                    <div style={{ fontSize: 12, color: c.txtBody, marginTop: 2 }}>
                      логин: <b>{a.username}</b>
                      <span style={{ color: c.txtMute }}> · вход {relativeTime(a.lastLoginAt)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: c.txtMute, marginTop: 3 }}>
                      права: {pc.on}/{pc.total} включено
                    </div>
                  </div>
                  <span style={{ color: c.txtMute, flexShrink: 0 }}>›</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <AdminAccountEditor
        open={editor.open}
        mode={editor.mode}
        initial={editor.data}
        onClose={() => setEditor(p => ({ ...p, open: false }))}
        onSaved={load}
        onDeleted={load}
      />
    </div>
  );
}
```

- [ ] **Step 6: Build + manual smoke**

```bash
npm run build  # must PASS
```

Manual: log into `/partner/login`, sidebar shows «Администратор», click it → page loads with empty state → click «+ Добавить» → modal opens → fill form → save → row appears.

- [ ] **Step 7: Commit**

```bash
git add components/partner/PartnerShell.tsx components/partner/AdminAccountEditor.tsx app/partner/administrator/
git commit -m "feat(partner/administrator): list + editor with permissions, reset-password, kick"
git push origin main
```

---

## Task 5: Delete dead `/admin/analytics` + `/admin/services`

**Files:**
- Delete: `app/(app)/admin/analytics/` (whole directory)
- Delete: `app/(app)/admin/services/` (whole directory)
- Delete: `components/AdminSiteServicesManager.tsx`
- Delete: `components/AdminSiteServicesManager.tsx.backup`
- Modify (if it references them): `components/AdminHeader.tsx`

- [ ] **Step 1: Smoke test plan**

The two routes return 404. Header navigation no longer shows them. `npm run build` passes.

- [ ] **Step 2: Find header references**

Run: `grep -nE "analytics|services|/admin/(analytics|services)|AdminSiteServicesManager" components/AdminHeader.tsx` (or `Grep` tool).
Expected: a few link/button entries that need removal.

- [ ] **Step 3: Remove nav links from AdminHeader**

In `components/AdminHeader.tsx`, locate the menu/link list and remove the entries pointing to `/admin/analytics` and `/admin/services`. Leave all other nav items unchanged.

- [ ] **Step 4: Delete the directories and components**

```bash
rm -rf "app/(app)/admin/analytics"
rm -rf "app/(app)/admin/services"
rm "components/AdminSiteServicesManager.tsx"
rm "components/AdminSiteServicesManager.tsx.backup"
```

Also delete the underlying API if it's no longer used elsewhere. Run `grep -r "AdminSiteServicesManager" .` to confirm zero references before deleting `components/AdminSiteServicesManager*`. (Should be the case after Task 4 of the inventory plan and this cleanup.)

- [ ] **Step 5: Find other dangling imports**

Run: `grep -rn "AdminSiteServicesManager" app components lib`
Expected: no results. If any remain, remove those imports.

- [ ] **Step 6: Build + commit**

```bash
npm run build  # must PASS — if it fails, check for stale imports
git add -A
git commit -m "chore(admin): remove dead /admin/analytics + /admin/services"
git push origin main
```

---

## Task 6: Force-reset password page `/admin/login/change-password`

**Files:**
- Create: `app/admin/login/change-password/page.tsx` (server check + render)
- Create: `app/admin/login/change-password/ChangePasswordClient.tsx` (client form)
- Create: `app/api/admin/change-password/route.ts` (POST)
- Modify: `middleware.ts` (redirect to change-password if forcePasswordReset)

- [ ] **Step 1: Smoke test plan**

When a salon admin with `forcePasswordReset=true` logs in:
- `getServerSession` returns session with `forcePasswordReset: true`
- Middleware sees this and redirects ANY `/admin/*` (except `/admin/login` and `/admin/login/change-password`) to `/admin/login/change-password`
- Page shows a form: current password + new password (×2 confirm) + Save button
- POST `/api/admin/change-password` updates `passwordHash`, clears `forcePasswordReset`, bumps `sessionsInvalidatedAt` (so old JWT becomes invalid, user must log in again)
- After save → redirect to `/admin/login` with success toast

- [ ] **Step 2: Create the change-password API**

Create `app/api/admin/change-password/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbRetry } from "@/db/index-postgres";
import { salonAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "salonAdmin" || !session.user.adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const oldPassword = typeof body?.oldPassword === "string" ? body.oldPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < 8) return NextResponse.json({ error: "Новый пароль ≥ 8 символов" }, { status: 400 });
    if (oldPassword === newPassword) return NextResponse.json({ error: "Новый пароль совпадает со старым" }, { status: 400 });

    const [a] = await dbRetry(() => db.select().from(salonAdmins).where(eq(salonAdmins.id, session.user.adminId!)).limit(1));
    if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
    const oldOk = await bcrypt.compare(oldPassword, a.passwordHash);
    if (!oldOk) return NextResponse.json({ error: "Текущий пароль неверен" }, { status: 400 });

    const newHash = await bcrypt.hash(newPassword, 10);
    await dbRetry(() => db.update(salonAdmins)
      .set({
        passwordHash: newHash,
        forcePasswordReset: false,
        sessionsInvalidatedAt: new Date(),
      })
      .where(eq(salonAdmins.id, a.id))
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Change-password:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create the change-password page**

Create `app/admin/login/change-password/page.tsx`:

```ts
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ChangePasswordClient from "./ChangePasswordClient";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "salonAdmin") {
    redirect("/admin/login");
  }
  return <ChangePasswordClient />;
}
```

Create `app/admin/login/change-password/ChangePasswordClient.tsx`:

```tsx
"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function ChangePasswordClient() {
  const [oldP, setOldP] = useState("");
  const [newP, setNewP] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    if (newP !== confirm) { setErr("Пароли не совпадают"); return; }
    if (newP.length < 8) { setErr("Новый пароль должен быть ≥ 8 символов"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldP, newPassword: newP }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Ошибка");
      }
      // After password change, JWT is invalidated → sign out and redirect.
      await signOut({ redirect: false });
      window.location.href = "/admin/login?changed=1";
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#070709", padding: 24, fontFamily: "var(--font-montserrat)",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        background: "#0D0D10", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16, padding: 28,
      }}>
        <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
          Смените пароль
        </h1>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
          Владелец салона установил вам временный пароль. Задайте свой постоянный пароль для входа.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
          <Pwd label="Текущий (временный) пароль" value={oldP} onChange={setOldP} />
          <Pwd label="Новый пароль (≥ 8 символов)" value={newP} onChange={setNewP} />
          <Pwd label="Повторите новый" value={confirm} onChange={setConfirm} />
        </div>
        {err && (
          <div style={{
            marginTop: 12, padding: "10px 12px", borderRadius: 9,
            background: "rgba(239,68,68,0.12)", color: "#FCA5A5",
            fontSize: 13, fontWeight: 600,
          }}>{err}</div>
        )}
        <button type="button" onClick={save} disabled={saving}
          style={{
            marginTop: 18, width: "100%", height: 44,
            background: "#7B61FF", color: "#fff", border: "none", borderRadius: 11,
            fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
          }}>{saving ? "Сохраняем..." : "Сохранить пароль"}</button>
      </div>
    </div>
  );
}

function Pwd({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
      <input type="password" value={value} onChange={e => onChange(e.target.value)}
        style={{
          height: 44, padding: "0 14px", borderRadius: 11,
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff", fontSize: 14, outline: "none",
          fontFamily: "var(--font-montserrat)",
        }} />
    </label>
  );
}
```

- [ ] **Step 4: Add middleware redirect**

In `middleware.ts`, locate the admin protection block. Add a check for `forcePasswordReset` ABOVE the existing redirect logic:

```ts
// Force-password-reset redirect for salon admins
if (
  pathname.startsWith("/admin")
  && !pathname.startsWith("/admin/login")
) {
  const token = await getToken({ req: request });
  if (token && token.role === "salonAdmin" && token.forcePasswordReset) {
    if (!pathname.startsWith("/admin/login/change-password")) {
      return NextResponse.redirect(new URL("/admin/login/change-password", request.url));
    }
  }
}
```

Place this block right above the existing `// Admin protection` block.

- [ ] **Step 5: Build + commit**

```bash
npm run build  # must PASS
git add app/admin/login/change-password/ app/api/admin/change-password/ middleware.ts
git commit -m "feat(admin/auth): force-password-reset page + API + middleware redirect"
git push origin main
```

---

## Task 7: Multi-tenant scope — `app/(app)/admin/page.tsx`

**Files:**
- Modify: `app/(app)/admin/page.tsx`

- [ ] **Step 1: Smoke test plan**

When a salon admin (e.g. salonId=2) opens `/admin`, the page shows **only** that salon's appointments, masters, services, work slots, and schedule blocks for the selected date. The legacy global admin still sees everything (no filter applied for `role === "admin"`).

- [ ] **Step 2: Refactor `getAdminDataForDate`**

In `app/(app)/admin/page.tsx`, the function currently is:

```ts
async function getAdminDataForDate(dateStr: string) {
  const [appointmentsData, mastersData, servicesData, workSlotsData, blocksData] = await Promise.all([
    db.select().from(appointments).where(eq(appointments.appointmentDate, dateStr)).orderBy(appointments.startTime as any),
    db.select().from(masters).where(eq(masters.isActive, true)),
    db.select().from(services),
    db.select().from(workSlots).where(eq(workSlots.workDate, dateStr)).orderBy(workSlots.startTime as any),
    db.select().from(scheduleBlocks).where(eq(scheduleBlocks.blockDate, dateStr)),
  ]);
  return { dateStr, appointmentsData, mastersData, servicesData, workSlotsData, blocksData };
}
```

Change to accept a `salonId: number | null` argument and add the filter:

```ts
async function getAdminDataForDate(dateStr: string, salonId: number | null) {
  const apptCond = salonId
    ? and(eq(appointments.appointmentDate, dateStr), eq(appointments.salonId, salonId))
    : eq(appointments.appointmentDate, dateStr);
  const masterCond = salonId
    ? and(eq(masters.isActive, true), eq(masters.salonId, salonId))
    : eq(masters.isActive, true);
  const serviceCond = salonId ? eq(services.salonId, salonId) : undefined;
  const slotCond = salonId
    ? and(eq(workSlots.workDate, dateStr), eq(workSlots.salonId, salonId))
    : eq(workSlots.workDate, dateStr);
  // scheduleBlocks has no salonId in current schema — filter via masters join
  const blockCond = eq(scheduleBlocks.blockDate, dateStr);

  const [appointmentsData, mastersData, servicesData, workSlotsData, blocksData] = await Promise.all([
    db.select().from(appointments).where(apptCond).orderBy(appointments.startTime as any),
    db.select().from(masters).where(masterCond),
    serviceCond ? db.select().from(services).where(serviceCond) : db.select().from(services),
    db.select().from(workSlots).where(slotCond).orderBy(workSlots.startTime as any),
    db.select().from(scheduleBlocks).where(blockCond),
  ]);

  // Post-filter blocks by mastersData (scheduleBlocks has no salonId column)
  const masterIds = new Set(mastersData.map((m: any) => m.id));
  const filteredBlocks = salonId ? blocksData.filter((b: any) => masterIds.has(b.masterId)) : blocksData;

  return { dateStr, appointmentsData, mastersData, servicesData, workSlotsData, blocksData: filteredBlocks };
}
```

Make sure `and` is imported from `drizzle-orm` at the top of the file (the existing import has `eq`; add `and`).

- [ ] **Step 3: Get salonId from session and pass it**

The top of `AdminDashboardPage` currently has:

```ts
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  // ...
  const { dateStr, ... } = await getAdminDataForDate(currentDateStr);
```

Change to read the session and pass the salonId:

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getServerSession(authOptions);
  // Salon admin: pass salonId. Legacy global admin: null (no filter).
  const salonId =
    session?.user?.role === "salonAdmin" && session.user.salonId
      ? session.user.salonId
      : null;

  const params = await searchParams;
  // ...
  const { dateStr, ... } = await getAdminDataForDate(currentDateStr, salonId);
```

- [ ] **Step 4: Build + commit**

```bash
npm run build  # must PASS
git add "app/(app)/admin/page.tsx"
git commit -m "feat(admin): scope main dashboard queries to session.salonId"
git push origin main
```

---

## Task 8: Multi-tenant scope — work-slots APIs

**Files:**
- Modify: `app/api/work-slots-admin/route.ts`
- Modify: `app/api/work-slot-change-requests-admin/route.ts`
- Modify: `app/api/work-slots-stream/route.ts`

- [ ] **Step 1: Smoke test plan**

Each endpoint either (a) returns 401 for non-admins, (b) returns 403 if salon admin lacks the `schedule` permission, or (c) for the legacy admin returns unfiltered data; for the salon admin returns only that salon's rows.

- [ ] **Step 2: Refactor `app/api/work-slots-admin/route.ts`**

Read the current file. For every method (GET/POST/PATCH/DELETE) that this route exposes, add the pattern:

```ts
const { session, response } = await requireAdminSession("schedule");
if (!session) return response;
```

Then for every `db.select()` or `db.update()` involving `workSlots`, add the salonId filter:

```ts
const conds = [/* existing conditions */];
if (session.salonId) conds.push(eq(workSlots.salonId, session.salonId));
const rows = await db.select().from(workSlots).where(and(...conds));
```

And every INSERT must include `salonId: session.salonId` (since legacy admin would write without a salonId — set it from the row being modified or refuse insert if `session.salonId === null` since legacy admin shouldn't be creating data in v1).

Apply the same pattern to every method handler in the file.

- [ ] **Step 3: Refactor `app/api/work-slot-change-requests-admin/route.ts`**

Same pattern. Note: `workSlotChangeRequests` doesn't have a `salonId` column — filter via JOIN to `workSlots` (which does) or `masters` (which does).

For GET:
```ts
const rows = await db
  .select(...)
  .from(workSlotChangeRequests)
  .innerJoin(workSlots, eq(workSlotChangeRequests.workSlotId, workSlots.id))
  .where(session.salonId ? eq(workSlots.salonId, session.salonId) : undefined);
```

- [ ] **Step 4: Refactor `app/api/work-slots-stream/route.ts`**

This is an SSE endpoint. It needs the session check upfront (before the long-lived connection opens), and the events it streams must be filtered to the session's salonId. Read the current file to understand its event pattern, then add filtering.

- [ ] **Step 5: Build + commit**

```bash
npm run build  # must PASS
git add app/api/work-slots-admin/ app/api/work-slot-change-requests-admin/ app/api/work-slots-stream/
git commit -m "feat(admin/api): scope work-slot endpoints to session.salonId + require schedule perm"
git push origin main
```

---

## Task 9: Multi-tenant scope — admin sub-APIs

**Files:**
- Modify: `app/api/admin/optimize-schedule/route.ts`
- Modify: `app/api/admin/optimize-schedule/apply/route.ts`
- Modify: `app/api/admin/optimize-schedule/send/route.ts`
- Modify: `app/api/admin/preliminary-confirm/route.ts`
- Modify: `app/api/admin/schedule-block/route.ts`

- [ ] **Step 1: Smoke test plan**

Each of these endpoints:
- Requires admin session (legacy or salon)
- For salon admin: requires the relevant permission (`schedule` for slot/block ops, `optimize` for optimize, `bookings` for preliminary-confirm)
- All DB queries filter by salonId for salon admins

- [ ] **Step 2: Refactor `optimize-schedule/*`**

In each of the three `optimize-schedule` files (`route.ts`, `apply/route.ts`, `send/route.ts`), wrap the entry with:

```ts
const { session, response } = await requireAdminSession("optimize");
if (!session) return response;
```

Then verify every appointment/master/workSlot query has `if (session.salonId) ... eq(table.salonId, session.salonId)` in the WHERE.

The `apply` and `send` handlers create or update `scheduleOptimizations` / `optimizationMoves` rows. Verify the underlying appointments/masters belong to the session's salon before allowing the operation. Pattern: before mutating, do a quick verification SELECT.

- [ ] **Step 3: Refactor `preliminary-confirm/route.ts`**

Pattern:
```ts
const { session, response } = await requireAdminSession("bookings");
if (!session) return response;

// Before confirming the appointment, verify it belongs to the salon
const [appt] = await db.select({ id: appointments.id, salonId: appointments.salonId })
  .from(appointments).where(eq(appointments.id, idNum));
if (!appt) return NextResponse.json({ error: "not found" }, { status: 404 });
if (session.salonId && appt.salonId !== session.salonId) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
// proceed with the update
```

- [ ] **Step 4: Refactor `schedule-block/route.ts`**

Use `requireAdminSession("schedule")`. The `scheduleBlocks` table has no `salonId`, so verify via the parent master:

```ts
const [m] = await db.select({ id: masters.id, salonId: masters.salonId })
  .from(masters).where(eq(masters.id, body.masterId));
if (!m) return 404;
if (session.salonId && m.salonId !== session.salonId) return 403;
```

- [ ] **Step 5: Build + commit**

```bash
npm run build  # must PASS
git add app/api/admin/optimize-schedule/ app/api/admin/preliminary-confirm/ app/api/admin/schedule-block/
git commit -m "feat(admin/api): scope optimize/preliminary/schedule-block to salonId + require perms"
git push origin main
```

---

## Task 10: Permission gates in admin UI

**Files:**
- Modify: `app/(app)/admin/page.tsx`
- Modify: each admin component that has edit/save buttons — `components/AdminAppointmentManager.tsx`, `components/AdminWorkSlotsCreator.tsx`, `components/AdminWorkSlotsList.tsx`, `components/AdminScheduleOptimizer.tsx`, `components/AdminScheduleOptimizerButton.tsx`, `components/AdminAddBlockButton.tsx`, `components/AdminAddBlockModal.tsx`, `components/AdminBlockManager.tsx`, `components/AdminMasterCreator.tsx`, `components/AdminRoleCreator.tsx`, `components/AdminAutoOptimizeDelay.tsx`, `components/AdminOptimizeSettings.tsx`, `components/AdminWorkSlotChangeRequests.tsx`, `components/AdminPreliminaryBookings.tsx`

- [ ] **Step 1: Smoke test plan**

When a salon admin logs in:
- Buttons / inputs for actions outside their permissions are disabled with a tooltip "Нет прав. Свяжитесь с владельцем салона."
- Read-only display still works for everything.
- Legacy global admin sees all buttons enabled.

- [ ] **Step 2: Add session perms loader to the main admin page**

In `app/(app)/admin/page.tsx`, get the perms from the session:

```ts
const perms = session?.user?.role === "salonAdmin"
  ? session.user.perms
  : { schedule: true, bookings: true, masters: true, bots: true, optimize: true, inventory: true }; // legacy = all
```

Pass `perms` down to each admin component as a prop:

```tsx
<AdminAppointmentManager perms={perms} ... />
<AdminWorkSlotsCreator perms={perms} ... />
```

- [ ] **Step 3: Update each component to accept `perms` and gate its buttons**

For each admin component file:

```tsx
// Add to props interface:
interface Props {
  // ... existing props
  perms: { schedule: boolean; bookings: boolean; masters: boolean; bots: boolean; optimize: boolean; inventory: boolean; };
}

// Locate every action button (Edit, Save, Delete, Confirm, Optimize) and add:
<button
  disabled={!props.perms.X}  // X = the relevant permission
  title={!props.perms.X ? "Нет прав. Свяжитесь с владельцем салона." : ""}
  // ... existing props
>
```

Permission mapping:
- `AdminAppointmentManager` → `bookings` (edit/cancel/reschedule)
- `AdminWorkSlotsCreator`, `AdminWorkSlotsList` → `schedule`
- `AdminScheduleOptimizer`, `AdminScheduleOptimizerButton`, `AdminAutoOptimizeDelay`, `AdminOptimizeSettings` → `optimize`
- `AdminAddBlockButton`, `AdminAddBlockModal`, `AdminBlockManager` → `schedule`
- `AdminMasterCreator`, `AdminRoleCreator` → `masters`
- `AdminWorkSlotChangeRequests` → `schedule` (approve/reject change requests)
- `AdminPreliminaryBookings` → `bookings`

For components used elsewhere or which already have their own logic, the perm prop is optional — default to all-true at the top of the component if not provided.

- [ ] **Step 4: Build + commit**

```bash
npm run build  # must PASS
git add "app/(app)/admin/page.tsx" components/Admin*.tsx
git commit -m "feat(admin/ui): disable action buttons based on session.perms"
git push origin main
```

---

## Task 11: Update `BRIEF_FOR_GEMINI.md`

**Files:**
- Modify: `BRIEF_FOR_GEMINI.md`

- [ ] **Step 1: Update §3 (what's built) — add new row**

In the partner-cabinet table, add this row after «Склад» and before «Расписание»:

```markdown
| Администратор | `/partner/administrator` | ✅ | Управление аккаунтами сотрудников салона: создать/редактировать, 6 переключателей прав (расписание/записи/мастера/боты/авто-опт/склад), кнопка «Сбросить пароль» (force_password_reset+invalidate sessions), кнопка «Выгнать отовсюду», soft-archive. Логин админа на `/admin/login`. |
```

- [ ] **Step 2: Update §6 — move «Роли / permissions» from gaps to "уже есть"**

In §6:

Find the "Что у нас уже есть" list and add:

```markdown
- ✅ Роли: partner / salonAdmin / admin (legacy) с 6 переключателями прав для админа на уровне раздела
```

Find the "Что у нас уже частично" list and update «Роли/permissions» entry (if any) or add:

```markdown
- 🟡 **Granular permissions** — есть переключатели по разделам (schedule/bookings/masters/bots/optimize/inventory), но не по операциям (например, нет отдельно «может смотреть Записи но не может удалять»)
```

- [ ] **Step 3: Update §5 (planned) — remove items now done**

Remove or strike-through any «роли / админ-аккаунты / разные люди в одной команде» entry that is now done.

- [ ] **Step 4: Commit**

```bash
git add BRIEF_FOR_GEMINI.md
git commit -m "docs: add salon admin section to BRIEF_FOR_GEMINI"
git push origin main
```

---

## Self-review

Spec coverage check:

| Spec section | Task | ✓ |
|---|---|---|
| §2 schema `salon_admins` | Task 1 | ✓ |
| §3 NextAuth admin provider + JWT shape | Task 2 | ✓ |
| §3 force-password-reset flow | Task 2 (flag set) + Task 6 (UI + redirect) | ✓ |
| §3 sessions_invalidated_at + JWT iat check | Task 2 (in `requireAdminSession`) | ✓ |
| §4 `requireAdminSession(perm?)` | Task 2 | ✓ |
| §5 multi-tenant scope `/admin/page.tsx` | Task 7 | ✓ |
| §5 work-slots* APIs | Task 8 | ✓ |
| §5 admin sub-APIs | Task 9 | ✓ |
| §6 delete dead routes | Task 5 | ✓ |
| §7.1 sidebar | Task 4 | ✓ |
| §7.2 list page | Task 4 | ✓ |
| §7.3 AdminAccountEditor modal | Task 4 | ✓ |
| §7.5 partner API endpoints | Task 3 | ✓ |
| §8 partner-admin data link | (free — same DB; no work) | ✓ |
| §10 security details (rate limit, bcrypt cost, soft delete) | Task 2 (rate limit) + Task 3 (bcrypt cost 10) + Task 3 (soft delete pattern) | ✓ |
| §11 checklist | Tasks 1-11 cover all 11 items | ✓ |
| UI permission gates | Task 10 | ✓ |

Placeholder scan: no «TBD» / «implement later». Task 3 step 3 has full code. Task 4 step 4 has a substantial design spec — the implementer must build a ~400 line modal but the prop interfaces and behavior are precise.

Type consistency: `AdminPermission` and the `perms` shape match across Task 2 (definition), Task 8/9/10 (consumers). `SalonAdminData` interface in Task 4 step 4 includes all fields that the GET endpoint in Task 3 step 3 returns (cross-checked). `requireAdminSession` signature is defined once in Task 2 and consumed by Tasks 8/9 — consistent.

One spec requirement not explicitly mapped: §7.3 «кнопка сгенерировать» for password input. Covered in Task 4 step 4 pseudocode.

Plan complete.
