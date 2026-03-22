import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { employees } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';
import { SequenceService } from '../services/SequenceService';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  nationalId: z.string().optional(),
  departmentId: z.number().int().optional(),
  jobTitle: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract']).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  basicSalary: z.number().int().min(0),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankName: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const data = await db.select().from(employees).where(eq(employees.isDeleted, false));
    res.json({ data, meta: { total: data.length, page: 1, limit: data.length } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'accountant'), validate(createSchema), async (req, res) => {
  try {
    const employeeNumber = await db.transaction(async (tx) =>
      SequenceService.nextVal('employee', tx)
    );
    const [emp] = await db.insert(employees).values({ ...req.body, employeeNumber }).returning();
    res.status(201).json({ data: emp });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [emp] = await db.select().from(employees).where(eq(employees.id, Number(req.params.id)));
    if (!emp || emp.isDeleted) return res.status(404).json({ error: 'NOT_FOUND', message: 'Employee not found' });
    res.json({ data: emp });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.put('/:id', requireRole('admin', 'accountant'), async (req, res) => {
  try {
    const [emp] = await db.update(employees)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(employees.id, Number(req.params.id)))
      .returning();
    res.json({ data: emp });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
