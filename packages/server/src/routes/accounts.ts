import { Router } from 'express';
import { z } from 'zod';
import { AccountService } from '../services/AccountService';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  accountTypeId: z.number().int().positive(),
  parentAccountId: z.number().int().positive().optional(),
  isControlAccount: z.boolean().optional(),
  isBankAccount: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  description: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const data = req.query.tree === 'true'
      ? await AccountService.tree()
      : await AccountService.list();
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'accountant'), validate(createSchema), async (req, res) => {
  try {
    const acc = await AccountService.create({ ...req.body, createdBy: req.user!.id });
    res.status(201).json({ data: acc });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: 'ERROR', message: err.message });
  }
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const acc = await AccountService.update(Number(req.params.id), req.body, req.user!.id);
    if (!acc) return res.status(404).json({ error: 'NOT_FOUND', message: 'Account not found' });
    res.json({ data: acc });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await AccountService.softDelete(Number(req.params.id), req.user!.id);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id/ledger', async (req, res) => {
  try {
    const { date_from, date_to } = req.query as { date_from: string; date_to: string };
    if (!date_from || !date_to) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'date_from and date_to required' });
    }
    const data = await AccountService.ledger(Number(req.params.id), date_from, date_to);
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
