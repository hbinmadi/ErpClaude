import { pgTable, serial, text, boolean, timestamp, integer, date, decimal, pgEnum } from 'drizzle-orm/pg-core';

export const sourceModuleEnum = pgEnum('source_module', [
  'manual', 'sales', 'purchase', 'payment', 'receipt',
  'inventory', 'payroll', 'depreciation'
]);

export const fiscalYears = pgTable('fiscal_years', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isClosed: boolean('is_closed').notNull().default(false),
  closedAt: timestamp('closed_at'),
  closedBy: integer('closed_by'),
});

export const accountingPeriods = pgTable('accounting_periods', {
  id: serial('id').primaryKey(),
  fiscalYearId: integer('fiscal_year_id').notNull().references(() => fiscalYears.id),
  periodNumber: integer('period_number').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isClosed: boolean('is_closed').notNull().default(false),
});

export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  entryNumber: text('entry_number').notNull().unique(),  // JE-00001
  entryDate: date('entry_date').notNull(),
  accountingPeriodId: integer('accounting_period_id').notNull().references(() => accountingPeriods.id),
  reference: text('reference'),
  description: text('description').notNull(),
  sourceModule: sourceModuleEnum('source_module').notNull().default('manual'),
  sourceId: integer('source_id'),
  isPosted: boolean('is_posted').notNull().default(false),
  isReversed: boolean('is_reversed').notNull().default(false),
  reversalOfId: integer('reversal_of_id'),
  createdBy: integer('created_by').notNull(),
  postedBy: integer('posted_by'),
  postedAt: timestamp('posted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const journalLines = pgTable('journal_lines', {
  id: serial('id').primaryKey(),
  journalEntryId: integer('journal_entry_id').notNull().references(() => journalEntries.id),
  lineNumber: integer('line_number').notNull(),
  accountId: integer('account_id').notNull(),
  debitAmount: integer('debit_amount').notNull().default(0),   // halalas, never NULL
  creditAmount: integer('credit_amount').notNull().default(0), // halalas, never NULL
  description: text('description'),
  costCenterId: integer('cost_center_id'),
  projectId: integer('project_id'),
  amountBaseCurrency: integer('amount_base_currency'),
  exchangeRateUsed: decimal('exchange_rate_used', { precision: 18, scale: 6 }),
});
