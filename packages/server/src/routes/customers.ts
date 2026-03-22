import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { customers, salesInvoices } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  code: z.string().min(1),
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional(),
  // ZATCA fields
  taxId: z.string().optional().nullable(),
  crNumber: z.string().optional().nullable(),
  streetName: z.string().optional().nullable(),
  buildingNumber: z.string().optional().nullable(),
  additionalNumber: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().length(2).optional(),
  // Other
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  currency: z.string().length(3).optional(),
  creditLimit: z.number().int().min(0).optional(),
  paymentTermsDays: z.number().int().min(0).optional(),
});

router.get('/', async (req, res) => {
  try {
    const data = await db.select().from(customers).where(eq(customers.isDeleted, false));
    res.json({ data, meta: { total: data.length, page: 1, limit: data.length } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.post('/', requireRole('admin', 'sales', 'accountant'), validate(createSchema), async (req, res) => {
  try {
    const [c] = await db.insert(customers).values(req.body).returning();
    res.status(201).json({ data: c });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [c] = await db.select().from(customers).where(eq(customers.id, Number(req.params.id)));
    if (!c) return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found' });
    res.json({ data: c });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.put('/:id', requireRole('admin', 'sales', 'accountant'), async (req, res) => {
  try {
    const [c] = await db.update(customers)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(customers.id, Number(req.params.id)))
      .returning();
    res.json({ data: c });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await db.update(customers)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(customers.id, Number(req.params.id)));
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

router.get('/:id/invoices', async (req, res) => {
  try {
    const data = await db.select().from(salesInvoices)
      .where(eq(salesInvoices.customerId, Number(req.params.id)))
      .orderBy(desc(salesInvoices.invoiceDate));
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: 'ERROR', message: err.message });
  }
});

export default router;
