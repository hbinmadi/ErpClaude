import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  // ── ZATCA / Tax ──────────────────────────────────────────────────────────────
  taxId: text('tax_id'),                        // VAT registration (15-digit, starts with 3)
  crNumber: text('cr_number'),                  // Commercial Registration Number
  // ── ZATCA Structured Address ──────────────────────────────────────────────────
  streetName: text('street_name'),
  buildingNumber: text('building_number'),
  additionalNumber: text('additional_number'),
  district: text('district'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').notNull().default('SA'),
  // ── Legacy / Banking ─────────────────────────────────────────────────────────
  address: text('address'),                     // kept for compatibility
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  bankIban: text('bank_iban'),
  currency: text('currency').notNull().default('SAR'),
  paymentTermsDays: integer('payment_terms_days').notNull().default(30),
  apAccountId: integer('ap_account_id'),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const supplierContacts = pgTable('supplier_contacts', {
  id: serial('id').primaryKey(),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  name: text('name').notNull(),
  role: text('role'),
  email: text('email'),
  phone: text('phone'),
  isPrimary: boolean('is_primary').notNull().default(false),
});
