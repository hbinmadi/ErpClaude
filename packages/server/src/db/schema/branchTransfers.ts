import {
  pgTable, serial, text, integer, decimal,
  timestamp, date, boolean, pgEnum, unique
} from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { products } from './products';

export const transferStatusEnum = pgEnum('transfer_status', [
  'draft', 'confirmed', 'cancelled'
]);

export const branchTransfers = pgTable('branch_transfers', {
  id: serial('id').primaryKey(),
  transferNumber: text('transfer_number').notNull().unique(),
  fromBranchId: integer('from_branch_id').notNull().references(() => branches.id),
  toBranchId: integer('to_branch_id').notNull().references(() => branches.id),
  transferDate: date('transfer_date').notNull(),
  status: transferStatusEnum('status').notNull().default('draft'),
  notes: text('notes'),
  confirmedAt: timestamp('confirmed_at'),
  confirmedBy: integer('confirmed_by'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: integer('created_by').notNull(),
});

export const branchTransferLines = pgTable('branch_transfer_lines', {
  id: serial('id').primaryKey(),
  transferId: integer('transfer_id').notNull().references(() => branchTransfers.id),
  productId: integer('product_id').notNull().references(() => products.id),
  description: text('description'),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
  unitCost: integer('unit_cost').notNull().default(0),  // halalas
  lineTotal: integer('line_total').notNull().default(0),
});
