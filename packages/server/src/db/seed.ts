import 'dotenv/config';
import { db, pool } from '../db';
import { users, sequences, companySettings } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding Core data...');

  // Users — one per role
  const roles = [
    { email: 'admin@erp.local',     password: 'Admin1234!', role: 'admin',      fullName: 'Admin User' },
    { email: 'accountant@erp.local',password: 'Test1234!',  role: 'accountant', fullName: 'Chief Accountant' },
    { email: 'sales@erp.local',     password: 'Test1234!',  role: 'sales',      fullName: 'Sales Rep' },
    { email: 'purchase@erp.local',  password: 'Test1234!',  role: 'purchase',   fullName: 'Purchase Officer' },
    { email: 'warehouse@erp.local', password: 'Test1234!',  role: 'warehouse',  fullName: 'Warehouse Keeper' },
    { email: 'viewer@erp.local',    password: 'Test1234!',  role: 'viewer',     fullName: 'View Only User' },
  ] as const;

  for (const u of roles) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await db.insert(users).values({ email: u.email, passwordHash, role: u.role, fullName: u.fullName })
      .onConflictDoNothing();
  }

  // Sequences — document number series
  const seqData = [
    { module: 'journal_entry',     prefix: 'JE',      nextValue: 1, padLength: 5 },
    { module: 'sales_order',       prefix: 'SO',      nextValue: 1, padLength: 5 },
    { module: 'purchase_order',    prefix: 'PO',      nextValue: 1, padLength: 5 },
    { module: 'goods_receipt',     prefix: 'GRN',     nextValue: 1, padLength: 5 },
    { module: 'delivery',          prefix: 'DEL',     nextValue: 1, padLength: 5 },
    { module: 'sales_invoice',     prefix: 'INV',     nextValue: 1, padLength: 5 },
    { module: 'supplier_invoice',  prefix: 'SINV',    nextValue: 1, padLength: 5 },
    { module: 'supplier_payment',  prefix: 'PAY',     nextValue: 1, padLength: 5 },
    { module: 'customer_receipt',  prefix: 'REC',     nextValue: 1, padLength: 5 },
    { module: 'payroll_run',       prefix: 'PAY-RUN', nextValue: 1, padLength: 5 },
    { module: 'employee',          prefix: 'EMP',     nextValue: 1, padLength: 5 },
    { module: 'asset',             prefix: 'AST',     nextValue: 1, padLength: 5 },
    { module: 'zatca_invoice_counter', prefix: 'ZATCA', nextValue: 1, padLength: 10 },
  ];

  for (const s of seqData) {
    await db.insert(sequences).values(s).onConflictDoNothing();
  }

  // Company settings
  await db.insert(companySettings).values([
    { key: 'company_name_en',     value: '"Sara Advanced Trading Company"' },
    { key: 'company_name_ar',     value: '"شركة سارة للتجارة المتقدمة"' },
    { key: 'company_vat_number',  value: '"310122393500003"' },
    { key: 'base_currency',       value: '"SAR"' },
    { key: 'fiscal_year_start',   value: '"01-01"' },
    { key: 'city_en',             value: '"Khamis Mushait"' },
    { key: 'city_ar',             value: '"خميس مشيط"' },
    { key: 'country_code',        value: '"SA"' },
    { key: 'zatca_previous_hash', value: '"NWZlY2ViNjZmZmM2ZWYwY2I3MzA5ZDJhN2E4ODRlOWQ4NmU5NzUyZTMwNDQ3YWI3NTJkMDQ1OGRiZWQ5Yg=="' },
  ]).onConflictDoNothing();

  console.log('Core seed complete.');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
