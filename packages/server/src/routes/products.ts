import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { products, inventoryMovements, inventoryBalances, warehouses } from '../db/schema';
import { eq, sql, and, ilike, or } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = Router();
router.use(authenticate);

// ── Fast search (used by lookup cells) ──────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q = '', limit = '12', type } = req.query as Record<string, string>;
    const lim = Math.min(50, parseInt(limit));
    const data = await db.execute(sql`
      SELECT id, code, name, product_type, sales_price, purchase_price, tax_rate
      FROM products
      WHERE is_deleted = false AND is_active = true
        ${type ? sql`AND product_type = ${type}` : sql``}
        AND (
          code ILIKE ${`${q}%`}
          OR to_tsvector('english', code || ' ' || name) @@ plainto_tsquery('english', ${q || 'a'})
        )
      ORDER BY code LIMIT ${lim}
    `);
    res.json({ data: data.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── List ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search } = req.query as Record<string, string>;
    let rows;
    if (search) {
      rows = await db.select().from(products).where(
        and(
          eq(products.isDeleted, false),
          or(
            ilike(products.code, `%${search}%`),
            ilike(products.name, `%${search}%`)
          )
        )
      );
    } else {
      rows = await db.select().from(products).where(eq(products.isDeleted, false));
    }
    res.json({ data: rows, meta: { total: rows.length } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Get one ───────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [row] = await db.select().from(products).where(eq(products.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    res.json({ data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { salesPrice, purchasePrice, ...rest } = req.body;
    const [row] = await db.insert(products).values({
      ...rest,
      salesPrice: Math.round((parseFloat(salesPrice) || 0) * 100),
      purchasePrice: Math.round((parseFloat(purchasePrice) || 0) * 100),
      createdBy: (req as any).user?.id ?? 1,
    }).returning();
    res.status(201).json({ data: row });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'DUPLICATE', message: 'Product code already exists' });
    }
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Update ────────────────────────────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { salesPrice, purchasePrice, ...rest } = req.body;
    const update: Record<string, unknown> = { ...rest, updatedAt: new Date(), updatedBy: (req as any).user?.id ?? 1 };
    if (salesPrice !== undefined) update.salesPrice = Math.round((parseFloat(salesPrice) || 0) * 100);
    if (purchasePrice !== undefined) update.purchasePrice = Math.round((parseFloat(purchasePrice) || 0) * 100);
    const [row] = await db.update(products).set(update).where(eq(products.id, Number(req.params.id))).returning();
    if (!row) return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });
    res.json({ data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Soft-delete ───────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.update(products).set({ isDeleted: true, updatedAt: new Date() }).where(eq(products.id, Number(req.params.id)));
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Inventory movements for a product ────────────────────────────────────────
router.get('/:id/movements', async (req, res) => {
  try {
    const data = await db.select().from(inventoryMovements)
      .where(eq(inventoryMovements.productId, Number(req.params.id)));
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Bulk import (batches of up to 1000 rows sent from client) ─────────────────
router.post('/import-batch', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { rows } = req.body as { rows: Record<string, unknown>[] };
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'rows array required' });
    }

    let imported = 0;
    let updated = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const code = String(r['code'] ?? '').trim();
      const name = String(r['name'] ?? '').trim();
      if (!code || !name) {
        errors.push({ row: i + 1, message: `Row ${i + 1}: code and name are required` });
        continue;
      }
      try {
        const salesPrice = Math.round((parseFloat(String(r['salesPrice'] ?? 0)) || 0) * 100);
        const purchasePrice = Math.round((parseFloat(String(r['purchasePrice'] ?? 0)) || 0) * 100);
        const taxRate = String(parseFloat(String(r['taxRate'] ?? '15')) || 15);
        const productType = (['inventory', 'service', 'expense'].includes(String(r['productType'])))
          ? r['productType'] as 'inventory' | 'service' | 'expense'
          : 'inventory';

        const values = {
          code,
          name,
          description: r['description'] ? String(r['description']) : null,
          productType,
          salesPrice,
          purchasePrice,
          taxRate,
          reorderPoint: r['reorderPoint'] ? String(parseFloat(String(r['reorderPoint']))) : null,
          reorderQty: r['reorderQty'] ? String(parseFloat(String(r['reorderQty']))) : null,
          isActive: String(r['isActive'] ?? 'true').toLowerCase() !== 'false',
          updatedAt: new Date(),
          updatedBy: (req as any).user?.id ?? 1,
        };

        // Upsert by code
        const result = await db.execute(sql`
          INSERT INTO products (code, name, description, product_type, sales_price, purchase_price, tax_rate,
            reorder_point, reorder_qty, is_active, created_by, updated_at)
          VALUES (
            ${values.code}, ${values.name}, ${values.description}, ${values.productType},
            ${values.salesPrice}, ${values.purchasePrice}, ${values.taxRate},
            ${values.reorderPoint}, ${values.reorderQty}, ${values.isActive},
            ${(req as any).user?.id ?? 1}, NOW()
          )
          ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            product_type = EXCLUDED.product_type,
            sales_price = EXCLUDED.sales_price,
            purchase_price = EXCLUDED.purchase_price,
            tax_rate = EXCLUDED.tax_rate,
            reorder_point = EXCLUDED.reorder_point,
            reorder_qty = EXCLUDED.reorder_qty,
            is_active = EXCLUDED.is_active,
            is_deleted = false,
            updated_at = NOW()
          RETURNING (xmax = 0) AS inserted
        `);

        const wasInserted = (result.rows[0] as any)?.inserted;
        if (wasInserted) imported++; else updated++;
      } catch (rowErr: any) {
        errors.push({ row: i + 1, message: `Row ${i + 1}: ${rowErr.message}` });
      }
    }

    res.json({ data: { imported, updated, errors, total: rows.length } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
