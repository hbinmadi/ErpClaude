import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { purchaseOrders, purchaseOrderLines } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { PurchaseOrderService } from '../services/PurchaseOrderService';
import { parsePagination } from '@erp/shared';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  supplierId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unitCost: z.number().int().positive(),
    taxRate: z.number().optional(),
  })).min(1),
});

const receiveSchema = z.object({
  receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  lines: z.array(z.object({
    poLineId: z.number().int().positive(),
    productId: z.number().int().positive(),
    quantityReceived: z.number().positive(),
    unitCost: z.number().int().positive(),
  })).min(1),
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders)
      .where(eq(purchaseOrders.isDeleted, false));
    const data = await db.select().from(purchaseOrders)
      .where(eq(purchaseOrders.isDeleted, false))
      .orderBy(desc(purchaseOrders.createdAt)).limit(limit).offset(offset);
    res.json({ data, meta: { total: Number(count), page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'purchase'), validate(createSchema), async (req, res) => {
  try {
    const id = await PurchaseOrderService.create({ ...req.body, createdBy: req.user!.id });
    res.status(201).json({ data: { id } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, Number(req.params.id)));
    if (!po) return res.status(404).json({ error: 'NOT_FOUND', message: 'PO not found' });
    const lines = await db.select().from(purchaseOrderLines).where(eq(purchaseOrderLines.poId, po.id));
    res.json({ data: { ...po, lines } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/confirm', requireRole('admin', 'purchase'), async (req, res) => {
  try {
    await PurchaseOrderService.confirm(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/receive', requireRole('admin', 'purchase', 'warehouse'), validate(receiveSchema), async (req, res) => {
  try {
    const grnId = await PurchaseOrderService.receive(Number(req.params.id), req.body, req.user!.id);
    res.status(201).json({ data: { grnId } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
