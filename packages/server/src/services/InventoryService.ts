import { db } from '../db';
import { inventoryBalances, inventoryMovements } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

export class InventoryService {
  /**
   * Get current stock for a product in a warehouse.
   * Returns 0 if no balance row exists yet.
   */
  static async getBalance(productId: number, warehouseId: number): Promise<number> {
    const [row] = await db
      .select()
      .from(inventoryBalances)
      .where(
        and(
          eq(inventoryBalances.productId, productId),
          eq(inventoryBalances.warehouseId, warehouseId)
        )
      );
    return Number(row?.quantityOnHand ?? 0);
  }

  /**
   * Apply a stock movement. Throws if shipment would make stock negative.
   * Must be called inside a transaction.
   */
  static async applyMovement(
    tx: typeof db,
    params: {
      productId: number;
      warehouseId: number;
      movementType: 'receipt' | 'shipment' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'opening';
      quantity: number;
      unitCost: number;
      referenceType?: string;
      referenceId?: number;
      journalEntryId?: number;
      movedBy: number;
    }
  ): Promise<void> {
    const { productId, warehouseId, movementType, quantity, unitCost } = params;

    const qtyDelta = movementType === 'shipment' || movementType === 'transfer_out'
      ? -quantity
      : quantity;

    // Check for negative stock on outbound movements
    if (qtyDelta < 0) {
      const [balance] = await tx
        .select()
        .from(inventoryBalances)
        .where(
          and(
            eq(inventoryBalances.productId, productId),
            eq(inventoryBalances.warehouseId, warehouseId)
          )
        );
      const current = Number(balance?.quantityOnHand ?? 0);
      if (current + qtyDelta < 0) {
        throw Object.assign(
          new Error(
            `Insufficient stock for product ${productId}: have ${current}, need ${Math.abs(qtyDelta)}`
          ),
          { status: 422 }
        );
      }
    }

    // Upsert balance
    await tx.execute(sql`
      INSERT INTO inventory_balances (product_id, warehouse_id, quantity_on_hand, last_updated)
      VALUES (${productId}, ${warehouseId}, ${qtyDelta}, NOW())
      ON CONFLICT (product_id, warehouse_id)
      DO UPDATE SET
        quantity_on_hand = inventory_balances.quantity_on_hand + ${qtyDelta},
        last_updated = NOW()
    `);

    // Record movement
    await tx.insert(inventoryMovements).values({
      productId,
      warehouseId,
      movementType: params.movementType,
      quantity: String(quantity),
      unitCost,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      journalEntryId: params.journalEntryId,
      movedBy: params.movedBy,
    });
  }
}
