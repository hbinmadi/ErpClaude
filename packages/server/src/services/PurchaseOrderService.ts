import { db } from '../db';
import {
  purchaseOrders, purchaseOrderLines, goodsReceipts, goodsReceiptLines,
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

export class PurchaseOrderService {
  static async create(data: {
    supplierId: number;
    warehouseId: number;
    orderDate: string;
    expectedDate?: string;
    currency?: string;
    notes?: string;
    lines: Array<{
      productId: number;
      description?: string;
      quantity: number;
      unitCost: number;
      taxRate?: number;
    }>;
    createdBy: number;
  }) {
    return db.transaction(async (tx) => {
      const poNumber = await SequenceService.nextVal('purchase_order', tx);

      let subtotal = 0;
      let taxAmount = 0;
      const processedLines = data.lines.map(l => {
        const lineNet = Math.round(l.quantity * l.unitCost);
        const lineTax = Math.round(lineNet * (l.taxRate ?? 15) / 100);
        subtotal += lineNet;
        taxAmount += lineTax;
        return { ...l, lineTotal: lineNet, taxRate: l.taxRate ?? 15 };
      });

      const totalAmount = subtotal + taxAmount;

      const [po] = await tx.insert(purchaseOrders).values({
        poNumber,
        supplierId: data.supplierId,
        warehouseId: data.warehouseId,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        currency: data.currency ?? 'SAR',
        subtotal,
        taxAmount,
        totalAmount,
        notes: data.notes,
        createdBy: data.createdBy,
      }).returning({ id: purchaseOrders.id });

      for (const line of processedLines) {
        await tx.insert(purchaseOrderLines).values({
          poId: po.id,
          productId: line.productId,
          description: line.description,
          quantity: String(line.quantity),
          unitCost: line.unitCost,
          taxRate: String(line.taxRate),
          lineTotal: line.lineTotal,
        });
      }

      return po.id;
    });
  }

  static async confirm(poId: number, userId: number) {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
    if (!po) throw Object.assign(new Error('PO not found'), { status: 404 });
    if (po.status !== 'draft') throw Object.assign(new Error('PO is not in draft'), { status: 409 });

    await db.update(purchaseOrders)
      .set({ status: 'sent', approvedBy: userId, approvedAt: new Date() })
      .where(eq(purchaseOrders.id, poId));
  }

  /**
   * Receive goods against a PO. Creates GRN and posts journal:
   * DR 1200 Inventory / CR 2000 Accounts Payable
   */
  static async receive(
    poId: number,
    data: {
      receiptDate: string;
      notes?: string;
      lines: Array<{ poLineId: number; productId: number; quantityReceived: number; unitCost: number }>;
    },
    userId: number
  ) {
    return db.transaction(async (tx) => {
      const [po] = await tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, poId));
      if (!po) throw Object.assign(new Error('PO not found'), { status: 404 });
      if (!['sent', 'partial'].includes(po.status)) {
        throw Object.assign(new Error('PO must be confirmed before receiving'), { status: 409 });
      }

      const grnNumber = await SequenceService.nextVal('goods_receipt', tx);
      const inventoryAccId = await getAccountIdByCode('1200');
      const apAccId = await getAccountIdByCode('2000');

      // Calculate total GRN value
      let grnTotal = 0;
      for (const l of data.lines) grnTotal += Math.round(l.quantityReceived * l.unitCost);

      // Post journal: DR Inventory / CR AP
      const journalLines = [
        { accountId: inventoryAccId, debitAmount: grnTotal, creditAmount: 0, description: `GRN ${grnNumber}` },
        { accountId: apAccId, debitAmount: 0, creditAmount: grnTotal, description: `GRN ${grnNumber}` },
      ];

      const jeId = await JournalService.createAndPost({
        entryDate: new Date(data.receiptDate),
        description: `Goods Receipt ${grnNumber} against PO ${po.poNumber}`,
        reference: po.poNumber,
        sourceModule: 'purchase',
        sourceId: poId,
        lines: journalLines,
        createdBy: userId,
      });

      const [grn] = await tx.insert(goodsReceipts).values({
        grnNumber,
        poId,
        supplierId: po.supplierId,
        warehouseId: po.warehouseId,
        receiptDate: data.receiptDate,
        status: 'posted',
        notes: data.notes,
        journalEntryId: jeId,
        createdBy: userId,
      }).returning({ id: goodsReceipts.id });

      for (const line of data.lines) {
        await tx.insert(goodsReceiptLines).values({
          grnId: grn.id,
          poLineId: line.poLineId,
          productId: line.productId,
          quantityReceived: String(line.quantityReceived),
          unitCost: line.unitCost,
        });

        // Update PO line quantity received
        await tx.execute(sql`
          UPDATE purchase_order_lines
          SET quantity_received = quantity_received + ${line.quantityReceived}
          WHERE id = ${line.poLineId}
        `);

        // Update inventory balance
        await InventoryService.applyMovement(tx, {
          productId: line.productId,
          warehouseId: po.warehouseId,
          movementType: 'receipt',
          quantity: line.quantityReceived,
          unitCost: line.unitCost,
          referenceType: 'grn',
          referenceId: grn.id,
          journalEntryId: jeId,
          movedBy: userId,
        });
      }

      // Update PO status
      const allLines = await tx
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.poId, poId));

      const allReceived = allLines.every(
        l => Number(l.quantityReceived) >= Number(l.quantity)
      );
      await tx.update(purchaseOrders)
        .set({ status: allReceived ? 'received' : 'partial' })
        .where(eq(purchaseOrders.id, poId));

      return grn.id;
    });
  }
}
