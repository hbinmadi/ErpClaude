import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const sequences = pgTable('sequences', {
  id: serial('id').primaryKey(),
  module: text('module').notNull().unique(),
  prefix: text('prefix').notNull(),
  nextValue: integer('next_value').notNull().default(1),
  padLength: integer('pad_length').notNull().default(5),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  action: text('action').notNull(), // INSERT | UPDATE | DELETE
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  userId: integer('user_id'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  link: text('link'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedBy: integer('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
