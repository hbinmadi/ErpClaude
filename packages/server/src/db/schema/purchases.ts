import {
  pgTable, serial, text, boolean, integer, decimal,
  timestamp, date, pgEnum
} from 'drizzle-orm/pg-core';

export const poStatusEnum = pgEnum('po_status', [
  'draft', 'sent', 'partial', 'received', 'closed', 'cancelled'
]);

export const grnStatusEnum = pgEnum('grn_status', ['draft', 'posted']);

export const purchaseOrders = pgTable('purchase_orders', {
  id: serial('id').primaryKey(),
  poNumber: text('po_number').notNull().unique(),
  supplierId: integer('supplier_id').notNull(),
  warehouseId: integer('warehouse_id').notNull(),
  orderDate: date('order_date').notNull(),
  expectedDate: date('expected_date'),
  status: poStatusEnum('status').notNull().default('draft'),
  currency: text('currency').notNull().default('SAR'),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }).notNull().default('1'),
  subtotal: integer('subtotal').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  notes: text('notes'),
  createdBy: integer('created_by').notNull(),
  approvedBy: integer('approved_by'),
  approvedAt: timestamp('approved_at'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: serial('id').primaryKey(),
  poId: integer('po_id').notNull().references(() => purchaseOrders.id),
  productId: integer('product_id').notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost: integer('unit_cost').notNull(),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('15.00'),
  lineTotal: integer('line_total').notNull(),
  quantityReceived: decimal('quantity_received', { precision: 12, scale: 3 }).notNull().default('0'),
});

export const goodsReceipts = pgTable('goods_receipts', {
  id: serial('id').primaryKey(),
  grnNumber: text('grn_number').notNull().unique(),
  poId: integer('po_id').notNull().references(() => purchaseOrders.id),
  supplierId: integer('supplier_id').notNull(),
  warehouseId: integer('warehouse_id').notNull(),
  receiptDate: date('receipt_date').notNull(),
  status: grnStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  journalEntryId: integer('journal_entry_id'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});

export const goodsReceiptLines = pgTable('goods_receipt_lines', {
  id: serial('id').primaryKey(),
  grnId: integer('grn_id').notNull().references(() => goodsReceipts.id),
  poLineId: integer('po_line_id').notNull().references(() => purchaseOrderLines.id),
  productId: integer('product_id').notNull(),
  quantityReceived: decimal('quantity_received', { precision: 12, scale: 3 }).notNull(),
  unitCost: integer('unit_cost').notNull(),
});
