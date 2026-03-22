import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { supplierInvoices, supplierPayments } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { SupplierInvoiceService } from '../services/SupplierInvoiceService';
import { parsePagination } from '@erp/shared';

const router = Router();
router.use(authenticate);

const createInvoiceSchema = z.object({
  supplierId: z.number().int().positive(),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplierInvoiceRef: z.string().optional(),
  poId: z.number().int().optional(),
  grnId: z.number().int().optional(),
  lines: z.array(z.object({
    productId: z.number().int().optional(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitCost: z.number().int().positive(),
    taxRate: z.number().optional(),
  })).min(1),
});

const createPaymentSchema = z.object({
  supplierId: z.number().int().positive(),
  invoiceId: z.number().int().positive(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().int().positive(),
  paymentMethod: z.enum(['bank', 'cash', 'cheque']),
  bankAccountId: z.number().int().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(supplierInvoices)
      .where(eq(supplierInvoices.isDeleted, false));
    const data = await db.select().from(supplierInvoices)
      .where(eq(supplierInvoices.isDeleted, false))
      .orderBy(desc(supplierInvoices.invoiceDate)).limit(limit).offset(offset);
    res.json({ data, meta: { total: Number(count), page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'purchase', 'accountant'), validate(createInvoiceSchema), async (req, res) => {
  try {
    const id = await SupplierInvoiceService.create({ ...req.body, createdBy: req.user!.id });
    res.status(201).json({ data: { id } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/post', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await SupplierInvoiceService.post(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/payments', requireRole('admin', 'purchase', 'accountant'), validate(createPaymentSchema), async (req, res) => {
  try {
    const [pmt] = await db.insert(supplierPayments).values({ ...req.body, createdBy: req.user!.id }).returning();
    res.status(201).json({ data: pmt });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/payments/:id/post', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await SupplierInvoiceService.postPayment(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
