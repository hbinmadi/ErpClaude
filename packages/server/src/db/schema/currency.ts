import { pgTable, serial, text, boolean, integer, decimal, date, timestamp } from 'drizzle-orm/pg-core';

export const currencies = pgTable('currencies', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),        // SAR, USD, EUR
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  decimalPlaces: integer('decimal_places').notNull().default(2),
  isBaseCurrency: boolean('is_base_currency').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
});

export const exchangeRates = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  fromCurrency: text('from_currency').notNull(),
  toCurrency: text('to_currency').notNull(),
  rate: decimal('rate', { precision: 18, scale: 6 }).notNull(),
  rateDate: date('rate_date').notNull(),
  rateType: text('rate_type').notNull().default('spot'),
  source: text('source'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
