import { db } from '../../db';
import { zatcaInvoices } from '../../db/schema';
import { lte, and, inArray } from 'drizzle-orm';
import { submitInvoice } from './ZatcaService';

let retryTimer: ReturnType<typeof setInterval> | null = null;

export function startRetryJob(): void {
  if (retryTimer) return;

  const intervalMs = Number(process.env.ZATCA_RETRY_INTERVAL_MS ?? 300_000);
  console.log(`ZATCA retry job started — interval ${intervalMs / 1000}s`);

  retryTimer = setInterval(async () => {
    try {
      const now = new Date();

      const pending = await db
        .select({ id: zatcaInvoices.id })
        .from(zatcaInvoices)
        .where(
          and(
            inArray(zatcaInvoices.status, ['pending', 'error']),
            lte(zatcaInvoices.nextRetryAt, now)
          )
        )
        .limit(10);

      if (pending.length === 0) return;

      console.log(`ZATCA retry: processing ${pending.length} invoice(s)`);

      for (const { id } of pending) {
        try {
          await submitInvoice(id);
        } catch (err: any) {
          console.error(`ZATCA retry failed for invoice ${id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error('ZATCA retry job error:', err.message);
    }
  }, intervalMs);
}

export function stopRetryJob(): void {
  if (retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}
