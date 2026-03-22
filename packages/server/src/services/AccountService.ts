import { db } from '../db';
import { accounts } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export class AccountService {
  static async list() {
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.isDeleted, false))
      .orderBy(asc(accounts.code));
  }

  static async tree() {
    const all = await this.list();
    const byId = new Map(all.map(a => [a.id, { ...a, children: [] as any[] }]));
    const roots: any[] = [];
    for (const a of byId.values()) {
      if (a.parentAccountId && byId.has(a.parentAccountId)) {
        byId.get(a.parentAccountId)!.children.push(a);
      } else {
        roots.push(a);
      }
    }
    return roots;
  }

  static async getById(id: number) {
    const [acc] = await db.select().from(accounts).where(eq(accounts.id, id));
    return acc ?? null;
  }

  static async create(data: {
    code: string;
    name: string;
    accountTypeId: number;
    parentAccountId?: number;
    isControlAccount?: boolean;
    isBankAccount?: boolean;
    currency?: string;
    description?: string;
    createdBy: number;
  }) {
    const [acc] = await db.insert(accounts).values({
      ...data,
      currency: data.currency ?? 'SAR',
    }).returning();
    return acc;
  }

  static async update(id: number, data: Partial<typeof accounts.$inferInsert>, userId: number) {
    const [acc] = await db
      .update(accounts)
      .set({ ...data, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.isDeleted, false)))
      .returning();
    return acc ?? null;
  }

  static async softDelete(id: number, userId: number) {
    await db
      .update(accounts)
      .set({ isDeleted: true, updatedBy: userId, updatedAt: new Date() })
      .where(eq(accounts.id, id));
  }

  /** Running balance for an account between two dates */
  static async ledger(accountId: number, dateFrom: string, dateTo: string) {
    const result = await db.execute(sql`
      SELECT
        je.entry_date,
        je.entry_number,
        je.description,
        jl.debit_amount,
        jl.credit_amount,
        SUM(jl.debit_amount - jl.credit_amount)
          OVER (ORDER BY je.entry_date, je.id) AS running_balance
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE jl.account_id = ${accountId}
        AND je.is_posted = true
        AND je.entry_date BETWEEN ${dateFrom} AND ${dateTo}
      ORDER BY je.entry_date, je.id
    `);
    return result.rows;
  }
}
