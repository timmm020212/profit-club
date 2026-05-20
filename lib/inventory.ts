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
    if (remaining <= 0.005) break; // sub-cent → done
    const available = Number(lot.qtyRemaining);
    const take = Math.round(Math.min(remaining, available) * 100) / 100;
    if (take <= 0) break;

    await tx
      .update(materialLots)
      .set({
        qtyRemaining: sql`${materialLots.qtyRemaining} - ${take.toFixed(2)}`,
      })
      .where(eq(materialLots.id, lot.id));

    consumed.push({ lotId: lot.id, qty: take, price: lot.pricePerUnit });
    totalCost += Math.round(take * lot.pricePerUnit);
    remaining = Math.round((remaining - take) * 100) / 100;
  }

  return {
    consumed,
    totalCost,
    shortfall: Math.max(0, Math.round(remaining * 100) / 100),
  };
}

/**
 * Return previously-consumed quantities back to their lots (used when a
 * usage row is deleted). Restores into the original lot when possible.
 * Must run inside a transaction.
 */
export async function returnFifo(tx: Tx, salonId: number, consumed: ConsumedLot[]): Promise<void> {
  for (const c of consumed) {
    // Lock the row to keep symmetry with consumeFifo's FOR UPDATE.
    await tx
      .select({ id: materialLots.id })
      .from(materialLots)
      .where(and(eq(materialLots.salonId, salonId), eq(materialLots.id, c.lotId)))
      .for("update");

    const updated = await tx
      .update(materialLots)
      .set({
        qtyRemaining: sql`${materialLots.qtyRemaining} + ${c.qty.toFixed(2)}`,
      })
      .where(and(
        eq(materialLots.salonId, salonId),
        eq(materialLots.id, c.lotId),
      ))
      .returning({ id: materialLots.id });

    if (updated.length === 0) {
      console.warn(`[returnFifo] lot ${c.lotId} not found, qty ${c.qty} not restored`);
    }
  }
}
