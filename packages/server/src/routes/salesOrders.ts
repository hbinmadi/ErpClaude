import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { salesOrders, salesOrderLines } from '../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { SalesOrderService } from '../services/SalesOrderService';
import { parsePagination } from '@erp/shared';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  customerId: z.number().int().positive(),
  warehouseId: z.number().int().positive(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    productId: z.number().int().positive(),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unitPrice: z.number().int().positive(),
    discountPct: z.number().min(0).max(100).optional(),
    taxRate: z.number().optional(),
  })).min(1),
});

const shipSchema = z.object({
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  lines: z.array(z.object({
    soLineId: z.number().int().positive(),
    productId: z.number().int().positive(),
    quantityShipped: z.number().positive(),
    unitCost: z.number().int().positive(),
  })).min(1),
});

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(salesOrders)
      .where(eq(salesOrders.isDeleted, false));
    const data = await db.select().from(salesOrders)
      .where(eq(salesOrders.isDeleted, false))
      .orderBy(desc(salesOrders.createdAt)).limit(limit).offset(offset);
    res.json({ data, meta: { total: Number(count), page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'sales'), validate(createSchema), async (req, res) => {
  try {
    const id = await SalesOrderService.create({ ...req.body, createdBy: req.user!.id });
    res.status(201).json({ data: { id } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [so] = await db.select().from(salesOrders).where(eq(salesOrders.id, Number(req.params.id)));
    if (!so) return res.status(404).json({ error: 'NOT_FOUND', message: 'SO not found' });
    const lines = await db.select().from(salesOrderLines).where(eq(salesOrderLines.soId, so.id));
    res.json({ data: { ...so, lines } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/confirm', requireRole('admin', 'sales'), async (req, res) => {
  try {
    await SalesOrderService.confirm(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/ship', requireRole('admin', 'sales', 'warehouse'), validate(shipSchema), async (req, res) => {
  try {
    const delId = await SalesOrderService.ship(Number(req.params.id), req.body, req.user!.id);
    res.status(201).json({ data: { deliveryId: delId } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
