import { Router } from 'express';
import { db } from '../db';
import { products, inventoryBalances, inventoryMovements, warehouses } from '../db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { InventoryService } from '../services/InventoryService';

const router = Router();
router.use(authenticate);

// ── Current stock levels (products + balances) ────────────────────────────────
router.get('/stock', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.code,
        p.name,
        p.product_type,
        p.sales_price,
        p.purchase_price,
        p.tax_rate,
        p.reorder_point,
        p.is_active,
        COALESCE(SUM(ib.quantity_on_hand), 0) AS quantity_on_hand,
        COALESCE(SUM(ib.quantity_reserved), 0) AS quantity_reserved,
        COALESCE(SUM(ib.quantity_on_order), 0) AS quantity_on_order
      FROM products p
      LEFT JOIN inventory_balances ib ON ib.product_id = p.id
      WHERE p.is_deleted = false AND p.product_type = 'inventory'
      GROUP BY p.id, p.code, p.name, p.product_type, p.sales_price, p.purchase_price, p.tax_rate, p.reorder_point, p.is_active
      ORDER BY p.code
    `);
    res.json({ data: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Recent movements ──────────────────────────────────────────────────────────
router.get('/movements', async (req, res) => {
  try {
    const { limit = '100' } = req.query as Record<string, string>;
    const rows = await db.execute(sql`
      SELECT
        im.id, im.movement_type, im.quantity, im.unit_cost,
        im.reference_type, im.reference_id, im.moved_at,
        p.code AS product_code, p.name AS product_name,
        w.name AS warehouse_name
      FROM inventory_movements im
      JOIN products p ON p.id = im.product_id
      JOIN warehouses w ON w.id = im.warehouse_id
      ORDER BY im.moved_at DESC
      LIMIT ${parseInt(limit)}
    `);
    res.json({ data: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Warehouses list ───────────────────────────────────────────────────────────
router.get('/warehouses', async (req, res) => {
  try {
    const data = await db.select().from(warehouses);
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Stock adjustment ──────────────────────────────────────────────────────────
router.post('/adjustments', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { productId, warehouseId, quantity, note } = req.body as {
      productId: number;
      warehouseId: number;
      quantity: number;
      note?: string;
    };
    if (!productId || !warehouseId || quantity === undefined) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'productId, warehouseId, quantity required' });
    }
    await InventoryService.applyMovement(db as any, {
      productId,
      warehouseId,
      movementType: 'adjustment',
      quantity: Math.abs(quantity),
      unitCost: 0,
      referenceType: 'manual_adjustment',
      movedBy: (req as any).user?.id ?? 1,
    });
    res.status(201).json({ data: { success: true } });
  } catch (err: any) {
    const status = (err as any).status ?? 500;
    res.status(status).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
