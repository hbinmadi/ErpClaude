import {
  pgTable, serial, text, boolean, integer, decimal,
  timestamp, date, pgEnum
} from 'drizzle-orm/pg-core';

export const salesInvoiceStatusEnum = pgEnum('sales_invoice_status', [
  'draft', 'posted', 'partial', 'paid', 'overdue', 'cancelled'
]);

export const receiptStatusEnum = pgEnum('receipt_status', ['draft', 'posted']);

export const invoiceTypeEnum = pgEnum('invoice_type', ['standard', 'simplified']);
export const paymentMeansEnum = pgEnum('payment_means', ['cash', 'bank', 'credit', 'card', 'cheque']);

export const salesInvoices = pgTable('sales_invoices', {
  id: serial('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  customerId: integer('customer_id').notNull(),
  soId: integer('so_id'),
  deliveryId: integer('delivery_id'),
  invoiceDate: date('invoice_date').notNull(),
  supplyDate: date('supply_date'),               // ZATCA: actual supply/delivery date
  dueDate: date('due_date').notNull(),
  invoiceType: invoiceTypeEnum('invoice_type').notNull().default('standard'), // B2B=standard, B2C=simplified
  paymentMeans: paymentMeansEnum('payment_means').notNull().default('credit'),
  status: salesInvoiceStatusEnum('status').notNull().default('draft'),
  subtotal: integer('subtotal').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  amountReceived: integer('amount_received').notNull().default(0),
  amountDue: integer('amount_due').notNull().default(0),
  currency: text('currency').notNull().default('SAR'),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }).notNull().default('1'),
  notes: text('notes'),
  journalEntryId: integer('journal_entry_id'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});

export const salesInvoiceLines = pgTable('sales_invoice_lines', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => salesInvoices.id),
  productId: integer('product_id'),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitPrice: integer('unit_price').notNull(),
  discountPct: decimal('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('15.00'),
  lineTotal: integer('line_total').notNull(),
});

export const customerReceipts = pgTable('customer_receipts', {
  id: serial('id').primaryKey(),
  receiptNumber: text('receipt_number').notNull().unique(),
  customerId: integer('customer_id').notNull(),
  invoiceId: integer('invoice_id').notNull().references(() => salesInvoices.id),
  receiptDate: date('receipt_date').notNull(),
  amount: integer('amount').notNull(),
  paymentMethod: text('payment_method').notNull(),  // bank|cash|cheque
  bankAccountId: integer('bank_account_id'),
  reference: text('reference'),
  notes: text('notes'),
  status: receiptStatusEnum('status').notNull().default('draft'),
  journalEntryId: integer('journal_entry_id'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});
