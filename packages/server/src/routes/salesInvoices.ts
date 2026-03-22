import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { salesInvoices, salesInvoiceLines, customerReceipts, customers } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { SalesInvoiceService } from '../services/SalesInvoiceService';
import { SequenceService } from '../services/SequenceService';
import { parsePagination } from '@erp/shared';

const router = Router();
router.use(authenticate);

const createInvoiceSchema = z.object({
  customerId: z.number().int().positive(),
  soId: z.number().int().optional(),
  deliveryId: z.number().int().optional(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  invoiceType: z.enum(['standard', 'simplified']).optional(),
  paymentMeans: z.enum(['cash', 'bank', 'credit', 'card', 'cheque']).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.number().int().optional(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().int().positive(),
    discountPct: z.number().min(0).max(100).optional(),
    taxRate: z.number().optional(),
  })).min(1),
});

const createReceiptSchema = z.object({
  customerId: z.number().int().positive(),
  invoiceId: z.number().int().positive(),
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive(),
  paymentMethod: z.enum(['bank', 'cash', 'cheque']),
  bankAccountId: z.number().int().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(salesInvoices)
      .where(eq(salesInvoices.isDeleted, false));
    const data = await db.select().from(salesInvoices)
      .where(eq(salesInvoices.isDeleted, false))
      .orderBy(desc(salesInvoices.invoiceDate)).limit(limit).offset(offset);
    res.json({ data, meta: { total: Number(count), page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'sales', 'accountant'), validate(createInvoiceSchema), async (req, res) => {
  try {
    const id = await SalesInvoiceService.create({ ...req.body, createdBy: req.user!.id });
    res.status(201).json({ data: { id } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invId = Number(req.params.id);
    const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, invId));
    if (!inv) return res.status(404).json({ error: 'NOT_FOUND', message: 'Invoice not found' });
    const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId));
    const lines = await db.select().from(salesInvoiceLines).where(eq(salesInvoiceLines.invoiceId, invId));
    res.json({ data: { ...inv, customer, lines } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/post', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await SalesInvoiceService.post(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/receipts', requireRole('admin', 'sales', 'accountant'), validate(createReceiptSchema), async (req, res) => {
  try {
    const receiptNumber = await db.transaction(async (tx) =>
      SequenceService.nextVal('customer_receipt', tx)
    );
    const [rec] = await db.insert(customerReceipts)
      .values({ ...req.body, receiptNumber, createdBy: req.user!.id })
      .returning();
    res.status(201).json({ data: rec });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/receipts/:id/post', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await SalesInvoiceService.postReceipt(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
