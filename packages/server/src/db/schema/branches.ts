import {
  pgTable, serial, text, boolean, timestamp, integer, unique
} from 'drizzle-orm/pg-core';
import { products } from './products';

export const branches = pgTable('branches', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  isHQ: boolean('is_hq').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});

export const branchProducts = pgTable('branch_products', {
  id: serial('id').primaryKey(),
  branchId: integer('branch_id').notNull().references(() => branches.id),
  productId: integer('product_id').notNull().references(() => products.id),
  costPrice: integer('cost_price').notNull().default(0),   // halalas, branch-specific override
  salesPrice: integer('sales_price').notNull().default(0), // halalas, branch-specific override
  isActive: boolean('is_active').notNull().default(true),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  uniq: unique('branch_product_uniq').on(t.branchId, t.productId),
}));
