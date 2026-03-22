import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { db } from '../db';
import { zatcaInvoices } from '../db/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { submitInvoice, prepareInvoice } from '../services/zatca/ZatcaService';
import { parsePagination } from '@erp/shared';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin', 'accountant'));

// List all ZATCA invoices with status
router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as any);
    const statusFilter = req.query.status as string | undefined;

    const conditions = statusFilter
      ? [inArray(zatcaInvoices.status, [statusFilter as any])]
      : [];

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(zatcaInvoices)
      .where(conditions.length ? and(...conditions) : undefined);

    const data = await db
      .select()
      .from(zatcaInvoices)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(zatcaInvoices.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ data, meta: { total: Number(count), page, limit } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// Get single ZATCA invoice detail
router.get('/stats/summary', async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        status,
        COUNT(*) AS count
      FROM zatca_invoices
      GROUP BY status
    `);

    const byStatus: Record<string, number> = {};
    for (const row of result.rows as Array<{ status: string; count: number }>) {
      byStatus[row.status] = Number(row.count);
    }

    res.json({
      data: {
        pending:  byStatus['pending']  ?? 0,
        cleared:  byStatus['cleared']  ?? 0,
        reported: byStatus['reported'] ?? 0,
        rejected: byStatus['rejected'] ?? 0,
        error:    byStatus['error']    ?? 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [zi] = await db.select().from(zatcaInvoices)
      .where(eq(zatcaInvoices.id, Number(req.params.id)));
    if (!zi) return res.status(404).json({ error: 'NOT_FOUND', message: 'ZATCA invoice not found' });
    res.json({ data: zi });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// Get XML content for a ZATCA invoice
router.get('/:id/xml', async (req, res) => {
  try {
    const [zi] = await db.select().from(zatcaInvoices)
      .where(eq(zatcaInvoices.id, Number(req.params.id)));
    if (!zi) return res.status(404).json({ error: 'NOT_FOUND', message: 'Not found' });
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${zi.id}.xml"`);
    res.send(zi.xmlSigned ?? zi.xmlContent);
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// Get QR code
router.get('/:id/qr', async (req, res) => {
  try {
    const [zi] = await db.select().from(zatcaInvoices)
      .where(eq(zatcaInvoices.id, Number(req.params.id)));
    if (!zi || !zi.qrCodeBase64) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'QR not available' });
    }
    res.json({ data: { qrBase64: zi.qrCodeBase64 } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

// Manual retry submit
router.post('/:id/submit', async (req, res) => {
  try {
    await submitInvoice(Number(req.params.id));
    const [zi] = await db.select().from(zatcaInvoices)
      .where(eq(zatcaInvoices.id, Number(req.params.id)));
    res.json({ data: { status: zi?.status } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
