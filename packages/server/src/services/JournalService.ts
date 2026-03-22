import { db } from '../db';
import { sql, eq, and, lte, gte } from 'drizzle-orm';
import {
  journalEntries, journalLines, accountingPeriods, accounts
} from '../db/schema';
import { SequenceService } from './SequenceService';

export interface JournalLineInput {
  accountId: number;
  debitAmount: number;   // halalas — use 0, never null
  creditAmount: number;  // halalas — use 0, never null
  description?: string;
  costCenterId?: number;
  projectId?: number;
  amountBaseCurrency?: number;
  exchangeRateUsed?: number;
}

export interface JournalEntryInput {
  entryDate: Date;
  description: string;
  reference?: string;
  sourceModule?: string;
  sourceId?: number;
  lines: JournalLineInput[];
  createdBy: number;
}

export class JournalService {
  /** Validate debit === credit. Throws HTTP 400 if not. */
  static validateBalance(lines: JournalLineInput[]): void {
    const totalDebit = lines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = lines.reduce((s, l) => s + l.creditAmount, 0);
    if (totalDebit !== totalCredit) {
      throw Object.assign(
        new Error(`Journal not balanced: debit ${totalDebit} ≠ credit ${totalCredit}`),
        { status: 400 }
      );
    }
    if (totalDebit === 0) {
      throw Object.assign(new Error('Journal entry cannot be zero'), { status: 400 });
    }
  }

  /** Validate no line posts to a control account (manual journals only). */
  static async checkControlAccounts(
    lines: JournalLineInput[],
    sourceModule: string,
    tx: typeof db
  ): Promise<void> {
    if (sourceModule !== 'manual') return;
    for (const line of lines) {
      const [acc] = await tx
        .select({ isControl: accounts.isControlAccount })
        .from(accounts)
        .where(eq(accounts.id, line.accountId));
      if (acc?.isControl) {
        throw Object.assign(
          new Error(`Account ${line.accountId} is a control account — manual posting not allowed`),
          { status: 400 }
        );
      }
    }
  }

  /** Find open accounting period for a date. Throws if period is closed or missing. */
  static async findOpenPeriod(date: Date, tx: typeof db): Promise<number> {
    const dateStr = date.toISOString().split('T')[0];
    const [period] = await tx
      .select()
      .from(accountingPeriods)
      .where(
        and(
          lte(accountingPeriods.startDate, dateStr),
          gte(accountingPeriods.endDate, dateStr)
        )
      );

    if (!period) {
      throw Object.assign(
        new Error(`No accounting period found for date ${dateStr}`),
        { status: 422 }
      );
    }
    if (period.isClosed) {
      throw Object.assign(
        new Error(`Accounting period for ${dateStr} is closed`),
        { status: 422 }
      );
    }
    return period.id;
  }

  /** Create a draft journal entry (not posted). Returns entry id. */
  static async create(data: JournalEntryInput, tx?: typeof db): Promise<number> {
    const runner = tx ?? db;
    return runner.transaction(async (trx) => {
      this.validateBalance(data.lines);
      await this.checkControlAccounts(data.lines, data.sourceModule ?? 'manual', trx);

      const periodId = await this.findOpenPeriod(data.entryDate, trx);
      const entryNumber = await SequenceService.nextVal('journal_entry', trx);

      const [entry] = await trx
        .insert(journalEntries)
        .values({
          entryNumber,
          entryDate: data.entryDate.toISOString().split('T')[0],
          accountingPeriodId: periodId,
          reference: data.reference,
          description: data.description,
          sourceModule: (data.sourceModule ?? 'manual') as any,
          sourceId: data.sourceId,
          isPosted: false,
          createdBy: data.createdBy,
        })
        .returning({ id: journalEntries.id });

      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        await trx.insert(journalLines).values({
          journalEntryId: entry.id,
          lineNumber: i + 1,
          accountId: line.accountId,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          description: line.description,
          costCenterId: line.costCenterId,
          projectId: line.projectId,
          amountBaseCurrency: line.amountBaseCurrency,
          exchangeRateUsed: line.exchangeRateUsed?.toString(),
        });
      }

      return entry.id;
    });
  }

  /**
   * Post a journal entry.
   * Validates balance, checks period, marks posted, refreshes materialised view.
   */
  static async post(entryId: number, userId: number, tx?: typeof db): Promise<void> {
    const runner = tx ?? db;
    await runner.transaction(async (trx) => {
      const [entry] = await trx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, entryId));

      if (!entry) throw Object.assign(new Error('Journal entry not found'), { status: 404 });
      if (entry.isPosted) throw Object.assign(new Error('Already posted'), { status: 409 });

      const lines = await trx
        .select()
        .from(journalLines)
        .where(eq(journalLines.journalEntryId, entryId));

      this.validateBalance(lines.map(l => ({
        accountId: l.accountId,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
      })));

      await this.findOpenPeriod(new Date(entry.entryDate), trx);

      await trx
        .update(journalEntries)
        .set({ isPosted: true, postedBy: userId, postedAt: new Date() })
        .where(eq(journalEntries.id, entryId));
    });

    // Refresh materialised view outside transaction (CONCURRENTLY cannot run inside one)
    await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances`);
  }

  /**
   * Reverse a posted journal entry.
   * Creates mirror entry with debits/credits swapped.
   */
  static async reverse(
    entryId: number,
    userId: number,
    reason: string
  ): Promise<number> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, entryId));

    if (!entry) throw Object.assign(new Error('Journal entry not found'), { status: 404 });
    if (!entry.isPosted) throw Object.assign(new Error('Cannot reverse unposted entry'), { status: 409 });
    if (entry.isReversed) throw Object.assign(new Error('Already reversed'), { status: 409 });

    const lines = await db
      .select()
      .from(journalLines)
      .where(eq(journalLines.journalEntryId, entryId));

    // Create mirror entry
    const reversalId = await this.create({
      entryDate: new Date(),
      description: `Reversal of ${entry.entryNumber}: ${reason}`,
      reference: entry.entryNumber,
      sourceModule: entry.sourceModule as any,
      createdBy: userId,
      lines: lines.map(l => ({
        accountId: l.accountId,
        debitAmount: l.creditAmount,   // swap
        creditAmount: l.debitAmount,   // swap
        description: l.description ?? undefined,
        costCenterId: l.costCenterId ?? undefined,
        projectId: l.projectId ?? undefined,
      })),
    });

    await this.post(reversalId, userId);

    // Mark original as reversed
    await db
      .update(journalEntries)
      .set({ isReversed: true })
      .where(eq(journalEntries.id, entryId));

    return reversalId;
  }

  /**
   * Create + post in one call. Used by other services.
   * Returns the new entry id.
   */
  static async createAndPost(data: JournalEntryInput): Promise<number> {
    const entryId = await this.create(data);
    await this.post(entryId, data.createdBy);
    return entryId;
  }
}
