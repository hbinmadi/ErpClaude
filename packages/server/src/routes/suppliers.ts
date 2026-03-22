import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { suppliers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  code: z.string().min(1),
  companyName: z.string().min(1),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  // ZATCA
  taxId: z.string().optional().nullable(),
  crNumber: z.string().optional().nullable(),
  streetName: z.string().optional().nullable(),
  buildingNumber: z.string().optional().nullable(),
  additionalNumber: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().length(2).optional(),
  // Legacy / banking
  address: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccount: z.string().optional().nullable(),
  bankIban: z.string().optional().nullable(),
  currency: z.string().length(3).optional(),
  paymentTermsDays: z.number().int().optional(),
});

router.get('/', async (req, res) => {
  try {
    const data = await db.select().from(suppliers).where(eq(suppliers.isDeleted, false));
    res.json({ data, meta: { total: data.length, page: 1, limit: data.length } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'purchase'), validate(createSchema), async (req, res) => {
  try {
    const [s] = await db.insert(suppliers).values(req.body).returning();
    res.status(201).json({ data: s });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [s] = await db.select().from(suppliers).where(eq(suppliers.id, Number(req.params.id)));
    if (!s) return res.status(404).json({ error: 'NOT_FOUND', message: 'Supplier not found' });
    res.json({ data: s });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.put('/:id', requireRole('admin', 'purchase'), async (req, res) => {
  try {
    const [s] = await db.update(suppliers).set({ ...req.body, updatedAt: new Date() })
      .where(eq(suppliers.id, Number(req.params.id))).returning();
    res.json({ data: s });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
