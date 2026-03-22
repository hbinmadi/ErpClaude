import 'dotenv/config';
import { db, pool } from '../../db';
import { suppliers, products, productCategories, unitsOfMeasure, warehouses } from '../schema';

export async function seedPurchase() {
  // Units of measure
  await db.insert(unitsOfMeasure).values([
    { name: 'Each',   abbreviation: 'EA' },
    { name: 'Box',    abbreviation: 'BOX' },
    { name: 'Carton', abbreviation: 'CTN' },
    { name: 'Kg',     abbreviation: 'KG' },
    { name: 'Litre',  abbreviation: 'L' },
  ]).onConflictDoNothing();

  // Categories
  await db.insert(productCategories).values([
    { name: 'Electronics' },
    { name: 'Office Supplies' },
    { name: 'Services' },
  ]).onConflictDoNothing();

  // Warehouses
  await db.insert(warehouses).values([
    { name: 'Main Warehouse', code: 'MAIN', isDefault: true },
    { name: 'Secondary Warehouse', code: 'SEC' },
  ]).onConflictDoNothing();

  // Suppliers
  await db.insert(suppliers).values([
    { code: 'SUP001', companyName: 'Al-Faisaliah Trading',  email: 'orders@alfaisaliah.sa',  taxId: '310000000100003' },
    { code: 'SUP002', companyName: 'Gulf Tech Supplies',    email: 'sales@gulftech.sa',       taxId: '310000000200003' },
    { code: 'SUP003', companyName: 'Saudi Office World',    email: 'info@saudioffice.sa',     taxId: '310000000300003' },
    { code: 'SUP004', companyName: 'Eastern Distribution',  email: 'logistics@eastern.sa',    taxId: '310000000400003' },
    { code: 'SUP005', companyName: 'Riyadh Parts House',    email: 'purchase@riyadhparts.sa', taxId: '310000000500003' },
  ]).onConflictDoNothing();

  // Products (15 inventory + 5 service)
  await db.insert(products).values([
    { code: 'PRD001', name: 'HP LaserJet M404dn',      productType: 'inventory', salesPrice: 35000, purchasePrice: 28000 },
    { code: 'PRD002', name: 'Canon Pixma G3470',        productType: 'inventory', salesPrice: 12000, purchasePrice: 9000 },
    { code: 'PRD003', name: 'Dell Monitor 24"',         productType: 'inventory', salesPrice: 45000, purchasePrice: 35000 },
    { code: 'PRD004', name: 'Logitech MX Keys',         productType: 'inventory', salesPrice: 8000,  purchasePrice: 5500 },
    { code: 'PRD005', name: 'Samsung SSD 1TB',          productType: 'inventory', salesPrice: 25000, purchasePrice: 18000 },
    { code: 'PRD006', name: 'Office Chair Ergonomic',   productType: 'inventory', salesPrice: 55000, purchasePrice: 40000 },
    { code: 'PRD007', name: 'Standing Desk Adjustable', productType: 'inventory', salesPrice: 95000, purchasePrice: 70000 },
    { code: 'PRD008', name: 'A4 Paper Box (5 reams)',   productType: 'inventory', salesPrice: 2500,  purchasePrice: 1800 },
    { code: 'PRD009', name: 'Stapler Heavy Duty',       productType: 'inventory', salesPrice: 1500,  purchasePrice: 900 },
    { code: 'PRD010', name: 'Filing Cabinet 4-Drawer',  productType: 'inventory', salesPrice: 38000, purchasePrice: 28000 },
    { code: 'PRD011', name: 'UPS 1500VA',               productType: 'inventory', salesPrice: 22000, purchasePrice: 16000 },
    { code: 'PRD012', name: 'Network Switch 24-Port',   productType: 'inventory', salesPrice: 30000, purchasePrice: 22000 },
    { code: 'PRD013', name: 'Webcam 4K Logitech',       productType: 'inventory', salesPrice: 18000, purchasePrice: 13000 },
    { code: 'PRD014', name: 'Headset Jabra Evolve',     productType: 'inventory', salesPrice: 16000, purchasePrice: 12000 },
    { code: 'PRD015', name: 'Toner HP 26A',             productType: 'inventory', salesPrice: 7500,  purchasePrice: 5000 },
    { code: 'SRV001', name: 'IT Support Annual',        productType: 'service',   salesPrice: 120000, purchasePrice: 0 },
    { code: 'SRV002', name: 'Delivery & Installation',  productType: 'service',   salesPrice: 5000,   purchasePrice: 0 },
    { code: 'SRV003', name: 'Training (per day)',        productType: 'service',   salesPrice: 15000,  purchasePrice: 0 },
    { code: 'SRV004', name: 'Extended Warranty',         productType: 'service',   salesPrice: 8000,   purchasePrice: 0 },
    { code: 'SRV005', name: 'Consulting (per hour)',     productType: 'service',   salesPrice: 2000,   purchasePrice: 0 },
  ]).onConflictDoNothing();

  console.log('Purchase seed complete.');
}

seedPurchase().then(() => pool.end()).catch(err => { console.error(err); process.exit(1); });
