import { Router } from 'express';
import { z } from 'zod';
import { JournalService } from '../services/JournalService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { db } from '../db';
import { journalEntries, journalLines } from '../db/schema';
import { eq, and, between, desc, sql } from 'drizzle-orm';

const router = Router();
router.use(authenticate);

const lineSchema = z.object({
  accountId: z.number().int().positive(),
  debitAmount: z.number().int().min(0),
  creditAmount: z.number().int().min(0),
  description: z.string().optional(),
  costCenterId: z.number().int().optional(),
  projectId: z.number().int().optional(),
});

const createSchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1),
  reference: z.string().optional(),
  lines: z.array(lineSchema).min(2),
});

router.get('/', async (req, res) => {
  try {
    const { date_from, date_to, posted, page = '1', limit = '50' } = req.query as Record<string, string>;
    const pg = Math.max(1, parseInt(page));
    const lim = Math.min(200, parseInt(limit));
    const offset = (pg - 1) * lim;

    const conditions: any[] = [];
    if (date_from && date_to) conditions.push(between(journalEntries.entryDate, date_from, date_to));
    if (posted !== undefined) conditions.push(eq(journalEntries.isPosted, posted === 'true'));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(conditions.length ? and(...conditions) : undefined);

    const data = await db
      .select()
      .from(journalEntries)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(journalEntries.entryDate), desc(journalEntries.id))
      .limit(lim)
      .offset(offset);

    res.json({ data, meta: { total: Number(count), page: pg, limit: lim } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, Number(req.params.id)));
    if (!entry) return res.status(404).json({ error: 'NOT_FOUND', message: 'Entry not found' });

    const lines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, entry.id));

    res.json({ data: { ...entry, lines } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'accountant'), validate(createSchema), async (req, res) => {
  try {
    const id = await JournalService.create({
      ...req.body,
      entryDate: new Date(req.body.entryDate),
      sourceModule: 'manual',
      createdBy: req.user!.id,
    });
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    res.status(201).json({ data: entry });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/post', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await JournalService.post(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/reverse', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'reason required' });
    const reversalId = await JournalService.reverse(Number(req.params.id), req.user!.id, reason);
    res.json({ data: { reversalId } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
