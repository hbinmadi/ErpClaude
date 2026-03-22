import { db } from '../db';
import {
  supplierInvoices, supplierInvoiceLines, supplierPayments,
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

export class SupplierInvoiceService {
  static async create(data: {
    supplierId: number;
    invoiceDate: string;
    dueDate: string;
    supplierInvoiceRef?: string;
    poId?: number;
    grnId?: number;
    currency?: string;
    lines: Array<{
      productId?: number;
      description: string;
      quantity: number;
      unitCost: number;
      taxRate?: number;
    }>;
    createdBy: number;
  }) {
    return db.transaction(async (tx) => {
      const invoiceNumber = await SequenceService.nextVal('supplier_invoice', tx);
      let subtotal = 0, taxAmount = 0;

      const processedLines = data.lines.map(l => {
        const lineNet = Math.round(l.quantity * l.unitCost);
        const lineTax = Math.round(lineNet * (l.taxRate ?? 15) / 100);
        subtotal += lineNet;
        taxAmount += lineTax;
        return { ...l, lineTotal: lineNet, taxRate: l.taxRate ?? 15 };
      });

      const totalAmount = subtotal + taxAmount;

      const [inv] = await tx.insert(supplierInvoices).values({
        invoiceNumber,
        supplierInvoiceRef: data.supplierInvoiceRef,
        supplierId: data.supplierId,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        poId: data.poId,
        grnId: data.grnId,
        currency: data.currency ?? 'SAR',
        subtotal,
        taxAmount,
        totalAmount,
        amountPaid: 0,
        amountDue: totalAmount,
        createdBy: data.createdBy,
      }).returning({ id: supplierInvoices.id });

      for (const line of processedLines) {
        await tx.insert(supplierInvoiceLines).values({
          invoiceId: inv.id,
          productId: line.productId,
          description: line.description,
          quantity: String(line.quantity),
          unitCost: line.unitCost,
          taxRate: String(line.taxRate),
          lineTotal: line.lineTotal,
        });
      }

      return inv.id;
    });
  }

  /**
   * Post supplier invoice.
   * Journal: DR Inventory / CR AP
   */
  static async post(invoiceId: number, userId: number) {
    return db.transaction(async (tx) => {
      const [inv] = await tx.select().from(supplierInvoices).where(eq(supplierInvoices.id, invoiceId));
      if (!inv) throw Object.assign(new Error('Invoice not found'), { status: 404 });
      if (inv.status !== 'draft') throw Object.assign(new Error('Already posted'), { status: 409 });

      const apAccId = await getAccountIdByCode('2000');
      const inventoryAccId = await getAccountIdByCode('1200');

      const jeId = await JournalService.createAndPost({
        entryDate: new Date(inv.invoiceDate),
        description: `Supplier Invoice ${inv.invoiceNumber}`,
        reference: inv.supplierInvoiceRef ?? inv.invoiceNumber,
        sourceModule: 'purchase',
        sourceId: invoiceId,
        lines: [
          { accountId: inventoryAccId, debitAmount: inv.subtotal, creditAmount: 0 },
          { accountId: apAccId, debitAmount: 0, creditAmount: inv.totalAmount },
        ],
        createdBy: userId,
      });

      await tx.update(supplierInvoices)
        .set({ status: 'posted', journalEntryId: jeId, amountDue: inv.totalAmount })
        .where(eq(supplierInvoices.id, invoiceId));
    });
  }

  /**
   * Post supplier payment.
   * Journal: DR 2000 AP / CR bank account
   */
  static async postPayment(paymentId: number, userId: number) {
    return db.transaction(async (tx) => {
      const [pmt] = await tx.select().from(supplierPayments).where(eq(supplierPayments.id, paymentId));
      if (!pmt) throw Object.assign(new Error('Payment not found'), { status: 404 });
      if (pmt.status !== 'draft') throw Object.assign(new Error('Already posted'), { status: 409 });

      const apAccId = await getAccountIdByCode('2000');
      const cashAccId = await getAccountIdByCode('1000');

      const jeId = await JournalService.createAndPost({
        entryDate: new Date(pmt.paymentDate),
        description: `Supplier Payment ${pmt.paymentNumber}`,
        reference: pmt.reference ?? pmt.paymentNumber,
        sourceModule: 'payment',
        sourceId: paymentId,
        lines: [
          { accountId: apAccId, debitAmount: pmt.amount, creditAmount: 0 },
          { accountId: cashAccId, debitAmount: 0, creditAmount: pmt.amount },
        ],
        createdBy: userId,
      });

      await tx.update(supplierPayments)
        .set({ status: 'posted', journalEntryId: jeId })
        .where(eq(supplierPayments.id, paymentId));

      // Update invoice paid amount
      await tx.execute(sql`
        UPDATE supplier_invoices
        SET amount_paid = amount_paid + ${pmt.amount},
            amount_due = amount_due - ${pmt.amount},
            status = CASE
              WHEN amount_due - ${pmt.amount} <= 0 THEN 'paid'
              ELSE 'partial'
            END
        WHERE id = ${pmt.invoiceId}
      `);
    });
  }
}
