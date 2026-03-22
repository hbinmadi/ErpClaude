import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name'),
  email: text('email'),
  phone: text('phone'),
  // ── ZATCA / Tax ──────────────────────────────────────────────────────────────
  taxId: text('tax_id'),                         // VAT registration (15-digit, starts with 3) — present = B2B
  crNumber: text('cr_number'),                   // Commercial Registration Number
  // ── ZATCA Structured Address (required for B2B standard invoices) ─────────
  streetName: text('street_name'),
  buildingNumber: text('building_number'),
  additionalNumber: text('additional_number'),   // Additional address number
  district: text('district'),                    // Neighbourhood / district
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').notNull().default('SA'),
  // ── Other ────────────────────────────────────────────────────────────────────
  billingAddress: text('billing_address'),       // Legacy free-text (kept for compatibility)
  shippingAddress: text('shipping_address'),
  currency: text('currency').notNull().default('SAR'),
  creditLimit: integer('credit_limit').notNull().default(0),
  paymentTermsDays: integer('payment_terms_days').notNull().default(30),
  arAccountId: integer('ar_account_id'),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const customerContacts = pgTable('customer_contacts', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id),
  name: text('name').notNull(),
  role: text('role'),
  email: text('email'),
  phone: text('phone'),
  isPrimary: boolean('is_primary').notNull().default(false),
});
