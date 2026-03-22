import { Router } from 'express';
import { db } from '../db';
import { branches, branchProducts, products } from '../db/schema';
import { eq, and, notInArray, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();
router.use(authenticate);

// ── List branches ─────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(branches).orderBy(branches.code);
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Get one ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [row] = await db.select().from(branches).where(eq(branches.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Branch not found' });
    res.json({ data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin'), async (req, res) => {
  try {
    const { code, name, address, phone, isHQ, isActive } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'BAD_REQUEST', message: 'code and name required' });
    const [row] = await db.insert(branches).values({
      code, name, address, phone,
      isHQ: isHQ ?? false,
      isActive: isActive ?? true,
      createdBy: (req as any).user?.id ?? 1,
    }).returning();
    res.status(201).json({ data: row });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'DUPLICATE', message: 'Branch code already exists' });
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const { code, name, address, phone, isHQ, isActive } = req.body;
    const [row] = await db.update(branches).set({
      code, name, address, phone, isHQ, isActive,
      updatedAt: new Date(),
      updatedBy: (req as any).user?.id ?? 1,
    }).where(eq(branches.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Branch not found' });
    res.json({ data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── List products for a branch ────────────────────────────────────────────────
router.get('/:id/products', async (req, res) => {
  try {
    const branchId = Number(req.params.id);
    const rows = await db.execute(sql`
      SELECT
        p.id,
        p.code,
        p.name,
        p.product_type,
        p.tax_rate,
        p.is_active,
        bp.id        AS branch_product_id,
        bp.cost_price,
        bp.sales_price,
        bp.synced_at,
        CASE WHEN bp.id IS NULL THEN true ELSE false END AS missing
      FROM products p
      LEFT JOIN branch_products bp
        ON bp.product_id = p.id AND bp.branch_id = ${branchId}
      WHERE p.is_deleted = false
      ORDER BY p.code
    `);
    res.json({ data: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Update branch product cost/sales price ────────────────────────────────────
router.put('/:id/products/:productId', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const branchId = Number(req.params.id);
    const productId = Number(req.params.productId);
    const costPrice = Math.round((parseFloat(req.body.costPrice) || 0) * 100);
    const salesPrice = Math.round((parseFloat(req.body.salesPrice) || 0) * 100);

    const existing = await db.select().from(branchProducts)
      .where(and(eq(branchProducts.branchId, branchId), eq(branchProducts.productId, productId)));

    if (existing.length > 0) {
      const [row] = await db.update(branchProducts)
        .set({ costPrice, salesPrice, syncedAt: new Date() })
        .where(and(eq(branchProducts.branchId, branchId), eq(branchProducts.productId, productId)))
        .returning();
      return res.json({ data: row });
    } else {
      const [row] = await db.insert(branchProducts)
        .values({ branchId, productId, costPrice, salesPrice, syncedAt: new Date() })
        .returning();
      return res.status(201).json({ data: row });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Sync: replicate all missing products to all branches ──────────────────────
// For each branch, find products not yet in branch_products, insert them using
// the master product's purchase_price as cost_price and sales_price as sales_price.
router.post('/sync', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const allBranches = await db.select({ id: branches.id }).from(branches).where(eq(branches.isActive, true));
    if (allBranches.length === 0) return res.json({ data: { synced: 0 } });

    let totalSynced = 0;

    for (const branch of allBranches) {
      // Find products not yet assigned to this branch
      const existing = await db.select({ productId: branchProducts.productId })
        .from(branchProducts)
        .where(eq(branchProducts.branchId, branch.id));

      const existingIds = existing.map(e => e.productId);

      let missing;
      if (existingIds.length > 0) {
        missing = await db.select().from(products)
          .where(and(eq(products.isDeleted, false), notInArray(products.id, existingIds)));
      } else {
        missing = await db.select().from(products).where(eq(products.isDeleted, false));
      }

      if (missing.length > 0) {
        await db.insert(branchProducts).values(
          missing.map(p => ({
            branchId: branch.id,
            productId: p.id,
            costPrice: p.purchasePrice,
            salesPrice: p.salesPrice,
            syncedAt: new Date(),
          }))
        );
        totalSynced += missing.length;
      }
    }

    res.json({ data: { synced: totalSynced, branches: allBranches.length } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
