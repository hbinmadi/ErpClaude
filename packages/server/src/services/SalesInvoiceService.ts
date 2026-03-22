import { db } from '../db';
import {
  salesInvoices, salesInvoiceLines, customerReceipts,
  accounts
} from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { SequenceService } from './SequenceService';
import { JournalService } from './JournalService';

async function getAccountIdByCode(code: string): Promise<number> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.code, code));
  if (!acc) throw new Error(`Account not found: ${code}`);
  return acc.id;
}

export class SalesInvoiceService {
  static async create(data: {
    customerId: number;
    soId?: number;
    deliveryId?: number;
    invoiceDate: string;
    dueDate: string;
    currency?: string;
    lines: Array<{
      productId?: number;
      description: string;
      quantity: number;
      unitPrice: number;
      discountPct?: number;
      taxRate?: number;
    }>;
    createdBy: number;
  }) {
    return db.transaction(async (tx) => {
      const invoiceNumber = await SequenceService.nextVal('sales_invoice', tx);

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

      const [inv] = await tx.insert(salesInvoices).values({
        invoiceNumber,
        customerId: data.customerId,
        soId: data.soId,
        deliveryId: data.deliveryId,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        currency: data.currency ?? 'SAR',
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        amountReceived: 0,
        amountDue: totalAmount,
        createdBy: data.createdBy,
      }).returning({ id: salesInvoices.id });

      for (const line of processedLines) {
        await tx.insert(salesInvoiceLines).values({
          invoiceId: inv.id,
          productId: line.productId,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: line.unitPrice,
          discountPct: String(line.discountPct),
          taxRate: String(line.taxRate),
          lineTotal: line.lineTotal,
        });
      }

      return inv.id;
    });
  }

  /**
   * Post sales invoice.
   * Journal: DR 1100 AR / CR 4000 Revenue / CR 2200 Tax Payable
   */
  static async post(invoiceId: number, userId: number) {
    return db.transaction(async (tx) => {
      const [inv] = await tx.select().from(salesInvoices).where(eq(salesInvoices.id, invoiceId));
      if (!inv) throw Object.assign(new Error('Invoice not found'), { status: 404 });
      if (inv.status !== 'draft') throw Object.assign(new Error('Already posted'), { status: 409 });

      const arAccId  = await getAccountIdByCode('1100');
      const revAccId = await getAccountIdByCode('4000');
      const taxAccId = await getAccountIdByCode('2200');

      const jeId = await JournalService.createAndPost({
        entryDate: new Date(inv.invoiceDate),
        description: `Sales Invoice ${inv.invoiceNumber}`,
        reference: inv.invoiceNumber,
        sourceModule: 'sales',
        sourceId: invoiceId,
        lines: [
          { accountId: arAccId,  debitAmount: inv.totalAmount, creditAmount: 0 },
          { accountId: revAccId, debitAmount: 0, creditAmount: inv.subtotal },
          { accountId: taxAccId, debitAmount: 0, creditAmount: inv.taxAmount },
        ],
        createdBy: userId,
      });

      await tx.update(salesInvoices)
        .set({ status: 'posted', journalEntryId: jeId })
        .where(eq(salesInvoices.id, invoiceId));

      // Prepare ZATCA invoice — runs inside same transaction
      // PIH chain is locked with SELECT FOR UPDATE on sequences
      await import('./zatca/ZatcaService').then(m => m.prepareInvoice(invoiceId, tx));
    });
  }

  /**
   * Post customer receipt.
   * Journal: DR bank/cash / CR 1100 AR
   */
  static async postReceipt(receiptId: number, userId: number) {
    return db.transaction(async (tx) => {
      const [rec] = await tx.select().from(customerReceipts).where(eq(customerReceipts.id, receiptId));
      if (!rec) throw Object.assign(new Error('Receipt not found'), { status: 404 });
      if (rec.status !== 'draft') throw Object.assign(new Error('Already posted'), { status: 409 });

      const arAccId   = await getAccountIdByCode('1100');
      const cashAccId = await getAccountIdByCode('1000');

      const jeId = await JournalService.createAndPost({
        entryDate: new Date(rec.receiptDate),
        description: `Customer Receipt ${rec.receiptNumber}`,
        reference: rec.reference ?? rec.receiptNumber,
        sourceModule: 'receipt',
        sourceId: receiptId,
        lines: [
          { accountId: cashAccId, debitAmount: rec.amount, creditAmount: 0 },
          { accountId: arAccId,   debitAmount: 0,           creditAmount: rec.amount },
        ],
        createdBy: userId,
      });

      await tx.update(customerReceipts)
        .set({ status: 'posted', journalEntryId: jeId })
        .where(eq(customerReceipts.id, receiptId));

      // Update invoice received amount
      await tx.execute(sql`
        UPDATE sales_invoices
        SET amount_received = amount_received + ${rec.amount},
            amount_due = amount_due - ${rec.amount},
            status = CASE
              WHEN amount_due - ${rec.amount} <= 0 THEN 'paid'
              ELSE 'partial'
            END
        WHERE id = ${rec.invoiceId}
      `);
    });
  }
}
