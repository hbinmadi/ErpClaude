import { db } from '../db';
import {
  salesOrders, salesOrderLines, deliveries, deliveryLines,
  accounts
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { SequenceService } from './SequenceService';
import { JournalService } from './JournalService';
import { InventoryService } from './InventoryService';

async function getAccountIdByCode(code: string): Promise<number> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.code, code));
  if (!acc) throw new Error(`Account not found: ${code}`);
  return acc.id;
}

export class SalesOrderService {
  static async create(data: {
    customerId: number;
    warehouseId: number;
    orderDate: string;
    expectedDate?: string;
    currency?: string;
    notes?: string;
    lines: Array<{
      productId: number;
      description?: string;
      quantity: number;
      unitPrice: number;
      discountPct?: number;
      taxRate?: number;
    }>;
    createdBy: number;
  }) {
    return db.transaction(async (tx) => {
      const soNumber = await SequenceService.nextVal('sales_order', tx);

      let subtotal = 0, discountAmount = 0, taxAmount = 0;
      const processedLines = data.lines.map(l => {
        const gross = Math.round(l.quantity * l.unitPrice);
        const disc = Math.round(gross * (l.discountPct ?? 0) / 100);
        const net = gross - disc;
        const tax = Math.round(net * (l.taxRate ?? 15) / 100);
        subtotal += net;
        discountAmount += disc;
        taxAmount += tax;
        return { ...l, lineTotal: net, discountPct: l.discountPct ?? 0, taxRate: l.taxRate ?? 15 };
      });

      const totalAmount = subtotal + taxAmount;

      const [so] = await tx.insert(salesOrders).values({
        soNumber,
        customerId: data.customerId,
        warehouseId: data.warehouseId,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        currency: data.currency ?? 'SAR',
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        notes: data.notes,
        createdBy: data.createdBy,
      }).returning({ id: salesOrders.id });

      for (const line of processedLines) {
        await tx.insert(salesOrderLines).values({
          soId: so.id,
          productId: line.productId,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: line.unitPrice,
          discountPct: String(line.discountPct),
          taxRate: String(line.taxRate),
          lineTotal: line.lineTotal,
        });
      }

      return so.id;
    });
  }

  static async confirm(soId: number, userId: number) {
    const [so] = await db.select().from(salesOrders).where(eq(salesOrders.id, soId));
    if (!so) throw Object.assign(new Error('SO not found'), { status: 404 });
    if (so.status !== 'draft') throw Object.assign(new Error('SO is not draft'), { status: 409 });

    await db.update(salesOrders)
      .set({ status: 'confirmed', approvedBy: userId, approvedAt: new Date() })
      .where(eq(salesOrders.id, soId));
  }

  /**
   * Ship against a SO. Creates delivery, posts journal:
   * DR 5000 COGS / CR 1200 Inventory
   */
  static async ship(
    soId: number,
    data: {
      deliveryDate: string;
      notes?: string;
      lines: Array<{ soLineId: number; productId: number; quantityShipped: number; unitCost: number }>;
    },
    userId: number
  ) {
    return db.transaction(async (tx) => {
      const [so] = await tx.select().from(salesOrders).where(eq(salesOrders.id, soId));
      if (!so) throw Object.assign(new Error('SO not found'), { status: 404 });
      if (!['confirmed', 'partial'].includes(so.status)) {
        throw Object.assign(new Error('SO must be confirmed before shipping'), { status: 409 });
      }

      const deliveryNumber = await SequenceService.nextVal('delivery', tx);
      const cogsAccId = await getAccountIdByCode('5000');
      const inventoryAccId = await getAccountIdByCode('1200');

      let cogsTotal = 0;
      for (const l of data.lines) cogsTotal += Math.round(l.quantityShipped * l.unitCost);

      // Journal: DR COGS / CR Inventory
      const jeId = await JournalService.createAndPost({
        entryDate: new Date(data.deliveryDate),
        description: `Delivery ${deliveryNumber} for SO ${so.soNumber}`,
        reference: so.soNumber,
        sourceModule: 'inventory',
        sourceId: soId,
        lines: [
          { accountId: cogsAccId,      debitAmount: cogsTotal, creditAmount: 0 },
          { accountId: inventoryAccId, debitAmount: 0,         creditAmount: cogsTotal },
        ],
        createdBy: userId,
      });

      const [del] = await tx.insert(deliveries).values({
        deliveryNumber,
        soId,
        customerId: so.customerId,
        warehouseId: so.warehouseId,
        deliveryDate: data.deliveryDate,
        status: 'posted',
        notes: data.notes,
        journalEntryId: jeId,
        createdBy: userId,
      }).returning({ id: deliveries.id });

      for (const line of data.lines) {
        await tx.insert(deliveryLines).values({
          deliveryId: del.id,
          soLineId: line.soLineId,
          productId: line.productId,
          quantityShipped: String(line.quantityShipped),
          unitCost: line.unitCost,
        });

        // Update SO line shipped qty
        await tx.execute(sql`
          UPDATE sales_order_lines
          SET quantity_shipped = quantity_shipped + ${line.quantityShipped}
          WHERE id = ${line.soLineId}
        `);

        // Deduct inventory (will throw if negative)
        await InventoryService.applyMovement(tx, {
          productId: line.productId,
          warehouseId: so.warehouseId,
          movementType: 'shipment',
          quantity: line.quantityShipped,
          unitCost: line.unitCost,
          referenceType: 'delivery',
          referenceId: del.id,
          journalEntryId: jeId,
          movedBy: userId,
        });
      }

      // Update SO status
      const allLines = await tx.select().from(salesOrderLines).where(eq(salesOrderLines.soId, soId));
      const allShipped = allLines.every(l => Number(l.quantityShipped) >= Number(l.quantity));
      await tx.update(salesOrders)
        .set({ status: allShipped ? 'shipped' : 'partial' })
        .where(eq(salesOrders.id, soId));

      return del.id;
    });
  }
}
