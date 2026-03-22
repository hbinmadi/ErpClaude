import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { leaveRequests } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  employeeId: z.number().int().positive(),
  leaveTypeId: z.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalDays: z.number().int().positive(),
  reason: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const data = await db.select().from(leaveRequests);
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', validate(createSchema), async (req, res) => {
  try {
    const [lr] = await db.insert(leaveRequests).values(req.body).returning();
    res.status(201).json({ data: lr });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/approve', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const [lr] = await db.update(leaveRequests)
      .set({ status: 'approved', approvedBy: req.user!.id, approvedAt: new Date() })
      .where(eq(leaveRequests.id, Number(req.params.id)))
      .returning();

    if (!lr) return res.status(404).json({ error: 'NOT_FOUND', message: 'Leave request not found' });

    await db.execute(sql`
      UPDATE employee_leave_balances
      SET taken_days = taken_days + ${lr.totalDays},
          remaining_days = remaining_days - ${lr.totalDays}
      WHERE employee_id = ${lr.employeeId}
        AND leave_type_id = ${lr.leaveTypeId}
    `);

    res.json({ data: lr });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/:id/reject', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const [lr] = await db.update(leaveRequests)
      .set({ status: 'rejected', approvedBy: req.user!.id, approvedAt: new Date() })
      .where(eq(leaveRequests.id, Number(req.params.id)))
      .returning();
    res.json({ data: lr });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
