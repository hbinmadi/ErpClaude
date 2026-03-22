import { db } from '../db';
import { sql } from 'drizzle-orm';

export class SequenceService {
  /**
   * Get next document number for a module.
   * MUST be called inside a transaction — uses SELECT FOR UPDATE.
   * @example nextVal('sales_order', tx) → 'SO-00001'
   */
  static async nextVal(module: string, tx: typeof db): Promise<string> {
    const result = await tx.execute(
      sql`SELECT id, prefix, next_value, pad_length
          FROM sequences
          WHERE module = ${module}
          FOR UPDATE`
    );

    if (result.rows.length === 0) {
      throw new Error(`Sequence not found for module: ${module}`);
    }

    const row = result.rows[0] as {
      id: number;
      prefix: string;
      next_value: number;
      pad_length: number;
    };

    await tx.execute(
      sql`UPDATE sequences SET next_value = next_value + 1 WHERE id = ${row.id}`
    );

    const padded = String(row.next_value).padStart(row.pad_length, '0');
    return `${row.prefix}-${padded}`;
  }
}
