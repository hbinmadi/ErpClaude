import { db } from '../db';
import { exchangeRates } from '../db/schema';
import { eq, and, lte, desc, sql } from 'drizzle-orm';

export class FxService {
  /**
   * Convert amount from one currency to another on a given date.
   * Falls back to most recent rate. Throws if no rate within 7 days.
   * @param amount - integer (halalas/cents)
   * @returns integer in target currency
   */
  static async convert(
    amount: number,
    from: string,
    to: string,
    date: Date
  ): Promise<{ converted: number; rate: number }> {
    if (from === to) return { converted: amount, rate: 1 };

    const sevenDaysAgo = new Date(date);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = date.toISOString().split('T')[0];
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const [rateRow] = await db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.fromCurrency, from),
          eq(exchangeRates.toCurrency, to),
          lte(exchangeRates.rateDate, dateStr),
          sql`${exchangeRates.rateDate} >= ${sevenDaysAgoStr}`
        )
      )
      .orderBy(desc(exchangeRates.rateDate))
      .limit(1);

    if (!rateRow) {
      throw Object.assign(
        new Error(`No exchange rate found for ${from}→${to} within 7 days of ${dateStr}`),
        { status: 422 }
      );
    }

    const rate = Number(rateRow.rate);
    const converted = Math.round(amount * rate);
    return { converted, rate };
  }

  static async getRate(from: string, to: string, date: Date): Promise<number> {
    const { rate } = await this.convert(100, from, to, date);
    return rate;
  }
}
