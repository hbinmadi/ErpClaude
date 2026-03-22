import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { payrollRuns, payrollLines } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { PayrollService } from '../services/PayrollService';
import { SequenceService } from '../services/SequenceService';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  periodId: z.number().int().positive(),
  runDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get('/', async (req, res) => {
  try {
    const data = await db.select().from(payrollRuns).orderBy(desc(payrollRuns.createdAt));
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'accountant'), validate(createSchema), async (req, res) => {
  try {
    const runNumber = await db.transaction(async (tx) =>
      SequenceService.nextVal('payroll_run', tx)
    );
    const [run] = await db.insert(payrollRuns).values({
      ...req.body,
      runNumber,
      createdBy: req.user!.id,
    }).returning();
    res.status(201).json({ data: run });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, Number(req.params.id)));
    if (!run) return res.status(404).json({ error: 'NOT_FOUND', message: 'Run not found' });
    const lines = await db.select().from(payrollLines).where(eq(payrollLines.payrollRunId, run.id));
    res.json({ data: { ...run, lines } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/calculate', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, Number(req.params.id)));
    if (!run) return res.status(404).json({ error: 'NOT_FOUND', message: 'Run not found' });
    await PayrollService.calculate(run.id, run.runDate, req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/approve', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await PayrollService.approve(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/post', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    await PayrollService.post(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
