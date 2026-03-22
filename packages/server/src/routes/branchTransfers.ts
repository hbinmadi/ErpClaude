import { Router } from 'express';
import { db } from '../db';
import {
  branchTransfers, branchTransferLines, branchProducts, branches, products
} from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { sql } from 'drizzle-orm';

const router = Router();
router.use(authenticate);

// ── Auto-number helper ────────────────────────────────────────────────────────
async function nextTransferNumber(): Promise<string> {
  const [{ max }] = await db.execute(sql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(transfer_number FROM 4) AS INTEGER)), 0) + 1 AS max
    FROM branch_transfers
    WHERE transfer_number LIKE 'TRF%'
  `) as any;
  return `TRF${String(max).padStart(5, '0')}`;
}

// ── List ─────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT bt.*,
        fb.name AS from_branch_name, fb.code AS from_branch_code,
        tb.name AS to_branch_name,   tb.code AS to_branch_code
      FROM branch_transfers bt
      JOIN branches fb ON fb.id = bt.from_branch_id
      JOIN branches tb ON tb.id = bt.to_branch_id
      WHERE bt.is_deleted = false
      ORDER BY bt.created_at DESC
    `);
    res.json({ data: rows.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Get one with lines ────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [transfer] = await db.execute(sql`
      SELECT bt.*,
        fb.name AS from_branch_name, fb.code AS from_branch_code,
        tb.name AS to_branch_name,   tb.code AS to_branch_code
      FROM branch_transfers bt
      JOIN branches fb ON fb.id = bt.from_branch_id
      JOIN branches tb ON tb.id = bt.to_branch_id
      WHERE bt.id = ${id} AND bt.is_deleted = false
    `) as any;
    if (!transfer) return res.status(404).json({ error: 'NOT_FOUND', message: 'Transfer not found' });

    const lines = await db.execute(sql`
      SELECT btl.*, p.code AS product_code, p.name AS product_name
      FROM branch_transfer_lines btl
      JOIN products p ON p.id = btl.product_id
      WHERE btl.transfer_id = ${id}
    `);

    res.json({ data: { ...transfer, lines: lines.rows } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Create ────────────────────────────────────────────────────────────────────
router.post('/', requireRole('admin', 'warehouse'), async (req, res) => {
  try {
    const { fromBranchId, toBranchId, transferDate, notes, lines } = req.body;
    if (!fromBranchId || !toBranchId) return res.status(400).json({ error: 'BAD_REQUEST', message: 'fromBranchId and toBranchId required' });
    if (fromBranchId === toBranchId) return res.status(400).json({ error: 'BAD_REQUEST', message: 'Cannot transfer to same branch' });
    if (!Array.isArray(lines) || lines.length === 0) return res.status(400).json({ error: 'BAD_REQUEST', message: 'At least one line required' });

    const transferNumber = await nextTransferNumber();

    const [transfer] = await db.insert(branchTransfers).values({
      transferNumber,
      fromBranchId: Number(fromBranchId),
      toBranchId: Number(toBranchId),
      transferDate,
      notes: notes || null,
      createdBy: (req as any).user?.id ?? 1,
    }).returning();

    const lineRows = lines
      .filter((l: any) => l.productId && parseFloat(l.quantity) > 0)
      .map((l: any) => {
        const qty = parseFloat(l.quantity) || 0;
        const cost = Math.round((parseFloat(l.unitCost) || 0) * 100);
        return {
          transferId: transfer.id,
          productId: Number(l.productId),
          description: l.description || null,
          quantity: String(qty),
          unitCost: cost,
          lineTotal: Math.round(qty * cost),
        };
      });

    if (lineRows.length > 0) await db.insert(branchTransferLines).values(lineRows);

    res.status(201).json({ data: { id: transfer.id, transferNumber: transfer.transferNumber } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Update (draft only) ───────────────────────────────────────────────────────
router.put('/:id', requireRole('admin', 'warehouse'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [existing] = await db.select().from(branchTransfers).where(eq(branchTransfers.id, id));
    if (!existing) return res.status(404).json({ error: 'NOT_FOUND', message: 'Transfer not found' });
    if (existing.status !== 'draft') return res.status(409).json({ error: 'CONFLICT', message: 'Only draft transfers can be edited' });

    const { fromBranchId, toBranchId, transferDate, notes, lines } = req.body;
    await db.update(branchTransfers).set({
      fromBranchId: Number(fromBranchId),
      toBranchId: Number(toBranchId),
      transferDate,
      notes: notes || null,
    }).where(eq(branchTransfers.id, id));

    // Replace lines
    await db.delete(branchTransferLines).where(eq(branchTransferLines.transferId, id));
    const lineRows = (lines as any[])
      .filter((l: any) => l.productId && parseFloat(l.quantity) > 0)
      .map((l: any) => {
        const qty = parseFloat(l.quantity) || 0;
        const cost = Math.round((parseFloat(l.unitCost) || 0) * 100);
        return {
          transferId: id,
          productId: Number(l.productId),
          description: l.description || null,
          quantity: String(qty),
          unitCost: cost,
          lineTotal: Math.round(qty * cost),
        };
      });
    if (lineRows.length > 0) await db.insert(branchTransferLines).values(lineRows);

    res.json({ data: { id } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Confirm: update branch_products pricing from→to branch ───────────────────
router.post('/:id/confirm', requireRole('admin', 'warehouse'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [transfer] = await db.select().from(branchTransfers).where(eq(branchTransfers.id, id));
    if (!transfer) return res.status(404).json({ error: 'NOT_FOUND', message: 'Transfer not found' });
    if (transfer.status !== 'draft') return res.status(409).json({ error: 'CONFLICT', message: 'Already confirmed' });

    const lines = await db.select().from(branchTransferLines)
      .where(eq(branchTransferLines.transferId, id));

    // For each line: ensure product exists in destination branch with the transferred cost
    for (const line of lines) {
      const existing = await db.select().from(branchProducts)
        .where(and(eq(branchProducts.branchId, transfer.toBranchId), eq(branchProducts.productId, line.productId)));

      if (existing.length > 0) {
        await db.update(branchProducts)
          .set({ costPrice: line.unitCost, syncedAt: new Date() })
          .where(and(eq(branchProducts.branchId, transfer.toBranchId), eq(branchProducts.productId, line.productId)));
      } else {
        // Get source branch product for salesPrice
        const [srcBP] = await db.select().from(branchProducts)
          .where(and(eq(branchProducts.branchId, transfer.fromBranchId), eq(branchProducts.productId, line.productId)));
        const [masterProduct] = await db.select().from(products).where(eq(products.id, line.productId));
        await db.insert(branchProducts).values({
          branchId: transfer.toBranchId,
          productId: line.productId,
          costPrice: line.unitCost,
          salesPrice: srcBP?.salesPrice ?? masterProduct?.salesPrice ?? 0,
          syncedAt: new Date(),
        });
      }
    }

    await db.update(branchTransfers).set({
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: (req as any).user?.id ?? 1,
    }).where(eq(branchTransfers.id, id));

    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// ── Cancel ────────────────────────────────────────────────────────────────────
router.post('/:id/cancel', requireRole('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.update(branchTransfers).set({ status: 'cancelled' }).where(eq(branchTransfers.id, id));
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
