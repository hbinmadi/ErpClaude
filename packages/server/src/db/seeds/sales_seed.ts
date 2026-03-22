import 'dotenv/config';
import { db, pool } from '../../db';
import { customers } from '../schema';

export async function seedSales() {
  await db.insert(customers).values([
    { code: 'CUS001', companyName: 'Aramco Digital',    email: 'purchase@aramcodigital.sa', taxId: '300000000100003', creditLimit: 50000000, paymentTermsDays: 30 },
    { code: 'CUS002', companyName: 'STC Solutions',     email: 'orders@stcsolutions.sa',    taxId: '300000000200003', creditLimit: 30000000, paymentTermsDays: 45 },
    { code: 'CUS003', companyName: 'SABIC Procurement', email: 'vendor@sabic.sa',           taxId: '300000000300003', creditLimit: 80000000, paymentTermsDays: 60 },
    { code: 'CUS004', companyName: 'Al-Rajhi Tech',     email: 'tech@alrajhi.sa',           taxId: '300000000400003', creditLimit: 20000000, paymentTermsDays: 30 },
    { code: 'CUS005', companyName: 'Walk-in Customer',  email: null,                        taxId: null,              creditLimit: 0,         paymentTermsDays: 0 },
  ]).onConflictDoNothing();

  console.log('Sales seed complete.');
}

seedSales().then(() => pool.end()).catch(err => { console.error(err); process.exit(1); });
