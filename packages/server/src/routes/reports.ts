import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { toCSV } from '../services/CsvService';
import * as ReportService from '../services/ReportService';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin', 'accountant', 'viewer'));

function getDateRange(req: Request): { dateFrom: string; dateTo: string } {
  const today = new Date().toISOString().split('T')[0];
  const firstOfYear = `${new Date().getFullYear()}-01-01`;
  return {
    dateFrom: (req.query.date_from as string) || firstOfYear,
    dateTo:   (req.query.date_to   as string) || today,
  };
}

function sendReport(res: Response, data: unknown, filename: string, format: string) {
  if (format === 'csv') {
    const rows = Array.isArray(data) ? data : [data];
    const csv = toCSV(rows as Record<string, unknown>[]);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csv);
  }
  res.json({ data });
}

// ── Trial Balance ──────────────────────────────────────────────────
router.get('/trial-balance', async (req, res) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    const data = await ReportService.getTrialBalance(dateFrom, dateTo);
    sendReport(res, data, `trial-balance-${dateTo}`, req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── P&L ───────────────────────────────────────────────────────────
router.get('/profit-and-loss', async (req, res) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    const data = await ReportService.getProfitAndLoss(dateFrom, dateTo);
    sendReport(res, data, `profit-loss-${dateTo}`, req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── Balance Sheet ──────────────────────────────────────────────────
router.get('/balance-sheet', async (req, res) => {
  try {
    const asOfDate = (req.query.as_of_date as string) || new Date().toISOString().split('T')[0];
    const data = await ReportService.getBalanceSheet(asOfDate);
    sendReport(res, data, `balance-sheet-${asOfDate}`, req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── AR Ageing ──────────────────────────────────────────────────────
router.get('/ar-ageing', async (req, res) => {
  try {
    const asOfDate = (req.query.as_of_date as string) || new Date().toISOString().split('T')[0];
    const data = await ReportService.getARAgeing(asOfDate);
    sendReport(res, data, `ar-ageing-${asOfDate}`, req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── AP Ageing ──────────────────────────────────────────────────────
router.get('/ap-ageing', async (req, res) => {
  try {
    const asOfDate = (req.query.as_of_date as string) || new Date().toISOString().split('T')[0];
    const data = await ReportService.getAPAgeing(asOfDate);
    sendReport(res, data, `ap-ageing-${asOfDate}`, req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── Inventory Valuation ────────────────────────────────────────────
router.get('/inventory-valuation', async (req, res) => {
  try {
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : undefined;
    const data = await ReportService.getInventoryValuation(warehouseId);
    sendReport(res, data, 'inventory-valuation', req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── Payroll Summary ────────────────────────────────────────────────
router.get('/payroll-summary', async (req, res) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    const data = await ReportService.getPayrollSummary(dateFrom, dateTo);
    sendReport(res, data, `payroll-summary-${dateTo}`, req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── Cash Flow ──────────────────────────────────────────────────────
router.get('/cash-flow', async (req, res) => {
  try {
    const { dateFrom, dateTo } = getDateRange(req);
    const data = await ReportService.getCashFlow(dateFrom, dateTo);
    sendReport(res, data, `cash-flow-${dateTo}`, req.query.format as string);
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

// ── GL Ledger — STREAMING ───────────────────────────────────────────
router.get('/gl-ledger', async (req, res) => {
  const { dateFrom, dateTo } = getDateRange(req);
  const accountId = req.query.account_id ? Number(req.query.account_id) : null;
  const format = req.query.format as string;

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gl-ledger-${dateTo}.csv"`);
    res.write('entry_date,entry_number,account_code,account_name,description,debit,credit,running_balance\r\n');
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.write('{"data":[');
  }

  try {
    const result = await db.execute(sql`
      SELECT
        je.entry_date,
        je.entry_number,
        a.code  AS account_code,
        a.name  AS account_name,
        COALESCE(jl.description, je.description) AS description,
        jl.debit_amount,
        jl.credit_amount,
        SUM(jl.debit_amount - jl.credit_amount)
          OVER (PARTITION BY jl.account_id ORDER BY je.entry_date, je.id) AS running_balance
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN accounts a ON a.id = jl.account_id
      WHERE je.is_posted = true
        AND je.entry_date BETWEEN ${dateFrom} AND ${dateTo}
        ${accountId ? sql`AND jl.account_id = ${accountId}` : sql``}
      ORDER BY je.entry_date, je.id, jl.line_number
    `);

    const rows = result.rows as Array<Record<string, unknown>>;

    if (format === 'csv') {
      for (const row of rows) {
        res.write(
          [
            row.entry_date, row.entry_number, row.account_code, row.account_name,
            `"${String(row.description ?? '').replace(/"/g, '""')}"`,
            row.debit_amount, row.credit_amount, row.running_balance,
          ].join(',') + '\r\n'
        );
      }
    } else {
      res.write(rows.map((r, i) => (i > 0 ? ',' : '') + JSON.stringify(r)).join(''));
      res.write(`],"meta":{"total":${rows.length},"date_from":"${dateFrom}","date_to":"${dateTo}"}}`);
    }
  } catch (err: any) {
    if (format !== 'csv') res.write(`],"error":"${err.message}"}`);
  } finally {
    res.end();
  }
});

// ── Dashboard KPIs ─────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = `${today.slice(0, 7)}-01`;

    const [revenue, arTotal, apTotal, cashBalance, overdueAR] = await Promise.all([
      db.execute(sql`
        SELECT COALESCE(SUM(si.total_amount), 0) AS total
        FROM sales_invoices si
        WHERE si.status = 'posted'
          AND si.invoice_date BETWEEN ${firstOfMonth} AND ${today}
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount_due), 0) AS total
        FROM sales_invoices WHERE status NOT IN ('paid','cancelled') AND is_deleted = false
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount_due), 0) AS total
        FROM supplier_invoices WHERE status NOT IN ('paid','cancelled') AND is_deleted = false
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(jl.debit_amount - jl.credit_amount), 0) AS total
        FROM journal_lines jl
        JOIN journal_entries je ON je.id = jl.journal_entry_id AND je.is_posted = true
        JOIN accounts a ON a.id = jl.account_id
        WHERE a.is_bank_account = true
      `),
      db.execute(sql`
        SELECT COALESCE(SUM(amount_due), 0) AS total
        FROM sales_invoices
        WHERE status NOT IN ('paid','cancelled')
          AND due_date < ${today}
          AND is_deleted = false
      `),
    ]);

    res.json({
      data: {
        revenueThisMonth:    Number((revenue.rows[0] as any).total),
        totalAROutstanding:  Number((arTotal.rows[0] as any).total),
        totalAPOutstanding:  Number((apTotal.rows[0] as any).total),
        cashBalance:         Number((cashBalance.rows[0] as any).total),
        overdueAR:           Number((overdueAR.rows[0] as any).total),
        asOf: today,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'REPORT_ERROR', message: err.message });
  }
});

export default router;
