# Inventory & Materials Warehouse — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the inventory subsystem from the design spec — full materials catalog, FIFO arrivals, per-variant recipes, and auto-prefilled appointment usage with FIFO consumption.

**Architecture:** 4 new tables in Drizzle schema (Postgres on Supabase), 10 new partner-scoped API endpoints, a new `/partner/inventory` section with 3 tabs (catalog / arrivals / usage), 3 new modals (`MaterialEditor`, `ArrivalEditor`, `MaterialDetailModal`), recipe editor inside the existing `ServiceEditor`, and a completion sub-view inside `AppointmentDetailModal`. FIFO consumption is wrapped in a DB transaction with `SELECT … FOR UPDATE` on lot rows to avoid races.

**Tech Stack:** Next.js 15 App Router (TS) · Drizzle ORM · Postgres (Supabase pooler, with `dbRetry`) · NextAuth (`requirePartnerSession`) · BeautyBook UI tokens (inline styles + Montserrat).

**Reference spec:** [`docs/superpowers/specs/2026-05-20-inventory-design.md`](../specs/2026-05-20-inventory-design.md)

**Project conventions (must follow):**
- DB import in Next.js: `import { db, dbRetry } from "@/db/index-postgres"`
- Money: integers in **копейки** (`integer`)
- Quantity: `numeric(12, 2)` decimals
- Dates: `getFullYear/getMonth/getDate` (never `toISOString().slice(0,10)`)
- All partner endpoints behind `requirePartnerSession`, every query filters by `session.salonId`
- No unit tests in repo — smoke tests via `npm run build` + manual / curl verification per task

---

## File map

| File | What |
|---|---|
| `db/schema-postgres.ts` | + 4 new tables + types |
| `app/api/partner/materials/route.ts` | GET list (with stock + avg price), POST create |
| `app/api/partner/materials/[id]/route.ts` | PATCH, DELETE (soft) |
| `app/api/partner/material-lots/route.ts` | GET list with filters, POST create |
| `app/api/partner/services/[id]/variants/[vid]/materials/route.ts` | GET recipe, PUT replace |
| `app/api/partner/usage/route.ts` | GET usage journal with filters |
| `app/api/partner/usage/[id]/route.ts` | DELETE one usage row (returns to lots) |
| `app/api/partner/appointments/[id]/usage/route.ts` | POST commit usage (FIFO txn) |
| `lib/inventory.ts` | Shared types + FIFO helper used by usage POST/DELETE |
| `app/partner/inventory/page.tsx` | Server wrapper, SSR-prefetch materials |
| `app/partner/inventory/InventoryClient.tsx` | Tab switcher (Catalog/Arrivals/Usage) |
| `app/partner/inventory/CatalogTab.tsx` | List of materials |
| `app/partner/inventory/ArrivalsTab.tsx` | List of lots |
| `app/partner/inventory/UsageTab.tsx` | List of usages grouped by date |
| `components/partner/MaterialEditor.tsx` | Create/edit material modal |
| `components/partner/ArrivalEditor.tsx` | Add lot modal |
| `components/partner/MaterialDetailModal.tsx` | Material's full history |
| `components/partner/PartnerShell.tsx` | + sidebar nav item «Склад» (icon: box) |
| `components/partner/ServiceEditor.tsx` | + recipe block under each variant |
| `components/partner/AppointmentDetailModal.tsx` | + completion sub-view with usage editor |
| `BRIEF_FOR_GEMINI.md` | mark «Склад / товары / расходники» as done in §6 |

---

## Task 1: Schema — add 4 inventory tables

**Files:**
- Modify: `db/schema-postgres.ts` (append after `reviews` table)

- [ ] **Step 1: Smoke test plan**

Tables `materials`, `material_lots`, `service_variant_materials`, `appointment_material_usage` must exist in the Postgres database with the columns from the spec, types must be inferable via `$inferSelect`, and `npm run build` must pass (Drizzle type-checks the schema at build time).

- [ ] **Step 2: Verify failure / starting state**

Run: `npm run build`
Expected: PASS — baseline build is clean (no inventory references anywhere yet).

- [ ] **Step 3: Add the tables to schema**

Append to [db/schema-postgres.ts](../../../db/schema-postgres.ts) after the existing `reviews` table:

```ts
import { jsonb, numeric } from "drizzle-orm/pg-core";
// (if these are not already imported at the top — check first; add to existing import)

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  unit: varchar("unit", { length: 16 }).notNull(),
  category: varchar("category", { length: 100 }),
  lowStockThreshold: numeric("low_stock_threshold", { precision: 12, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materialLots = pgTable("material_lots", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull(),
  materialId: integer("material_id").notNull(),
  qtyInitial: numeric("qty_initial", { precision: 12, scale: 2 }).notNull(),
  qtyRemaining: numeric("qty_remaining", { precision: 12, scale: 2 }).notNull(),
  pricePerUnit: integer("price_per_unit").notNull(), // копейки
  supplier: varchar("supplier", { length: 200 }),
  arrivedAt: varchar("arrived_at", { length: 10 }).notNull(), // YYYY-MM-DD
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceVariantMaterials = pgTable("service_variant_materials", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull(),
  variantId: integer("variant_id").notNull(),
  materialId: integer("material_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
});

export const appointmentMaterialUsage = pgTable("appointment_material_usage", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull(),
  appointmentId: integer("appointment_id").notNull(),
  materialId: integer("material_id").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  totalCost: integer("total_cost").notNull(), // копейки
  lotsConsumed: jsonb("lots_consumed").notNull(), // [{lotId, qty, price}]
  shortfall: numeric("shortfall", { precision: 12, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type MaterialLot = typeof materialLots.$inferSelect;
export type NewMaterialLot = typeof materialLots.$inferInsert;
export type ServiceVariantMaterial = typeof serviceVariantMaterials.$inferSelect;
export type NewServiceVariantMaterial = typeof serviceVariantMaterials.$inferInsert;
export type AppointmentMaterialUsage = typeof appointmentMaterialUsage.$inferSelect;
export type NewAppointmentMaterialUsage = typeof appointmentMaterialUsage.$inferInsert;
```

If `jsonb` / `numeric` are not yet imported at the top of the file, add them to the existing `drizzle-orm/pg-core` import line.

- [ ] **Step 4: Push schema to Postgres**

Run: `npm run db:push`
Expected: Drizzle reports «adding table … materials … material_lots … service_variant_materials … appointment_material_usage» and exits 0. Re-running should report «No changes detected».

- [ ] **Step 5: Verify build still passes**

Run: `npm run build`
Expected: PASS — no TS errors from the new types.

- [ ] **Step 6: Commit**

```bash
git add db/schema-postgres.ts
git commit -m "feat(db): add inventory tables — materials, lots, recipes, usage"
```

---

## Task 2: Shared FIFO helper in `lib/inventory.ts`

**Files:**
- Create: `lib/inventory.ts`

- [ ] **Step 1: Smoke test plan**

The helper exposes one function `consumeFifo(tx, salonId, materialId, quantity)` that, inside an open Drizzle transaction, decrements `qtyRemaining` across `material_lots` ordered by `arrivedAt ASC, id ASC`, returns `{ consumed: [{lotId, qty, price}], totalCost, shortfall }`. The build must pass.

- [ ] **Step 2: Verify failure / starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Create the helper**

Create [lib/inventory.ts](../../../lib/inventory.ts):

```ts
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { materialLots } from "@/db/schema";

export interface ConsumedLot {
  lotId: number;
  qty: number;          // numeric, two decimals max
  price: number;        // копейки per unit
}

export interface FifoResult {
  consumed: ConsumedLot[];
  totalCost: number;    // копейки
  shortfall: number;    // amount that couldn't be allocated
}

// Drizzle transaction type is hard to import directly — use a structural type.
type Tx = Parameters<Parameters<typeof import("@/db/index-postgres").db.transaction>[0]>[0];

/**
 * Consume `quantity` of `materialId` from material_lots using FIFO.
 * Must be called inside an open Drizzle transaction. Locks the affected
 * lot rows with SELECT ... FOR UPDATE to avoid races on parallel writes.
 *
 * If on-hand stock is less than `quantity`, drains stock to zero and
 * reports the missing amount in `shortfall` (never goes negative).
 */
export async function consumeFifo(
  tx: Tx,
  salonId: number,
  materialId: number,
  quantity: number,
): Promise<FifoResult> {
  const lots = await tx
    .select()
    .from(materialLots)
    .where(and(
      eq(materialLots.salonId, salonId),
      eq(materialLots.materialId, materialId),
      gt(materialLots.qtyRemaining, "0"),
    ))
    .orderBy(asc(materialLots.arrivedAt), asc(materialLots.id))
    .for("update");

  let remaining = quantity;
  const consumed: ConsumedLot[] = [];
  let totalCost = 0;

  for (const lot of lots) {
    if (remaining <= 0) break;
    const available = Number(lot.qtyRemaining);
    const take = Math.min(remaining, available);

    await tx
      .update(materialLots)
      .set({
        qtyRemaining: sql`${materialLots.qtyRemaining} - ${take.toFixed(2)}`,
      })
      .where(eq(materialLots.id, lot.id));

    consumed.push({ lotId: lot.id, qty: take, price: lot.pricePerUnit });
    totalCost += Math.round(take * lot.pricePerUnit);
    remaining -= take;
  }

  return {
    consumed,
    totalCost,
    shortfall: Math.max(0, remaining),
  };
}

/**
 * Return previously-consumed quantities back to their lots (used when a
 * usage row is deleted). Restores into the original lot when possible.
 * Must run inside a transaction.
 */
export async function returnFifo(tx: Tx, salonId: number, consumed: ConsumedLot[]): Promise<void> {
  for (const c of consumed) {
    await tx
      .update(materialLots)
      .set({
        qtyRemaining: sql`${materialLots.qtyRemaining} + ${c.qty.toFixed(2)}`,
      })
      .where(and(
        eq(materialLots.salonId, salonId),
        eq(materialLots.id, c.lotId),
      ));
  }
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: PASS — types compile, helper is exported but unused so far (no warnings expected in this codebase).

- [ ] **Step 5: Commit**

```bash
git add lib/inventory.ts
git commit -m "feat(inventory): FIFO consume/return helper with SELECT FOR UPDATE"
```

---

## Task 3: Materials CRUD API

**Files:**
- Create: `app/api/partner/materials/route.ts`
- Create: `app/api/partner/materials/[id]/route.ts`

- [ ] **Step 1: Smoke test plan**

```
GET  /api/partner/materials   → [{id, name, unit, currentStock, avgPrice, ...}]
POST /api/partner/materials   → create with {name, unit, category?, lowStockThreshold?}
PATCH /api/partner/materials/<id> → update editable fields
DELETE /api/partner/materials/<id> → soft delete (sets archivedAt, isActive=false)
All require a partner session (401 without).
GET response includes computed currentStock (SUM qtyRemaining) and avgPrice
  (weighted avg, копейки).
```

Verification: after Task 4 finishes, we'll be able to insert a lot and re-fetch
to see `currentStock > 0`. For now: create one material via curl, GET it back,
PATCH name, DELETE → next GET excludes archived by default.

- [ ] **Step 2: Verify failure / starting state**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/partner/materials`
Expected: 404 (route doesn't exist yet).

- [ ] **Step 3: Create list + create route**

Create [app/api/partner/materials/route.ts](../../../app/api/partner/materials/route.ts):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { materials, materialLots } from "@/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  const includeArchived = req.nextUrl.searchParams.get("archived") === "1";

  try {
    const rows = await dbRetry(() => db
      .select({
        id: materials.id,
        name: materials.name,
        unit: materials.unit,
        category: materials.category,
        lowStockThreshold: materials.lowStockThreshold,
        isActive: materials.isActive,
        archivedAt: materials.archivedAt,
        currentStock: sql<string>`COALESCE(SUM(${materialLots.qtyRemaining}), 0)`,
        totalValue: sql<string>`COALESCE(SUM(${materialLots.qtyRemaining} * ${materialLots.pricePerUnit}), 0)`,
      })
      .from(materials)
      .leftJoin(materialLots, eq(materialLots.materialId, materials.id))
      .where(includeArchived
        ? eq(materials.salonId, session.salonId)
        : and(eq(materials.salonId, session.salonId), isNull(materials.archivedAt)))
      .groupBy(materials.id)
      .orderBy(asc(materials.name))
    );
    // avgPrice in копейки per unit; null if no stock
    const enriched = rows.map(r => {
      const stock = Number(r.currentStock);
      const value = Number(r.totalValue);
      return {
        ...r,
        currentStock: stock,
        totalValue: value,
        avgPrice: stock > 0 ? Math.round(value / stock) : null,
      };
    });
    return NextResponse.json(enriched);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Materials GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

const ALLOWED_UNITS = ["g", "ml", "pcs", "m"] as const;

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const unit = typeof body?.unit === "string" ? body.unit : "";
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    if (!ALLOWED_UNITS.includes(unit as typeof ALLOWED_UNITS[number])) {
      return NextResponse.json({ error: "unit must be g | ml | pcs | m" }, { status: 400 });
    }
    const category = typeof body?.category === "string" && body.category.trim() ? body.category.trim() : null;
    const thr = body?.lowStockThreshold != null && body.lowStockThreshold !== ""
      ? String(Number(body.lowStockThreshold))
      : null;

    const [row] = await dbRetry(() => db
      .insert(materials)
      .values({ salonId: session.salonId, name, unit, category, lowStockThreshold: thr })
      .returning()
    );
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Materials POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create patch + delete route**

Create [app/api/partner/materials/[id]/route.ts](../../../app/api/partner/materials/%5Bid%5D/route.ts):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { materials } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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
    if (typeof body?.category === "string") patch.category = body.category.trim() || null;
    if ("lowStockThreshold" in body) {
      patch.lowStockThreshold = body.lowStockThreshold != null && body.lowStockThreshold !== ""
        ? String(Number(body.lowStockThreshold)) : null;
    }
    if (typeof body?.isActive === "boolean") patch.isActive = body.isActive;
    // Unit change is forbidden by design (past quantities lose meaning).
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "nothing to update" }, { status: 400 });
    }
    const [row] = await dbRetry(() => db
      .update(materials)
      .set(patch)
      .where(and(eq(materials.id, id), eq(materials.salonId, session.salonId)))
      .returning()
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Materials PATCH:", msg);
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
    const [row] = await dbRetry(() => db
      .update(materials)
      .set({ isActive: false, archivedAt: new Date() })
      .where(and(eq(materials.id, id), eq(materials.salonId, session.salonId)))
      .returning()
    );
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Materials DELETE:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 5: Build + smoke test**

Run: `npm run build`
Expected: PASS.

(Manual smoke after dev server up — partner needs to be logged in via browser. The `requirePartnerSession` makes raw curl 401, which is correct behavior. To exercise the route, use the browser DevTools network tab after creating a material via the upcoming UI.)

- [ ] **Step 6: Commit**

```bash
git add app/api/partner/materials/
git commit -m "feat(api): materials CRUD with computed currentStock + avgPrice"
```

---

## Task 4: Material lots API (arrivals)

**Files:**
- Create: `app/api/partner/material-lots/route.ts`

- [ ] **Step 1: Smoke test plan**

```
GET  /api/partner/material-lots?materialId=&from=&to=&supplier=
     → [{id, materialId, materialName, qtyInitial, qtyRemaining, pricePerUnit, supplier, arrivedAt, note}, ...]
POST /api/partner/material-lots
     body: {materialId, qty, pricePerUnit, arrivedAt, supplier?, note?}
     → returns the created lot. Sets qtyRemaining = qty initially.
After POST, the parent material's currentStock (from Task 3 GET) grows by qty.
```

- [ ] **Step 2: Verify failure / starting state**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/partner/material-lots`
Expected: 404.

- [ ] **Step 3: Create route**

Create [app/api/partner/material-lots/route.ts](../../../app/api/partner/material-lots/route.ts):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { materials, materialLots } from "@/db/schema";
import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const sp = req.nextUrl.searchParams;
    const materialId = sp.get("materialId") ? Number(sp.get("materialId")) : null;
    const from = sp.get("from");
    const to = sp.get("to");
    const supplier = sp.get("supplier");
    const conds = [eq(materialLots.salonId, session.salonId)];
    if (materialId) conds.push(eq(materialLots.materialId, materialId));
    if (from) conds.push(gte(materialLots.arrivedAt, from));
    if (to)   conds.push(lte(materialLots.arrivedAt, to));
    if (supplier) conds.push(ilike(materialLots.supplier, `%${supplier}%`));

    const rows = await dbRetry(() => db
      .select({
        id: materialLots.id,
        materialId: materialLots.materialId,
        materialName: materials.name,
        materialUnit: materials.unit,
        qtyInitial: materialLots.qtyInitial,
        qtyRemaining: materialLots.qtyRemaining,
        pricePerUnit: materialLots.pricePerUnit,
        supplier: materialLots.supplier,
        arrivedAt: materialLots.arrivedAt,
        note: materialLots.note,
        createdAt: materialLots.createdAt,
      })
      .from(materialLots)
      .innerJoin(materials, eq(materials.id, materialLots.materialId))
      .where(and(...conds))
      .orderBy(desc(materialLots.arrivedAt), desc(materialLots.id))
      .limit(500)
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Lots GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const body = await req.json();
    const materialId = Number(body?.materialId);
    const qty = Number(body?.qty);
    const pricePerUnit = Math.round(Number(body?.pricePerUnit));
    const arrivedAt = typeof body?.arrivedAt === "string" ? body.arrivedAt : "";
    const supplier = typeof body?.supplier === "string" && body.supplier.trim() ? body.supplier.trim() : null;
    const note = typeof body?.note === "string" && body.note.trim() ? body.note.trim() : null;

    if (!materialId)              return NextResponse.json({ error: "materialId required" }, { status: 400 });
    if (!Number.isFinite(qty) || qty <= 0)
                                   return NextResponse.json({ error: "qty must be > 0" }, { status: 400 });
    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0)
                                   return NextResponse.json({ error: "pricePerUnit must be ≥ 0" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(arrivedAt))
                                   return NextResponse.json({ error: "arrivedAt must be YYYY-MM-DD" }, { status: 400 });

    // Ensure material belongs to this salon
    const [m] = await dbRetry(() => db
      .select({ id: materials.id })
      .from(materials)
      .where(and(eq(materials.id, materialId), eq(materials.salonId, session.salonId)))
    );
    if (!m) return NextResponse.json({ error: "material not found" }, { status: 404 });

    const [row] = await dbRetry(() => db
      .insert(materialLots)
      .values({
        salonId: session.salonId,
        materialId,
        qtyInitial: qty.toFixed(2),
        qtyRemaining: qty.toFixed(2),
        pricePerUnit,
        supplier,
        arrivedAt,
        note,
      })
      .returning()
    );
    return NextResponse.json(row);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Lots POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/partner/material-lots/
git commit -m "feat(api): material-lots GET (with filters) + POST"
```

---

## Task 5: Service variant recipe API

**Files:**
- Create: `app/api/partner/services/[id]/variants/[vid]/materials/route.ts`

- [ ] **Step 1: Smoke test plan**

```
GET /api/partner/services/<sid>/variants/<vid>/materials
     → [{materialId, materialName, materialUnit, quantity}, ...]
PUT /api/partner/services/<sid>/variants/<vid>/materials
     body: {items: [{materialId, quantity}, ...]}
     → replaces entire recipe; duplicate materialIds rejected.
Variant ownership is checked against the salon via the parent service.
```

- [ ] **Step 2: Verify failure / starting state**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/partner/services/1/variants/1/materials`
Expected: 404 (route absent).

- [ ] **Step 3: Create route**

Create [app/api/partner/services/[id]/variants/[vid]/materials/route.ts](../../../app/api/partner/services/%5Bid%5D/variants/%5Bvid%5D/materials/route.ts):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { services, serviceVariants, materials, serviceVariantMaterials } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function ensureVariantOwned(salonId: number, serviceId: number, variantId: number) {
  const [v] = await dbRetry(() => db
    .select({ id: serviceVariants.id })
    .from(serviceVariants)
    .innerJoin(services, eq(services.id, serviceVariants.serviceId))
    .where(and(
      eq(serviceVariants.id, variantId),
      eq(serviceVariants.serviceId, serviceId),
      eq(services.salonId, salonId),
    ))
  );
  return !!v;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr, vid: vidStr } = await params;
    const serviceId = Number(idStr);
    const variantId = Number(vidStr);
    if (!serviceId || !variantId) return NextResponse.json({ error: "bad ids" }, { status: 400 });
    const owned = await ensureVariantOwned(session.salonId, serviceId, variantId);
    if (!owned) return NextResponse.json({ error: "variant not found" }, { status: 404 });

    const rows = await dbRetry(() => db
      .select({
        materialId: serviceVariantMaterials.materialId,
        materialName: materials.name,
        materialUnit: materials.unit,
        quantity: serviceVariantMaterials.quantity,
      })
      .from(serviceVariantMaterials)
      .innerJoin(materials, eq(materials.id, serviceVariantMaterials.materialId))
      .where(eq(serviceVariantMaterials.variantId, variantId))
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Recipe GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; vid: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr, vid: vidStr } = await params;
    const serviceId = Number(idStr);
    const variantId = Number(vidStr);
    if (!serviceId || !variantId) return NextResponse.json({ error: "bad ids" }, { status: 400 });
    const owned = await ensureVariantOwned(session.salonId, serviceId, variantId);
    if (!owned) return NextResponse.json({ error: "variant not found" }, { status: 404 });

    const body = await req.json();
    const items: { materialId: number; quantity: number }[] = Array.isArray(body?.items) ? body.items : [];
    const cleaned = items
      .map(i => ({ materialId: Number(i.materialId), quantity: Number(i.quantity) }))
      .filter(i => Number.isFinite(i.materialId) && i.materialId > 0
                && Number.isFinite(i.quantity) && i.quantity > 0);

    // Dedup check
    const seen = new Set<number>();
    for (const i of cleaned) {
      if (seen.has(i.materialId)) return NextResponse.json({ error: "duplicate materialId" }, { status: 400 });
      seen.add(i.materialId);
    }

    // Validate every material belongs to this salon
    if (cleaned.length > 0) {
      const ids = cleaned.map(i => i.materialId);
      const owned = await dbRetry(() => db
        .select({ id: materials.id })
        .from(materials)
        .where(and(eq(materials.salonId, session.salonId), inArray(materials.id, ids)))
      );
      if (owned.length !== ids.length) {
        return NextResponse.json({ error: "some materials not found" }, { status: 400 });
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(serviceVariantMaterials)
        .where(eq(serviceVariantMaterials.variantId, variantId));
      if (cleaned.length > 0) {
        await tx
          .insert(serviceVariantMaterials)
          .values(cleaned.map(i => ({
            salonId: session.salonId,
            variantId,
            materialId: i.materialId,
            quantity: i.quantity.toFixed(2),
          })));
      }
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Recipe PUT:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/partner/services/
git commit -m "feat(api): service variant recipe — GET + PUT (replace)"
```

---

## Task 6: Usage API — commit (FIFO) + journal + delete

**Files:**
- Create: `app/api/partner/appointments/[id]/usage/route.ts` (POST commit)
- Create: `app/api/partner/usage/route.ts` (GET journal)
- Create: `app/api/partner/usage/[id]/route.ts` (DELETE return)

- [ ] **Step 1: Smoke test plan**

```
POST /api/partner/appointments/<aid>/usage
     body: {items: [{materialId, quantity}, ...]}
     → for each item runs FIFO inside a transaction, inserts one usage row per item;
       returns {usages: [...], totalCost: kopecks, anyShortfall: boolean}
GET  /api/partner/usage?from=&to=&materialId=&appointmentId=
     → list joined with material + appointment, newest first
DELETE /api/partner/usage/<uid> → restores qty back into lots and removes the row.
```

- [ ] **Step 2: Verify failure / starting state**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/partner/usage`
Expected: 404.

- [ ] **Step 3: Create POST commit-usage endpoint**

Create [app/api/partner/appointments/[id]/usage/route.ts](../../../app/api/partner/appointments/%5Bid%5D/usage/route.ts):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { appointments, materials, appointmentMaterialUsage } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { consumeFifo } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const appointmentId = Number(idStr);
    if (!appointmentId) return NextResponse.json({ error: "bad id" }, { status: 400 });

    // Verify the appointment belongs to this salon
    const [appt] = await dbRetry(() => db
      .select({ id: appointments.id })
      .from(appointments)
      .where(and(eq(appointments.id, appointmentId), eq(appointments.salonId, session.salonId)))
    );
    if (!appt) return NextResponse.json({ error: "appointment not found" }, { status: 404 });

    const body = await req.json();
    const items: { materialId: number; quantity: number }[] = Array.isArray(body?.items) ? body.items : [];
    const cleaned = items
      .map(i => ({ materialId: Number(i.materialId), quantity: Number(i.quantity) }))
      .filter(i => Number.isFinite(i.materialId) && i.materialId > 0
                && Number.isFinite(i.quantity) && i.quantity > 0);

    if (cleaned.length === 0) return NextResponse.json({ usages: [], totalCost: 0, anyShortfall: false });

    // Verify every material belongs to this salon
    const ids = cleaned.map(i => i.materialId);
    const owned = await dbRetry(() => db
      .select({ id: materials.id })
      .from(materials)
      .where(and(eq(materials.salonId, session.salonId), inArray(materials.id, ids)))
    );
    if (owned.length !== ids.length) return NextResponse.json({ error: "unknown material" }, { status: 400 });

    const result = await db.transaction(async (tx) => {
      const usages = [];
      let totalCost = 0;
      let anyShortfall = false;
      for (const it of cleaned) {
        const fifo = await consumeFifo(tx, session.salonId, it.materialId, it.quantity);
        const [row] = await tx
          .insert(appointmentMaterialUsage)
          .values({
            salonId: session.salonId,
            appointmentId,
            materialId: it.materialId,
            quantity: it.quantity.toFixed(2),
            totalCost: fifo.totalCost,
            lotsConsumed: fifo.consumed,
            shortfall: fifo.shortfall.toFixed(2),
          })
          .returning();
        usages.push(row);
        totalCost += fifo.totalCost;
        if (fifo.shortfall > 0) anyShortfall = true;
      }
      return { usages, totalCost, anyShortfall };
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Usage POST:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create GET journal**

Create [app/api/partner/usage/route.ts](../../../app/api/partner/usage/route.ts):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db, dbRetry } from "@/db/index-postgres";
import { appointmentMaterialUsage, materials, appointments } from "@/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const sp = req.nextUrl.searchParams;
    const conds = [eq(appointmentMaterialUsage.salonId, session.salonId)];
    if (sp.get("appointmentId")) conds.push(eq(appointmentMaterialUsage.appointmentId, Number(sp.get("appointmentId"))));
    if (sp.get("materialId"))    conds.push(eq(appointmentMaterialUsage.materialId, Number(sp.get("materialId"))));
    if (sp.get("from")) conds.push(gte(appointments.appointmentDate, sp.get("from")!));
    if (sp.get("to"))   conds.push(lte(appointments.appointmentDate, sp.get("to")!));

    const rows = await dbRetry(() => db
      .select({
        id: appointmentMaterialUsage.id,
        appointmentId: appointmentMaterialUsage.appointmentId,
        materialId: appointmentMaterialUsage.materialId,
        materialName: materials.name,
        materialUnit: materials.unit,
        quantity: appointmentMaterialUsage.quantity,
        totalCost: appointmentMaterialUsage.totalCost,
        shortfall: appointmentMaterialUsage.shortfall,
        createdAt: appointmentMaterialUsage.createdAt,
        appointmentDate: appointments.appointmentDate,
        startTime: appointments.startTime,
        clientName: appointments.clientName,
      })
      .from(appointmentMaterialUsage)
      .innerJoin(materials, eq(materials.id, appointmentMaterialUsage.materialId))
      .innerJoin(appointments, eq(appointments.id, appointmentMaterialUsage.appointmentId))
      .where(and(...conds))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.startTime), desc(appointmentMaterialUsage.id))
      .limit(500)
    );
    return NextResponse.json(rows);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/relation .* does not exist/i.test(msg)) return NextResponse.json([]);
    console.error("Usage GET:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 5: Create DELETE return**

Create [app/api/partner/usage/[id]/route.ts](../../../app/api/partner/usage/%5Bid%5D/route.ts):

```ts
import { NextRequest, NextResponse } from "next/server";
import { requirePartnerSession } from "@/lib/requirePartnerSession";
import { db } from "@/db/index-postgres";
import { appointmentMaterialUsage } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { returnFifo, ConsumedLot } from "@/lib/inventory";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, response } = await requirePartnerSession();
  if (!session) return response;
  try {
    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

    await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(appointmentMaterialUsage)
        .where(and(eq(appointmentMaterialUsage.id, id), eq(appointmentMaterialUsage.salonId, session.salonId)));
      if (!row) throw new Error("not_found");
      const consumed = (row.lotsConsumed as unknown as ConsumedLot[]) || [];
      await returnFifo(tx, session.salonId, consumed);
      await tx
        .delete(appointmentMaterialUsage)
        .where(eq(appointmentMaterialUsage.id, id));
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "not_found") return NextResponse.json({ error: "not found" }, { status: 404 });
    console.error("Usage DELETE:", msg);
    return NextResponse.json({ error: "Failed", detail: msg }, { status: 500 });
  }
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/api/partner/usage app/api/partner/appointments
git commit -m "feat(api): usage commit (FIFO txn) + journal + delete-return"
```

---

## Task 7: Inventory page skeleton + sidebar nav

**Files:**
- Modify: `components/partner/PartnerShell.tsx`
- Create: `app/partner/inventory/page.tsx`
- Create: `app/partner/inventory/InventoryClient.tsx`
- Create: `app/partner/inventory/CatalogTab.tsx` (placeholder body)
- Create: `app/partner/inventory/ArrivalsTab.tsx` (placeholder body)
- Create: `app/partner/inventory/UsageTab.tsx` (placeholder body)

- [ ] **Step 1: Smoke test plan**

After this task: sidebar shows «Склад» between Услуги and Отзывы. Clicking lands on `/partner/inventory` with 3 segment tabs at top (Каталог / Поступления / Списания); each tab body is a placeholder card with the tab name. `npm run build` passes.

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Add sidebar item**

In [components/partner/PartnerShell.tsx](../../../components/partner/PartnerShell.tsx), find the `I` icon map and add a box icon:

```ts
// inside the `const I = { … }` block, after `card`:
box: "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12",
```

Then in the `mainNav` array, insert after the Услуги item:

```ts
{ href: "/partner/inventory", label: "Склад",  icon: "box"  },
```

(The Услуги item is `{ href: "/partner/services", label: "Услуги", icon: "bag" }` — put the new item right after it.)

- [ ] **Step 4: Create the server wrapper**

Create [app/partner/inventory/page.tsx](../../../app/partner/inventory/page.tsx):

```ts
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "partner" || !session.user.salonId) {
    redirect("/partner/join");
  }
  return <InventoryClient />;
}
```

- [ ] **Step 5: Create the tab switcher**

Create [app/partner/inventory/InventoryClient.tsx](../../../app/partner/inventory/InventoryClient.tsx):

```tsx
"use client";
import { useState } from "react";
import CatalogTab from "./CatalogTab";
import ArrivalsTab from "./ArrivalsTab";
import UsageTab from "./UsageTab";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primarySft: "#F0EDFE",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

type Tab = "catalog" | "arrivals" | "usage";
const TABS: { key: Tab; label: string }[] = [
  { key: "catalog",  label: "Каталог" },
  { key: "arrivals", label: "Поступления" },
  { key: "usage",    label: "Списания" },
];

export default function InventoryClient() {
  const [tab, setTab] = useState<Tab>("catalog");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: c.txtDark, margin: 0,
          letterSpacing: "-0.025em", fontFamily: "var(--font-montserrat)",
        }}>Склад</h1>
        <div style={{
          fontSize: 13, color: c.txtMute, marginTop: 4,
          fontFamily: "var(--font-montserrat)",
        }}>Материалы, поступления и списания</div>
      </div>

      <div style={{
        display: "inline-flex", padding: 4, gap: 4,
        background: c.bgSoft, border: `1px solid ${c.border}`, borderRadius: 12,
        alignSelf: "flex-start",
      }}>
        {TABS.map(t => {
          const sel = tab === t.key;
          return (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{
                padding: "8px 16px", borderRadius: 9,
                background: sel ? c.bg : "transparent",
                color: sel ? c.txtDark : c.txtBody,
                border: "none", cursor: "pointer",
                fontFamily: "var(--font-montserrat)",
                fontSize: 13, fontWeight: sel ? 700 : 600,
                boxShadow: sel ? "0 1px 3px rgba(22,22,32,0.08)" : "none",
                transition: "all 0.15s",
              }}>{t.label}</button>
          );
        })}
      </div>

      {tab === "catalog"  && <CatalogTab />}
      {tab === "arrivals" && <ArrivalsTab />}
      {tab === "usage"    && <UsageTab />}
    </div>
  );
}
```

- [ ] **Step 6: Create three placeholder tabs**

Create [app/partner/inventory/CatalogTab.tsx](../../../app/partner/inventory/CatalogTab.tsx):

```tsx
"use client";
export default function CatalogTab() {
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 16,
      padding: 32, textAlign: "center",
      fontFamily: "var(--font-montserrat)", color: "#9AA0B0",
    }}>Каталог — материалы появятся здесь</div>
  );
}
```

Create [app/partner/inventory/ArrivalsTab.tsx](../../../app/partner/inventory/ArrivalsTab.tsx):

```tsx
"use client";
export default function ArrivalsTab() {
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 16,
      padding: 32, textAlign: "center",
      fontFamily: "var(--font-montserrat)", color: "#9AA0B0",
    }}>Поступления — журнал партий появится здесь</div>
  );
}
```

Create [app/partner/inventory/UsageTab.tsx](../../../app/partner/inventory/UsageTab.tsx):

```tsx
"use client";
export default function UsageTab() {
  return (
    <div style={{
      background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 16,
      padding: 32, textAlign: "center",
      fontFamily: "var(--font-montserrat)", color: "#9AA0B0",
    }}>Списания — журнал расхода по записям появится здесь</div>
  );
}
```

- [ ] **Step 7: Build + manual smoke**

Run: `npm run build`
Expected: PASS, `/partner/inventory` listed in build output.

Manual: `npm run dev`, log into `/partner/login`, click «Склад» in the sidebar drawer → page loads with three tabs and a placeholder card per tab.

- [ ] **Step 8: Commit**

```bash
git add components/partner/PartnerShell.tsx app/partner/inventory/
git commit -m "feat(partner/inventory): sidebar nav + page skeleton with 3 tabs"
```

---

## Task 8: MaterialEditor modal + Catalog tab

**Files:**
- Create: `components/partner/MaterialEditor.tsx`
- Modify: `app/partner/inventory/CatalogTab.tsx`

- [ ] **Step 1: Smoke test plan**

Catalog tab shows list of materials (name + unit + currentStock + avgPrice + low-stock badge). `+ Новый материал` opens MaterialEditor → save → list refreshes with new row. Click a row to edit → patch → list updates. Delete → row disappears (soft-archive). Search filters list. Category filter pills (built from unique categories of loaded materials) narrow the list.

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Create MaterialEditor**

Create [components/partner/MaterialEditor.tsx](../../../components/partner/MaterialEditor.tsx):

```tsx
"use client";
import { useEffect, useState } from "react";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  red: "#EF4444", redSft: "#FCE5E5",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

const UNITS: { key: "g" | "ml" | "pcs" | "m"; label: string }[] = [
  { key: "g",   label: "грамм" },
  { key: "ml",  label: "мл" },
  { key: "pcs", label: "шт" },
  { key: "m",   label: "м" },
];

export interface MaterialData {
  id: number; name: string; unit: string;
  category: string | null; lowStockThreshold: string | null;
}

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial: MaterialData | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}

export default function MaterialEditor({ open, mode, initial, onClose, onSaved, onDeleted }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"g" | "ml" | "pcs" | "m">("g");
  const [category, setCategory] = useState("");
  const [threshold, setThreshold] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setUnit(((initial?.unit as "g" | "ml" | "pcs" | "m") ?? "g"));
    setCategory(initial?.category ?? "");
    setThreshold(initial?.lowStockThreshold ?? "");
    setError(""); setConfirmDelete(false); setSaving(false);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function save() {
    if (!name.trim()) { setError("Введите название"); return; }
    setSaving(true); setError("");
    try {
      const url = mode === "create"
        ? "/api/partner/materials"
        : `/api/partner/materials/${initial!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          unit,
          category: category.trim() || null,
          lowStockThreshold: threshold.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Не удалось сохранить");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 4000); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/partner/materials/${initial!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Не удалось удалить");
      }
      onDeleted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(22,22,32,0.50)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }} />
      <div
        role="dialog" aria-modal="true" aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 480, maxHeight: "92vh",
          zIndex: 110, display: "flex", flexDirection: "column",
          transform: open ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -46%) scale(0.96)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s, transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          background: c.bg, borderRadius: 24,
          boxShadow: "0 40px 100px rgba(22,22,32,0.32), 0 8px 24px rgba(22,22,32,0.10)",
          fontFamily: "var(--font-montserrat)", overflow: "hidden",
        }}>
        <div style={{
          padding: "16px 24px", borderBottom: `1px solid ${c.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.txtDark, letterSpacing: "-0.01em" }}>
            {mode === "create" ? "Новый материал" : "Изменить материал"}
          </h2>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 32, height: 32, borderRadius: 10,
            background: c.bgSoft, border: "none", cursor: "pointer",
            color: c.txtDark, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Название">
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="напр., Краска L'Oréal Majirel 7.0"
              style={inputStyle} />
          </Field>

          <Field label="Единица измерения">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {UNITS.map(u => {
                const sel = unit === u.key;
                const disabled = mode === "edit"; // unit change is forbidden by design
                return (
                  <button key={u.key} type="button"
                    disabled={disabled}
                    onClick={() => setUnit(u.key)}
                    style={{
                      padding: "8px 14px", borderRadius: 10,
                      background: sel ? c.primary : c.bg,
                      color: sel ? "#fff" : (disabled ? c.txtMute : c.txtDark),
                      border: `1px solid ${sel ? c.primary : c.border}`,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-montserrat)",
                      fontSize: 13, fontWeight: 700,
                      opacity: disabled && !sel ? 0.5 : 1,
                    }}
                    title={disabled ? "Единицу нельзя менять у существующего материала" : ""}
                  >{u.label}</button>
                );
              })}
            </div>
          </Field>

          <Field label="Категория (необязательно)">
            <input value={category} onChange={e => setCategory(e.target.value)}
              placeholder="напр., Краски / Окислители / Расходники"
              style={inputStyle} />
          </Field>

          <Field label="Низкий остаток (необязательно)" hint="Когда остаток ниже этой цифры — покажем бейдж «низкий».">
            <input value={threshold} onChange={e => setThreshold(e.target.value)}
              inputMode="decimal" placeholder="0"
              style={inputStyle} />
          </Field>

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              background: c.redSft, color: c.red,
              fontSize: 12, fontWeight: 600,
            }}>{error}</div>
          )}
        </div>

        <footer style={{
          padding: "12px 24px", borderTop: `1px solid ${c.border}`, background: c.bgSoft,
          display: "flex", gap: 8,
        }}>
          {mode === "edit" && onDeleted && (
            <button type="button" onClick={del} disabled={saving}
              style={{
                padding: "11px 14px", borderRadius: 11,
                background: confirmDelete ? c.red : c.bg,
                color: confirmDelete ? "#fff" : c.red,
                border: `1px solid ${confirmDelete ? c.red : c.border}`,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "var(--font-montserrat)",
              }}>{confirmDelete ? "Точно?" : "Удалить"}</button>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} disabled={saving}
            style={{
              padding: "11px 18px", borderRadius: 11,
              background: c.bg, color: c.txtBody, border: `1px solid ${c.border}`,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
            }}>Отмена</button>
          <button type="button" onClick={save} disabled={saving}
            style={{
              padding: "11px 18px", borderRadius: 11,
              background: c.primary, color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
              boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
            }}>{saving ? "Сохраняем..." : "Сохранить"}</button>
        </footer>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px",
  background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 11,
  fontFamily: "var(--font-montserrat)", fontSize: 14, color: "#161620",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 11, color: "#9AA0B0", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#9AA0B0" }}>{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Replace CatalogTab with a real list**

Overwrite [app/partner/inventory/CatalogTab.tsx](../../../app/partner/inventory/CatalogTab.tsx) with the real list:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import MaterialEditor, { MaterialData } from "@/components/partner/MaterialEditor";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  amber: "#F59E0B", amberSft: "#FEF3C7",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface MaterialRow {
  id: number; name: string; unit: string;
  category: string | null; lowStockThreshold: string | null;
  isActive: boolean; archivedAt: string | null;
  currentStock: number; totalValue: number; avgPrice: number | null;
}

function formatKopecksShort(k: number | null): string {
  if (k == null) return "—";
  if (k < 100_000) return `${(k / 100).toFixed(2).replace(/\.00$/, "")} ₽`;
  return `${Math.round(k / 100).toLocaleString("ru-RU")} ₽`;
}

export default function CatalogTab() {
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; mode: "create" | "edit"; data: MaterialData | null }>({
    open: false, mode: "create", data: null,
  });

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/partner/materials");
      const d = await r.json();
      if (Array.isArray(d)) setRows(d);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.category) s.add(r.category); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => !categoryFilter || r.category === categoryFilter)
      .filter(r => !q || r.name.toLowerCase().includes(q));
  }, [rows, categoryFilter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Найти материал..."
          style={{
            flex: 1, minWidth: 200, height: 44, padding: "0 14px",
            background: c.bg, border: `1px solid ${c.border}`, borderRadius: 11,
            fontFamily: "var(--font-montserrat)", fontSize: 14, color: c.txtDark, outline: "none",
          }} />
        <button type="button"
          onClick={() => setEditor({ open: true, mode: "create", data: null })}
          style={{
            padding: "11px 18px", borderRadius: 11,
            background: c.primary, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "var(--font-montserrat)",
            boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
            whiteSpace: "nowrap",
          }}>+ Новый материал</button>
      </div>

      {categories.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Chip sel={!categoryFilter} onClick={() => setCategoryFilter(null)}>Все</Chip>
          {categories.map(cat => (
            <Chip key={cat} sel={categoryFilter === cat} onClick={() => setCategoryFilter(cat)}>{cat}</Chip>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>
      ) : visible.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
          padding: "40px 24px", textAlign: "center",
          fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.txtDark, marginBottom: 4 }}>
            {rows.length === 0 ? "Каталог пуст" : "Ничего не найдено"}
          </div>
          <div style={{ fontSize: 12, color: c.txtMute }}>
            {rows.length === 0
              ? "Добавьте первый материал чтобы начать учёт"
              : "Попробуйте другой поиск или сбросьте фильтр"}
          </div>
        </div>
      ) : (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {visible.map((r, i) => {
            const low = r.lowStockThreshold != null && r.currentStock < Number(r.lowStockThreshold);
            return (
              <div key={r.id} style={{
                borderBottom: i < visible.length - 1 ? `1px solid ${c.borderSoft}` : "none",
              }}>
                <button type="button"
                  onClick={() => setEditor({ open: true, mode: "edit", data: r })}
                  style={{
                    width: "100%", textAlign: "left", border: "none",
                    background: c.bg, padding: "14px 16px", cursor: "pointer",
                    fontFamily: "var(--font-montserrat)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = c.bgSoft; }}
                  onMouseLeave={e => { e.currentTarget.style.background = c.bg; }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: c.primarySft, color: c.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 16, fontWeight: 800,
                  }}>📦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: 14, fontWeight: 800, color: c.txtDark,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{r.name}</span>
                      {r.category && (
                        <span style={{
                          padding: "2px 7px", borderRadius: 7,
                          background: c.bgSoft, color: c.txtBody,
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                        }}>{r.category}</span>
                      )}
                      {low && (
                        <span style={{
                          padding: "2px 7px", borderRadius: 7,
                          background: c.amberSft, color: c.amber,
                          fontSize: 10, fontWeight: 700, letterSpacing: "0.02em",
                        }}>низкий остаток</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: c.txtBody, marginTop: 2, fontFeatureSettings: '"tnum" 1' }}>
                      <b>{Number(r.currentStock).toFixed(0)} {r.unit}</b>
                      <span style={{ color: c.txtMute }}> · средняя {formatKopecksShort(r.avgPrice)}/{r.unit}</span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <MaterialEditor
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

function Chip({ sel, onClick, children }: { sel: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: "7px 13px", borderRadius: 18,
        background: sel ? "#7B61FF" : "#FFFFFF",
        color: sel ? "#fff" : "#5F6577",
        border: `1px solid ${sel ? "#7B61FF" : "#ECECF0"}`,
        cursor: "pointer", fontFamily: "var(--font-montserrat)",
        fontSize: 12, fontWeight: sel ? 700 : 600,
        transition: "all 0.15s",
      }}>{children}</button>
  );
}
```

- [ ] **Step 5: Build + manual smoke**

Run: `npm run build`
Expected: PASS.

Manual: load `/partner/inventory`, click «+ Новый материал», fill the form, save → row appears with stock 0 and «—» for avg. Click the row → edit → save name change → updates inline. Click «Удалить» twice → row disappears.

- [ ] **Step 6: Commit**

```bash
git add components/partner/MaterialEditor.tsx app/partner/inventory/CatalogTab.tsx
git commit -m "feat(partner/inventory): catalog tab + MaterialEditor modal"
```

---

## Task 9: ArrivalEditor modal + Arrivals tab

**Files:**
- Create: `components/partner/ArrivalEditor.tsx`
- Modify: `app/partner/inventory/ArrivalsTab.tsx`

- [ ] **Step 1: Smoke test plan**

Arrivals tab shows list of lots (material + supplier + qty + price + date). `+ Поступление` opens the editor (material select, qty, price-per-unit OR total-sum mode, supplier, date defaulted to today, note). On save: lot appears at top; the parent material's stock in Catalog grows by qty.

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Create ArrivalEditor**

Create [components/partner/ArrivalEditor.tsx](../../../components/partner/ArrivalEditor.tsx):

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primaryDk: "#5B3FE5", primarySft: "#F0EDFE",
  red: "#EF4444", redSft: "#FCE5E5",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface MaterialOption { id: number; name: string; unit: string; }

interface Props {
  open: boolean;
  materials: MaterialOption[];
  presetMaterialId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function ArrivalEditor({ open, materials, presetMaterialId, onClose, onSaved }: Props) {
  const [materialId, setMaterialId] = useState<number | null>(null);
  const [qty, setQty] = useState("");
  const [priceMode, setPriceMode] = useState<"per" | "total">("per");
  const [priceInput, setPriceInput] = useState(""); // rubles input from user
  const [supplier, setSupplier] = useState("");
  const [arrivedAt, setArrivedAt] = useState(todayIso());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setMaterialId(presetMaterialId ?? materials[0]?.id ?? null);
    setQty(""); setPriceMode("per"); setPriceInput("");
    setSupplier(""); setArrivedAt(todayIso()); setNote("");
    setSaving(false); setError("");
  }, [open, materials, presetMaterialId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedMaterial = useMemo(
    () => materials.find(m => m.id === materialId) || null,
    [materials, materialId],
  );

  // Convert user input rubles → kopecks per unit
  const qtyNum = Number(qty);
  const priceNum = Number(priceInput);
  const pricePerUnitKopecks = (() => {
    if (!Number.isFinite(priceNum) || priceNum <= 0) return 0;
    if (priceMode === "per")   return Math.round(priceNum * 100);
    if (priceMode === "total") {
      if (!Number.isFinite(qtyNum) || qtyNum <= 0) return 0;
      return Math.round((priceNum * 100) / qtyNum);
    }
    return 0;
  })();

  async function save() {
    if (!materialId)        { setError("Выберите материал"); return; }
    if (!(qtyNum > 0))      { setError("Количество должно быть больше 0"); return; }
    if (!(pricePerUnitKopecks >= 0)) { setError("Цена не задана"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/partner/material-lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId, qty: qtyNum, pricePerUnit: pricePerUnitKopecks,
          arrivedAt, supplier: supplier.trim() || null, note: note.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Не удалось сохранить");
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} aria-hidden style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(22,22,32,0.50)", backdropFilter: "blur(8px)",
        opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
        transition: "opacity 0.25s",
      }} />
      <div role="dialog" aria-modal="true" aria-hidden={!open}
        style={{
          position: "fixed", top: "50%", left: "50%",
          width: "94vw", maxWidth: 480, maxHeight: "92vh", zIndex: 110,
          display: "flex", flexDirection: "column",
          transform: open ? "translate(-50%, -50%) scale(1)" : "translate(-50%, -46%) scale(0.96)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s, transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
          background: c.bg, borderRadius: 24,
          boxShadow: "0 40px 100px rgba(22,22,32,0.32), 0 8px 24px rgba(22,22,32,0.10)",
          fontFamily: "var(--font-montserrat)", overflow: "hidden",
        }}>
        <div style={{
          padding: "16px 24px", borderBottom: `1px solid ${c.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: c.txtDark }}>Новое поступление</h2>
          <button onClick={onClose} aria-label="Закрыть" style={{
            width: 32, height: 32, borderRadius: 10, background: c.bgSoft, border: "none",
            cursor: "pointer", color: c.txtDark, display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Материал">
            <select value={materialId ?? ""}
              onChange={e => setMaterialId(Number(e.target.value))}
              style={inputStyle}>
              {materials.length === 0 && <option value="">— Сначала создайте материал —</option>}
              {materials.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
              ))}
            </select>
          </Field>

          <Field label={`Количество${selectedMaterial ? ` (${selectedMaterial.unit})` : ""}`}>
            <input value={qty} onChange={e => setQty(e.target.value)}
              inputMode="decimal" placeholder="0"
              style={inputStyle} />
          </Field>

          <Field label="Цена в рублях">
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {([
                { key: "per" as const,   label: `за ед.` },
                { key: "total" as const, label: "общая сумма" },
              ]).map(o => {
                const sel = priceMode === o.key;
                return (
                  <button key={o.key} type="button" onClick={() => setPriceMode(o.key)}
                    style={{
                      padding: "6px 12px", borderRadius: 8,
                      background: sel ? c.txtDark : "transparent",
                      color: sel ? "#fff" : c.txtBody,
                      border: `1px solid ${sel ? c.txtDark : c.border}`,
                      cursor: "pointer", fontSize: 12, fontWeight: 600,
                      fontFamily: "var(--font-montserrat)",
                    }}>{o.label}</button>
                );
              })}
            </div>
            <input value={priceInput} onChange={e => setPriceInput(e.target.value)}
              inputMode="decimal" placeholder="0.00"
              style={inputStyle} />
            {pricePerUnitKopecks > 0 && (
              <div style={{ fontSize: 11, color: c.txtMute, marginTop: 6 }}>
                {priceMode === "per"
                  ? `Итого: ${((pricePerUnitKopecks * qtyNum) / 100).toFixed(2)} ₽`
                  : `За единицу: ${(pricePerUnitKopecks / 100).toFixed(2)} ₽`}
              </div>
            )}
          </Field>

          <Field label="Поставщик (необязательно)">
            <input value={supplier} onChange={e => setSupplier(e.target.value)}
              placeholder="напр., КраскаОпт"
              style={inputStyle} />
          </Field>

          <Field label="Дата поступления">
            <input type="date" value={arrivedAt}
              onChange={e => setArrivedAt(e.target.value)}
              style={inputStyle} />
          </Field>

          <Field label="Заметка (необязательно)">
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2} placeholder="напр., акция -10%"
              style={{ ...inputStyle, height: "auto", minHeight: 60, padding: "10px 14px", resize: "vertical" }} />
          </Field>

          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              background: c.redSft, color: c.red,
              fontSize: 12, fontWeight: 600,
            }}>{error}</div>
          )}
        </div>

        <footer style={{
          padding: "12px 24px", borderTop: `1px solid ${c.border}`, background: c.bgSoft,
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <button type="button" onClick={onClose} disabled={saving}
            style={{
              padding: "11px 18px", borderRadius: 11,
              background: c.bg, color: c.txtBody, border: `1px solid ${c.border}`,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "var(--font-montserrat)",
            }}>Отмена</button>
          <button type="button" onClick={save} disabled={saving || materials.length === 0}
            style={{
              padding: "11px 22px", borderRadius: 11,
              background: c.primary, color: "#fff", border: "none",
              fontSize: 13, fontWeight: 700,
              cursor: (saving || materials.length === 0) ? "not-allowed" : "pointer",
              fontFamily: "var(--font-montserrat)",
              boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
              opacity: materials.length === 0 ? 0.5 : 1,
            }}>{saving ? "Сохраняем..." : "Принять поступление"}</button>
        </footer>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 14px",
  background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 11,
  fontFamily: "var(--font-montserrat)", fontSize: 14, color: "#161620",
  outline: "none", boxSizing: "border-box",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{
        fontSize: 11, color: "#9AA0B0", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{label}</label>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Replace ArrivalsTab with the real list**

Overwrite [app/partner/inventory/ArrivalsTab.tsx](../../../app/partner/inventory/ArrivalsTab.tsx):

```tsx
"use client";
import { useEffect, useState } from "react";
import ArrivalEditor from "@/components/partner/ArrivalEditor";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  primary: "#7B61FF", primarySft: "#F0EDFE",
  green: "#1FB46A",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface Lot {
  id: number; materialId: number; materialName: string; materialUnit: string;
  qtyInitial: string; qtyRemaining: string; pricePerUnit: number;
  supplier: string | null; arrivedAt: string; note: string | null;
}
interface MaterialOption { id: number; name: string; unit: string; }

const MONTHS = ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"];

function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m-1]}`;
}

export default function ArrivalsTab() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [lr, mr] = await Promise.all([
        fetch("/api/partner/material-lots").then(r => r.json()),
        fetch("/api/partner/materials").then(r => r.json()),
      ]);
      if (Array.isArray(lr)) setLots(lr);
      if (Array.isArray(mr)) setMaterials(mr.map((m: { id: number; name: string; unit: string }) => ({ id: m.id, name: m.name, unit: m.unit })));
    } finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setEditorOpen(true)}
          disabled={materials.length === 0}
          title={materials.length === 0 ? "Сначала создайте материал в Каталоге" : ""}
          style={{
            padding: "11px 18px", borderRadius: 11,
            background: c.primary, color: "#fff", border: "none",
            fontSize: 13, fontWeight: 700,
            cursor: materials.length === 0 ? "not-allowed" : "pointer",
            fontFamily: "var(--font-montserrat)",
            boxShadow: "0 6px 18px -4px rgba(123,97,255,0.45)",
            opacity: materials.length === 0 ? 0.5 : 1,
          }}>+ Поступление</button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>
      ) : lots.length === 0 ? (
        <div style={{
          background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
          padding: "40px 24px", textAlign: "center",
          fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>↑</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.txtDark, marginBottom: 4 }}>
            Поступлений пока нет
          </div>
          <div style={{ fontSize: 12, color: c.txtMute }}>
            Первый приход материалов появится здесь
          </div>
        </div>
      ) : (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {lots.map((l, i) => (
            <div key={l.id} style={{
              borderBottom: i < lots.length - 1 ? `1px solid ${c.borderSoft}` : "none",
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
              fontFamily: "var(--font-montserrat)",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: "#E3F8EE", color: c.green,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, fontSize: 20, fontWeight: 800,
              }}>↑</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 800, color: c.txtDark,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{l.materialName}</div>
                <div style={{ fontSize: 12, color: c.txtBody, marginTop: 2, fontFeatureSettings: '"tnum" 1' }}>
                  +{Number(l.qtyInitial).toFixed(0)} {l.materialUnit}
                  <span style={{ color: c.txtMute }}> · осталось {Number(l.qtyRemaining).toFixed(0)}</span>
                  {l.supplier && <span style={{ color: c.txtMute }}> · {l.supplier}</span>}
                </div>
              </div>
              <div style={{
                flexShrink: 0, textAlign: "right",
                fontSize: 12, color: c.txtBody, fontFeatureSettings: '"tnum" 1',
              }}>
                <div style={{ fontWeight: 700, color: c.txtDark }}>
                  {(Math.round((l.pricePerUnit * Number(l.qtyInitial)) / 100)).toLocaleString("ru-RU")} ₽
                </div>
                <div style={{ color: c.txtMute, marginTop: 2 }}>{formatDateShort(l.arrivedAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ArrivalEditor
        open={editorOpen}
        materials={materials}
        onClose={() => setEditorOpen(false)}
        onSaved={loadAll}
      />
    </div>
  );
}
```

- [ ] **Step 5: Build + manual smoke**

Run: `npm run build`
Expected: PASS.

Manual: create material in Catalog → switch to Arrivals → `+ Поступление` → pick material, qty 250, price 8 ₽ per unit, date today → save → row appears, `currentStock` of that material in Catalog grows by 250.

- [ ] **Step 6: Commit**

```bash
git add components/partner/ArrivalEditor.tsx app/partner/inventory/ArrivalsTab.tsx
git commit -m "feat(partner/inventory): arrivals tab + ArrivalEditor (rubles ↔ kopecks)"
```

---

## Task 10: Usage tab (read-only journal)

**Files:**
- Modify: `app/partner/inventory/UsageTab.tsx`

- [ ] **Step 1: Smoke test plan**

Lists every usage row grouped by `appointmentDate`. Day headers shown sticky in the list container. Each row: client + service time + material + qty + total cost. Empty state when nothing.

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Overwrite UsageTab**

Overwrite [app/partner/inventory/UsageTab.tsx](../../../app/partner/inventory/UsageTab.tsx):

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";

const c = {
  bg: "#FFFFFF", bgSoft: "#F7F7FA", border: "#ECECF0", borderSoft: "#F2F2F6",
  red: "#EF4444", redSft: "#FCE5E5",
  amber: "#F59E0B", amberSft: "#FEF3C7",
  txtDark: "#161620", txtBody: "#5F6577", txtMute: "#9AA0B0",
};

interface UsageRow {
  id: number; appointmentId: number;
  materialId: number; materialName: string; materialUnit: string;
  quantity: string; totalCost: number; shortfall: string;
  appointmentDate: string; startTime: string; clientName: string;
}

const MONTHS = ["января","февраля","марта","апреля","мая","июня","июля","августа","сентября","октября","ноября","декабря"];
const WD = ["воскресенье","понедельник","вторник","среда","четверг","пятница","суббота"];

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatDateLong(iso: string): string {
  const d = parseIso(iso);
  return `${WD[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function UsageTab() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/partner/usage")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setRows(d); })
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, UsageRow[]>();
    rows.forEach(r => {
      const arr = m.get(r.appointmentDate) || [];
      arr.push(r);
      m.set(r.appointmentDate, arr);
    });
    return Array.from(m.entries());
  }, [rows]);

  if (loading) {
    return <div style={{ textAlign: "center", padding: 30, color: c.txtMute, fontSize: 13 }}>Загрузка...</div>;
  }
  if (rows.length === 0) {
    return (
      <div style={{
        background: c.bg, border: `1px dashed ${c.border}`, borderRadius: 16,
        padding: "40px 24px", textAlign: "center",
        fontFamily: "var(--font-montserrat)",
      }}>
        <div style={{ fontSize: 38, marginBottom: 8 }}>↓</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: c.txtDark, marginBottom: 4 }}>
          Списаний пока нет
        </div>
        <div style={{ fontSize: 12, color: c.txtMute }}>
          После завершения первой записи материалы спишутся автоматически по рецепту
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {groups.map(([date, items]) => (
        <div key={date} style={{
          background: c.bg, border: `1px solid ${c.border}`, borderRadius: 16,
          overflow: "hidden", fontFamily: "var(--font-montserrat)",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${c.borderSoft}`, background: c.bgSoft,
            fontSize: 12, fontWeight: 700, color: c.txtBody,
            letterSpacing: "0.04em", textTransform: "uppercase",
          }}>{formatDateLong(date)}</div>
          {items.map((u, i) => {
            const short = Number(u.shortfall) > 0;
            return (
              <div key={u.id} style={{
                padding: "12px 16px",
                borderBottom: i < items.length - 1 ? `1px solid ${c.borderSoft}` : "none",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: short ? c.amberSft : c.bgSoft,
                  color: short ? c.amber : c.txtMute,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 18, fontWeight: 800,
                }}>{short ? "⚠" : "↓"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: c.txtDark,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {u.materialName}
                    <span style={{ color: c.txtBody, fontWeight: 600 }}>
                      {" "}— {Number(u.quantity).toFixed(0)} {u.materialUnit}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 11, color: c.txtMute, marginTop: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    fontFeatureSettings: '"tnum" 1',
                  }}>
                    {u.startTime} · {u.clientName}
                    {short && <span style={{ color: c.amber, marginLeft: 6 }}>· не хватило {Number(u.shortfall).toFixed(0)} {u.materialUnit}</span>}
                  </div>
                </div>
                <div style={{
                  flexShrink: 0, fontSize: 13, fontWeight: 700, color: c.red,
                  fontFeatureSettings: '"tnum" 1', whiteSpace: "nowrap",
                }}>
                  −{Math.round(u.totalCost / 100).toLocaleString("ru-RU")} ₽
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Build + manual smoke**

Run: `npm run build`
Expected: PASS.

Manual: Until Task 12 wires usage commits, the tab will be empty (correct). After Task 12 you can complete an appointment with usage → row appears here grouped by day.

- [ ] **Step 5: Commit**

```bash
git add app/partner/inventory/UsageTab.tsx
git commit -m "feat(partner/inventory): usage tab — journal grouped by day"
```

---

## Task 11: Recipe section inside ServiceEditor

**Files:**
- Modify: `components/partner/ServiceEditor.tsx`

- [ ] **Step 1: Smoke test plan**

Inside the editor of a service, **under each variant** there is a «Расход материалов» block: rows of (material select + quantity input + unit + ✕). `+ Добавить материал` adds a row. Save sends `PUT /api/partner/services/<sid>/variants/<vid>/materials` per variant. After save the recipe persists. If the service has no variants, show «Создайте вариант услуги, чтобы настроить расход».

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Inspect ServiceEditor structure**

Open [components/partner/ServiceEditor.tsx](../../../components/partner/ServiceEditor.tsx) and locate the variant rendering. Variants are an array in component state; each variant is rendered with name / price / duration / order inputs and a remove button. The recipe block is added INSIDE that variant card, between the existing fields and the remove button.

- [ ] **Step 4: Add state for the recipe**

Near the top of the component (after existing `useState` calls), add a new state map keyed by variant id (existing variant) or by index (for unsaved new variants):

```ts
// Map<variantId, { materialId: number; quantity: string }[]>
const [recipes, setRecipes] = useState<Record<number, { materialId: number; quantity: string }[]>>({});
const [materials, setMaterials] = useState<{ id: number; name: string; unit: string }[]>([]);
```

In `useEffect` that runs when the editor opens (already present for loading variants), add a sibling effect to load materials and per-variant recipes:

```ts
// After initial load of variants:
useEffect(() => {
  if (!open) return;
  fetch("/api/partner/materials")
    .then(r => r.json())
    .then(d => { if (Array.isArray(d)) setMaterials(d.map(m => ({ id: m.id, name: m.name, unit: m.unit }))); })
    .catch(() => {});
}, [open]);

// Load recipes for existing variants when service is in edit mode:
useEffect(() => {
  if (!open || mode !== "edit" || !initial?.id) return;
  const variantIds = (variants ?? []).map(v => v.id).filter((id): id is number => typeof id === "number");
  Promise.all(variantIds.map(vid =>
    fetch(`/api/partner/services/${initial.id}/variants/${vid}/materials`)
      .then(r => r.ok ? r.json() : [])
      .then((arr: { materialId: number; quantity: string }[]) =>
        [vid, arr.map(x => ({ materialId: x.materialId, quantity: String(x.quantity) }))] as const)
      .catch(() => [vid, []] as const)
  )).then(pairs => {
    const next: Record<number, { materialId: number; quantity: string }[]> = {};
    pairs.forEach(([vid, items]) => { next[vid] = items; });
    setRecipes(next);
  });
}, [open, mode, initial?.id, variants]);
```

(Adjust variable names — `variants`, `initial` — to whatever the existing component uses. If variants are tracked by `temporary index` for unsaved ones, key the recipe map by a `_clientKey` you assign at variant creation time.)

- [ ] **Step 5: Render the recipe block per variant**

Inside the variant card render, after the price/duration fields and before the variant remove button:

```tsx
{variant.id != null && (
  <div style={{
    marginTop: 10, padding: "10px 12px",
    background: "#F7F7FA", borderRadius: 10,
    fontFamily: "var(--font-montserrat)",
  }}>
    <div style={{
      fontSize: 10, color: "#9AA0B0", fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8,
    }}>Расход материалов</div>

    {(recipes[variant.id] ?? []).map((r, idx) => {
      const mat = materials.find(m => m.id === r.materialId);
      return (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <select value={r.materialId}
            onChange={e => {
              const v = Number(e.target.value);
              setRecipes(prev => {
                const arr = [...(prev[variant.id!] ?? [])];
                arr[idx] = { ...arr[idx], materialId: v };
                return { ...prev, [variant.id!]: arr };
              });
            }}
            style={recipeInputStyle}>
            {materials.length === 0 && <option value="">— нет материалов —</option>}
            {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input value={r.quantity}
            onChange={e => {
              const q = e.target.value;
              setRecipes(prev => {
                const arr = [...(prev[variant.id!] ?? [])];
                arr[idx] = { ...arr[idx], quantity: q };
                return { ...prev, [variant.id!]: arr };
              });
            }}
            inputMode="decimal" placeholder="0"
            style={{ ...recipeInputStyle, width: 80, flexShrink: 0 }} />
          <div style={{
            display: "flex", alignItems: "center", padding: "0 8px",
            fontSize: 12, color: "#5F6577", fontWeight: 600,
            minWidth: 28,
          }}>{mat?.unit ?? ""}</div>
          <button type="button"
            onClick={() => {
              setRecipes(prev => {
                const arr = (prev[variant.id!] ?? []).filter((_, i) => i !== idx);
                return { ...prev, [variant.id!]: arr };
              });
            }}
            style={{
              width: 32, height: 36, borderRadius: 8,
              background: "#FFFFFF", border: "1px solid #ECECF0",
              cursor: "pointer", color: "#EF4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }} aria-label="Удалить материал">×</button>
        </div>
      );
    })}

    <button type="button"
      disabled={materials.length === 0}
      onClick={() => {
        const firstId = materials[0]?.id;
        if (!firstId) return;
        setRecipes(prev => {
          const arr = [...(prev[variant.id!] ?? []), { materialId: firstId, quantity: "" }];
          return { ...prev, [variant.id!]: arr };
        });
      }}
      style={{
        marginTop: 4,
        background: "transparent", border: "1px dashed #ECECF0",
        padding: "8px 12px", borderRadius: 9,
        color: "#7B61FF", fontSize: 12, fontWeight: 700,
        cursor: materials.length === 0 ? "not-allowed" : "pointer",
        fontFamily: "var(--font-montserrat)",
        opacity: materials.length === 0 ? 0.5 : 1,
      }}>+ Добавить материал</button>
  </div>
)}

{variant.id == null && (
  <div style={{
    marginTop: 10, padding: "10px 12px",
    background: "#FEF3C7", borderRadius: 10,
    fontSize: 11, color: "#92400E",
    fontFamily: "var(--font-montserrat)",
  }}>Сохраните вариант, чтобы добавить рецепт материалов.</div>
)}
```

Add the helper at the bottom of the file (if not already present):

```ts
const recipeInputStyle: React.CSSProperties = {
  flex: 1, height: 36, padding: "0 10px",
  background: "#FFFFFF", border: "1px solid #ECECF0", borderRadius: 8,
  fontFamily: "var(--font-montserrat)", fontSize: 13, color: "#161620",
  outline: "none", boxSizing: "border-box",
};
```

- [ ] **Step 6: Push recipes on save**

In the existing save handler, **after** the existing PATCH/POST that saves the service+variants succeeds and you have the saved variant IDs, send one PUT per variant:

```ts
// After service/variant save succeeds and you know saved variant IDs:
const savedVariants: { id: number }[] = /* result from save */;
await Promise.all(savedVariants.map(async v => {
  const items = (recipes[v.id] ?? [])
    .filter(r => r.materialId > 0 && Number(r.quantity) > 0)
    .map(r => ({ materialId: r.materialId, quantity: Number(r.quantity) }));
  const res = await fetch(`/api/partner/services/${initial!.id ?? savedServiceId}/variants/${v.id}/materials`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error("Не удалось сохранить рецепт");
}));
```

(Replace `savedServiceId` with whatever variable holds the service id in the existing save flow.)

- [ ] **Step 7: Build + manual smoke**

Run: `npm run build`
Expected: PASS.

Manual: open a service that already has a variant → recipe block appears empty → `+ Добавить материал` → pick material from Catalog → enter qty (e.g. 60) → Save → re-open editor → recipe is loaded back.

- [ ] **Step 8: Commit**

```bash
git add components/partner/ServiceEditor.tsx
git commit -m "feat(services): per-variant materials recipe in ServiceEditor"
```

---

## Task 12: Completion sub-view inside AppointmentDetailModal

**Files:**
- Modify: `components/partner/AppointmentDetailModal.tsx`

- [ ] **Step 1: Smoke test plan**

In the appointment modal, when the appointment is active (pending/confirmed) and its date is **today or in the past**, a new green button «Завершить» appears in the details footer between Перенести and Закрыть. Clicking opens a sub-view (like Reschedule) titled «Завершение записи · списание материалов». The body shows the usage editor: rows of (material + quantity + ✕), prefilled from the variant recipe; a `+ Добавить материал` button; the bottom button reads «Завершить и списать» when there are items, «Завершить без списания» when the list is empty. On confirm: `PATCH /api/appointments/<id>` with `status: completed` + `POST /api/partner/appointments/<id>/usage` with items. After success: refresh parent + close modal. If shortfall on any row, show a yellow banner before closing.

- [ ] **Step 2: Verify starting state**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Add view state + data**

Near the existing `view` state (`"details" | "reschedule"`), extend the union and add new state:

```ts
const [view, setView] = useState<"details" | "reschedule" | "complete">("details");

interface UsageItem { materialId: number; quantity: string; }
const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
const [usageMaterials, setUsageMaterials] = useState<{ id: number; name: string; unit: string }[]>([]);
const [completing, setCompleting] = useState(false);
const [completeError, setCompleteError] = useState("");
const [shortfallBanner, setShortfallBanner] = useState<string | null>(null);
```

When the modal opens, also clear these in the existing «reset on open» effect:

```ts
setView("details");
setUsageItems([]);
setUsageMaterials([]);
setCompleting(false);
setCompleteError("");
setShortfallBanner(null);
```

- [ ] **Step 4: Load recipe + materials on entering complete view**

```ts
useEffect(() => {
  if (view !== "complete" || !appointment) return;
  setCompleteError("");
  fetch("/api/partner/materials")
    .then(r => r.json())
    .then(d => { if (Array.isArray(d)) setUsageMaterials(d.map((m: { id: number; name: string; unit: string }) => ({ id: m.id, name: m.name, unit: m.unit }))); })
    .catch(() => {});
  if (service && service.id) {
    // We need variantId — taken from appointment
    const variantId = appointment.variantId;
    const serviceId = service.id;
    if (variantId) {
      fetch(`/api/partner/services/${serviceId}/variants/${variantId}/materials`)
        .then(r => r.ok ? r.json() : [])
        .then((arr: { materialId: number; quantity: string }[]) =>
          setUsageItems(arr.map(x => ({ materialId: x.materialId, quantity: String(x.quantity) }))))
        .catch(() => setUsageItems([]));
    } else {
      setUsageItems([]);
    }
  } else {
    setUsageItems([]);
  }
}, [view, appointment, service]);
```

- [ ] **Step 5: Add «Завершить» button to details footer**

In the existing footer for `view === "details"`, between the cancel/reschedule pair and the Закрыть button, add another icon-only square (or labeled button — use a small green check):

```tsx
{isActive && isTodayOrPast && (
  <button type="button"
    onClick={() => setView("complete")}
    aria-label="Завершить запись и списать материалы"
    title="Завершить и списать материалы"
    style={{
      flexShrink: 0, width: 52, height: 44,
      background: "#E3F8EE",
      border: "1px solid transparent", borderRadius: 11,
      color: "#0F8A4A", cursor: "pointer",
      fontFamily: "var(--font-montserrat)",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      transition: "background 0.18s",
    }}>
    <Ic d={I.check} size={16} />
  </button>
)}
```

Compute `isTodayOrPast` in the render body:

```ts
const isTodayOrPast = (() => {
  if (!appointment) return false;
  const d = new Date();
  const todayIso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return appointment.appointmentDate <= todayIso;
})();
```

- [ ] **Step 6: Render the complete sub-view + footer**

In the body swap section (alongside the existing `view === "reschedule"` branch), add the `view === "complete"` branch:

```tsx
) : view === "complete" ? (
  <div style={{
    flex: 1, overflowY: "auto", padding: "20px 24px 24px",
    display: "flex", flexDirection: "column", gap: 16,
    fontFamily: "var(--font-montserrat)",
  }}>
    <div style={{
      fontSize: 11, color: c.txtMute, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>Списать материалы</div>

    {usageItems.length === 0 ? (
      <div style={{
        padding: "24px 16px", background: c.bgSoft, borderRadius: 12,
        textAlign: "center", color: c.txtMute, fontSize: 13, lineHeight: 1.5,
      }}>
        Рецепт для этого варианта услуги не задан.<br/>
        Можно добавить материалы вручную или завершить без списания.
      </div>
    ) : (
      <div style={{ fontSize: 11, color: c.txtMute, textAlign: "right" }}>из рецепта · можно править</div>
    )}

    {usageItems.map((u, idx) => {
      const mat = usageMaterials.find(m => m.id === u.materialId);
      return (
        <div key={idx} style={{ display: "flex", gap: 6 }}>
          <select value={u.materialId}
            onChange={e => {
              const v = Number(e.target.value);
              setUsageItems(prev => prev.map((x, i) => i === idx ? { ...x, materialId: v } : x));
            }}
            style={{
              flex: 1, height: 40, padding: "0 10px",
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
              fontFamily: "var(--font-montserrat)", fontSize: 13, color: c.txtDark, outline: "none",
            }}>
            {usageMaterials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <input value={u.quantity}
            onChange={e => {
              const q = e.target.value;
              setUsageItems(prev => prev.map((x, i) => i === idx ? { ...x, quantity: q } : x));
            }}
            inputMode="decimal" placeholder="0"
            style={{
              width: 80, height: 40, padding: "0 10px",
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
              fontFamily: "var(--font-montserrat)", fontSize: 13, color: c.txtDark, outline: "none",
            }} />
          <div style={{
            display: "flex", alignItems: "center", padding: "0 8px",
            fontSize: 12, color: c.txtBody, fontWeight: 600, minWidth: 28,
          }}>{mat?.unit ?? ""}</div>
          <button type="button"
            onClick={() => setUsageItems(prev => prev.filter((_, i) => i !== idx))}
            style={{
              width: 36, height: 40, borderRadius: 9,
              background: c.bg, border: `1px solid ${c.border}`,
              color: c.red, cursor: "pointer", flexShrink: 0,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }} aria-label="Удалить">×</button>
        </div>
      );
    })}

    <button type="button"
      disabled={usageMaterials.length === 0}
      onClick={() => {
        const firstId = usageMaterials[0]?.id;
        if (!firstId) return;
        setUsageItems(prev => [...prev, { materialId: firstId, quantity: "" }]);
      }}
      style={{
        alignSelf: "flex-start",
        background: "transparent", border: `1px dashed ${c.border}`,
        padding: "8px 12px", borderRadius: 9,
        color: c.primary, fontSize: 12, fontWeight: 700,
        cursor: usageMaterials.length === 0 ? "not-allowed" : "pointer",
        opacity: usageMaterials.length === 0 ? 0.5 : 1,
        fontFamily: "var(--font-montserrat)",
      }}>+ Добавить материал</button>

    {shortfallBanner && (
      <div style={{
        padding: "10px 12px", borderRadius: 10,
        background: "#FEF3C7", color: "#92400E",
        fontSize: 12, fontWeight: 600,
      }}>{shortfallBanner}</div>
    )}

    {completeError && (
      <div style={{
        padding: "10px 12px", borderRadius: 10,
        background: c.redSft, color: c.red,
        fontSize: 12, fontWeight: 600,
      }}>{completeError}</div>
    )}
  </div>
) : (
```

(Wrap so the existing `view === "details"` branch stays as the final `else`.)

- [ ] **Step 7: Add footer for complete sub-view**

In the footer where the reschedule footer branch lives, add a sibling for `view === "complete"`:

```tsx
) : view === "complete" ? (
  <>
    <button type="button"
      onClick={() => { setView("details"); setCompleteError(""); setShortfallBanner(null); }}
      disabled={completing}
      aria-label="Назад"
      style={{
        flexShrink: 0, width: 52, height: 44,
        background: c.bg, border: `1px solid ${c.border}`,
        borderRadius: 11, color: c.txtBody,
        cursor: completing ? "not-allowed" : "pointer",
        fontFamily: "var(--font-montserrat)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
      }}>
      <Ic d={I.arrowL} size={16} />
    </button>
    <button type="button"
      onClick={handleComplete}
      disabled={completing}
      style={{
        flex: 1, height: 44,
        background: c.green, border: "none",
        borderRadius: 11, color: "#fff",
        fontSize: 13, fontWeight: 700,
        cursor: completing ? "not-allowed" : "pointer",
        fontFamily: "var(--font-montserrat)",
        boxShadow: "0 6px 18px -4px rgba(31, 180, 106, 0.45)",
      }}>
      {completing
        ? "Завершаем..."
        : usageItems.length === 0
          ? "Завершить без списания"
          : "Завершить и списать"}
    </button>
  </>
) : (
```

The colour `c.green` should be `"#1FB46A"` — add it to the local `c` palette if not already present.

- [ ] **Step 8: Add handleComplete**

Near `handleReschedule`:

```ts
async function handleComplete() {
  if (!appointment) return;
  setCompleting(true);
  setCompleteError("");
  setShortfallBanner(null);
  try {
    // 1. flip status to completed
    const patchRes = await fetch(`/api/appointments/${appointment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    // Some statuses (cancelled flow) use the same endpoint;
    // a completed-status path may not exist — if PATCH fails, surface it.
    if (!patchRes.ok) {
      const j = await patchRes.json().catch(() => ({}));
      throw new Error(j.error || "Не удалось завершить запись");
    }

    // 2. commit usage (if any)
    if (usageItems.length > 0) {
      const items = usageItems
        .map(u => ({ materialId: Number(u.materialId), quantity: Number(u.quantity) }))
        .filter(u => u.materialId > 0 && u.quantity > 0);
      if (items.length > 0) {
        const usageRes = await fetch(`/api/partner/appointments/${appointment.id}/usage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await usageRes.json();
        if (!usageRes.ok) throw new Error(data?.error || "Не удалось списать материалы");
        if (data?.anyShortfall) {
          setShortfallBanner("Часть материалов списана не полностью — внесите фактический приход.");
          // Pause 2 seconds so user can see the banner before close.
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    onChanged?.();
    onClose();
  } catch (e) {
    setCompleteError(e instanceof Error ? e.message : String(e));
  } finally {
    setCompleting(false);
  }
}
```

- [ ] **Step 9: Verify PATCH /api/appointments/[id] accepts status=completed**

Open [app/api/appointments/[id]/route.ts](../../../app/api/appointments/%5Bid%5D/route.ts). The existing PATCH has a special branch for `status === "cancelled"` and otherwise requires `masterId/appointmentDate/startTime`. Add a sibling branch BEFORE the reschedule validation for `status === "completed"`:

```ts
if (status === "completed") {
  const [updated] = await db
    .update(appointments)
    .set({ status: "completed" })
    .where(eq(appointments.id, idNum))
    .returning();
  if (!updated) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  return NextResponse.json({ appointment: updated });
}
```

Place it directly after the closing brace of the `if (status === "cancelled") { … }` block.

- [ ] **Step 10: Build + manual smoke**

Run: `npm run build`
Expected: PASS.

Manual: with one material in catalog, one lot of 100 g at 8 ₽/g, a service variant whose recipe is 50 g — open today's appointment of that variant → click «Завершить» (green check) → recipe shows 50 g → «Завершить и списать» → modal closes, parent list refreshes → in /partner/inventory/usage you see a new row «−400 ₽», and catalog shows currentStock 50 g.

- [ ] **Step 11: Commit**

```bash
git add components/partner/AppointmentDetailModal.tsx app/api/appointments/
git commit -m "feat(appointment): complete-with-usage sub-view + status=completed PATCH"
```

---

## Task 13: Update BRIEF_FOR_GEMINI.md

**Files:**
- Modify: `BRIEF_FOR_GEMINI.md`

- [ ] **Step 1: Update the gap-list and what's-built sections**

In [BRIEF_FOR_GEMINI.md](../../../BRIEF_FOR_GEMINI.md):

- In section 3 (что уже реализовано — таблица партнёрского кабинета), add a new row between «Услуги» and «Отзывы»:

```markdown
| Склад | `/partner/inventory` | ✅ | Каталог материалов · поступления (партии FIFO с ценой) · списания. Рецепт на варианте услуги. Авто-предзаполнение списания при завершении записи. Обработка shortfall. |
```

- In section 6 (gaps vs Yclients), move «❌ Склад / товары / расходники» from the «Чего нет» list to the «Что у нас уже есть (паритет с Yclients)» list, rewording as:

```markdown
- ✅ Складской учёт расходных материалов (партии FIFO + рецепт на варианте + авто-списание при завершении записи)
```

- [ ] **Step 2: Commit**

```bash
git add BRIEF_FOR_GEMINI.md
git commit -m "docs: close inventory gap in BRIEF_FOR_GEMINI"
```

---

## Self-review

I went back through the spec section by section.

**1. Spec coverage:**
- 2.1 `materials` → Task 1 schema, Task 3 API, Task 8 catalog UI. ✓
- 2.2 `material_lots` → Task 1, Task 4 API, Task 9 arrivals UI. ✓
- 2.3 `service_variant_materials` → Task 1, Task 5 API, Task 11 ServiceEditor recipe. ✓
- 2.4 `appointment_material_usage` → Task 1, Task 6 API, Task 10 usage tab, Task 12 commit. ✓
- 2.5 computed currentStock / avgPrice → Task 3 GET. ✓
- 3. Workflow FIFO → Task 2 helper + Task 6 commit + Task 12 UI. ✓
- 4. UI sections — Sidebar (Task 7), Catalog (Task 8), Arrivals (Task 9), Usage (Task 10), ServiceEditor block (Task 11), Completion sub-view (Task 12). ✓
- 5. API map — every entry has a creating task. ✓
- 6. Edge cases — shortfall (Task 6 + Task 12 banner), no-recipe variant (Task 12 empty state), no-variant service (Task 11 yellow notice), unit immutability (Task 8 disabled radio in edit mode), soft delete (Task 3 DELETE + Task 8 filter). ✓
- 7. Out-of-v1 items aren't built (correct). ✓
- 8. Tech conventions enforced in each task. ✓
- 9. Checklist all covered. ✓

No gaps.

**2. Placeholder scan:** I didn't write «TBD» / «implement later» / «similar to Task N» / vague error handling. Every step has the actual code. ✓

**3. Type consistency:**
- `consumeFifo`, `returnFifo` signatures match Task 2 → used identically in Task 6. ✓
- `ConsumedLot` shape `{lotId, qty, price}` matches in Task 2 (definition), Task 6 (insert), Task 6 DELETE (cast for return). ✓
- `MaterialData` interface in MaterialEditor matches the fields used by CatalogTab. ✓
- `lowStockThreshold` is `numeric` in DB → string in API JSON → string in editor input. Conversion via `String(Number(...))` on save. ✓
- `pricePerUnit` always treated as `integer` (kopecks). Rubles input converted at the editor boundary. ✓

No inconsistencies.

---

**Plan complete and saved to** [`docs/superpowers/plans/2026-05-20-inventory.md`](docs/superpowers/plans/2026-05-20-inventory.md).
