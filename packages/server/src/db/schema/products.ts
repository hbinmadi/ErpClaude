import {
  pgTable, serial, text, boolean, timestamp, integer,
  decimal, pgEnum
} from 'drizzle-orm/pg-core';

export const productTypeEnum = pgEnum('product_type', ['inventory', 'service', 'expense']);

export const movementTypeEnum = pgEnum('movement_type', [
  'receipt', 'shipment', 'adjustment', 'transfer_in', 'transfer_out', 'opening'
]);

export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  parentId: integer('parent_id'),
  description: text('description'),
});

export const unitsOfMeasure = pgTable('units_of_measure', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation').notNull(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  productCategoryId: integer('product_category_id').references(() => productCategories.id),
  unitOfMeasureId: integer('unit_of_measure_id').references(() => unitsOfMeasure.id),
  productType: productTypeEnum('product_type').notNull().default('inventory'),
  purchasePrice: integer('purchase_price').notNull().default(0),
  salesPrice: integer('sales_price').notNull().default(0),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('15.00'),
  inventoryAccountId: integer('inventory_account_id'),
  cogsAccountId: integer('cogs_account_id'),
  revenueAccountId: integer('revenue_account_id'),
  reorderPoint: decimal('reorder_point', { precision: 12, scale: 3 }),
  reorderQty: decimal('reorder_qty', { precision: 12, scale: 3 }),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const warehouses = pgTable('warehouses', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  address: text('address'),
  isDefault: boolean('is_default').notNull().default(false),
});

export const inventoryLocations = pgTable('inventory_locations', {
  id: serial('id').primaryKey(),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  name: text('name').notNull(),
});

export const inventoryBalances = pgTable('inventory_balances', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  quantityOnHand: decimal('quantity_on_hand', { precision: 12, scale: 3 }).notNull().default('0'),
  quantityReserved: decimal('quantity_reserved', { precision: 12, scale: 3 }).notNull().default('0'),
  quantityOnOrder: decimal('quantity_on_order', { precision: 12, scale: 3 }).notNull().default('0'),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  warehouseId: integer('warehouse_id').notNull().references(() => warehouses.id),
  movementType: movementTypeEnum('movement_type').notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost: integer('unit_cost').notNull().default(0),
  referenceType: text('reference_type'),
  referenceId: integer('reference_id'),
  journalEntryId: integer('journal_entry_id'),
  movedAt: timestamp('moved_at').defaultNow().notNull(),
  movedBy: integer('moved_by').notNull(),
});
