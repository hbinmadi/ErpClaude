import {
  pgTable, serial, text, boolean, integer, decimal,
  timestamp, date, pgEnum
} from 'drizzle-orm/pg-core';

export const supplierInvoiceStatusEnum = pgEnum('supplier_invoice_status', [
  'draft', 'posted', 'partial', 'paid', 'overdue', 'cancelled'
]);

export const supplierPaymentStatusEnum = pgEnum('supplier_payment_status', ['draft', 'posted']);

export const supplierInvoices = pgTable('supplier_invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  supplierInvoiceRef: text('supplier_invoice_ref'),
  supplierId: integer('supplier_id').notNull(),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date').notNull(),
  poId: integer('po_id'),
  grnId: integer('grn_id'),
  status: supplierInvoiceStatusEnum('status').notNull().default('draft'),
  subtotal: integer('subtotal').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  amountPaid: integer('amount_paid').notNull().default(0),
  amountDue: integer('amount_due').notNull().default(0),
  currency: text('currency').notNull().default('SAR'),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }).notNull().default('1'),
  journalEntryId: integer('journal_entry_id'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});

export const supplierInvoiceLines = pgTable('supplier_invoice_lines', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => supplierInvoices.id),
  productId: integer('product_id'),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost: integer('unit_cost').notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('15.00'),
  lineTotal: integer('line_total').notNull(),
});

export const supplierPayments = pgTable('supplier_payments', {
  id: serial('id').primaryKey(),
  paymentNumber: text('payment_number').notNull().unique(),
  supplierId: integer('supplier_id').notNull(),
  invoiceId: integer('invoice_id').notNull().references(() => supplierInvoices.id),
  paymentDate: date('payment_date').notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),  // bank|cash|cheque
  bankAccountId: integer('bank_account_id'),
  reference: text('reference'),
  notes: text('notes'),
  status: supplierPaymentStatusEnum('status').notNull().default('draft'),
  journalEntryId: integer('journal_entry_id'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});
