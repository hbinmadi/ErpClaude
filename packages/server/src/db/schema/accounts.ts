import { pgTable, serial, text, boolean, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';

export const normalBalanceEnum = pgEnum('normal_balance', ['debit', 'credit']);

export const accountTypeNameEnum = pgEnum('account_type_name', [
  'Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'COGS'
]);

export const accountTypes = pgTable('account_types', {
  id: serial('id').primaryKey(),
  name: accountTypeNameEnum('name').notNull().unique(),
  normalBalance: normalBalanceEnum('normal_balance').notNull(),
});

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  accountTypeId: integer('account_type_id').notNull().references(() => accountTypes.id),
  parentAccountId: integer('parent_account_id'),  // self-reference, set after insert
  isControlAccount: boolean('is_control_account').notNull().default(false),
  isBankAccount: boolean('is_bank_account').notNull().default(false),
  currency: text('currency').notNull().default('SAR'),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: integer('created_by'),
  updatedBy: integer('updated_by'),
});
