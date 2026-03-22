import {
  pgTable, serial, text, boolean, integer, decimal,
  timestamp, date, pgEnum
} from 'drizzle-orm/pg-core';

export const soStatusEnum = pgEnum('so_status', [
  'draft', 'confirmed', 'partial', 'shipped', 'invoiced', 'closed', 'cancelled'
]);

export const deliveryStatusEnum = pgEnum('delivery_status', ['draft', 'posted']);

export const salesOrders = pgTable('sales_orders', {
  id: serial('id').primaryKey(),
  soNumber: text('so_number').notNull().unique(),
  customerId: integer('customer_id').notNull(),
  warehouseId: integer('warehouse_id').notNull(),
  orderDate: date('order_date').notNull(),
  expectedDate: date('expected_date'),
  status: soStatusEnum('status').notNull().default('draft'),
  currency: text('currency').notNull().default('SAR'),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }).notNull().default('1'),
  subtotal: integer('subtotal').notNull().default(0),
  discountAmount: integer('discount_amount').notNull().default(0),
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

export const salesOrderLines = pgTable('sales_order_lines', {
  id: serial('id').primaryKey(),
  soId: integer('so_id').notNull().references(() => salesOrders.id),
  productId: integer('product_id').notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitPrice: integer('unit_price').notNull(),
  discountPct: decimal('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('15.00'),
  lineTotal: integer('line_total').notNull(),
  quantityShipped: decimal('quantity_shipped', { precision: 12, scale: 3 }).notNull().default('0'),
});

export const deliveries = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  deliveryNumber: text('delivery_number').notNull().unique(),
  soId: integer('so_id').notNull().references(() => salesOrders.id),
  customerId: integer('customer_id').notNull(),
  warehouseId: integer('warehouse_id').notNull(),
  deliveryDate: date('delivery_date').notNull(),
  status: deliveryStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  journalEntryId: integer('journal_entry_id'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});

export const deliveryLines = pgTable('delivery_lines', {
  id: serial('id').primaryKey(),
  deliveryId: integer('delivery_id').notNull().references(() => deliveries.id),
  soLineId: integer('so_line_id').notNull().references(() => salesOrderLines.id),
  productId: integer('product_id').notNull(),
  quantityShipped: decimal('quantity_shipped', { precision: 12, scale: 3 }).notNull(),
  unitCost: integer('unit_cost').notNull(),       // weighted average cost at time of shipment
});
