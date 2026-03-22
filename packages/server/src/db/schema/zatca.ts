import { pgTable, serial, text, boolean, integer, timestamp, date, pgEnum } from 'drizzle-orm/pg-core';

export const zatcaStatusEnum = pgEnum('zatca_status', [
  'pending', 'submitted', 'cleared', 'reported', 'rejected', 'error'
]);

export const zatcaInvoiceTypeEnum = pgEnum('zatca_invoice_type', [
  'standard',   // B2B — clearance required
  'simplified', // B2C — reporting required
]);

export const zatcaInvoices = pgTable('zatca_invoices', {
  id: serial('id').primaryKey(),
  salesInvoiceId: integer('sales_invoice_id').notNull().unique(),
  invoiceType: zatcaInvoiceTypeEnum('invoice_type').notNull(),
  invoiceCounterValue: integer('invoice_counter_value').notNull(),
  previousInvoiceHash: text('previous_invoice_hash').notNull(),
  invoiceHash: text('invoice_hash').notNull(),
  xmlContent: text('xml_content').notNull(),
  xmlSigned: text('xml_signed'),
  qrCodeBase64: text('qr_code_base64'),
  status: zatcaStatusEnum('status').notNull().default('pending'),
  zatcaUUID: text('zatca_uuid'),
  clearanceStatus: text('clearance_status'),
  responsePayload: text('response_payload'),
  retryCount: integer('retry_count').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  nextRetryAt: timestamp('next_retry_at'),
  clearedAt: timestamp('cleared_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const zatcaCertificates = pgTable('zatca_certificates', {
  id: serial('id').primaryKey(),
  environment: text('environment').notNull().default('sandbox'),
  serialNumber: text('serial_number').notNull(),
  pem: text('pem').notNull(),
  privateKeyPem: text('private_key_pem').notNull(),
  commonName: text('common_name'),
  organizationName: text('organization_name'),
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
