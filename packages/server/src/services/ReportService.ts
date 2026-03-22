import { db } from '../db';
import { sql } from 'drizzle-orm';

// ─────────────────────────────────────────────
// 1. TRIAL BALANCE
// ─────────────────────────────────────────────
export async function getTrialBalance(dateFrom: string, dateTo: string) {
  const result = await db.execute(sql`
    SELECT
      a.code,
      a.name,
      at.name AS account_type,
      at.normal_balance,
      COALESCE(SUM(jl.debit_amount), 0)  AS total_debit,
      COALESCE(SUM(jl.credit_amount), 0) AS total_credit,
      COALESCE(SUM(jl.debit_amount), 0) - COALESCE(SUM(jl.credit_amount), 0) AS net_balance
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    LEFT JOIN journal_lines jl ON jl.account_id = a.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
      AND je.is_posted = true
      AND je.entry_date BETWEEN ${dateFrom} AND ${dateTo}
    WHERE a.is_deleted = false
    GROUP BY a.id, a.code, a.name, at.name, at.normal_balance
    ORDER BY a.code
  `);
  return result.rows;
}

// ─────────────────────────────────────────────
// 2. PROFIT & LOSS
// ─────────────────────────────────────────────
export async function getProfitAndLoss(dateFrom: string, dateTo: string) {
  const result = await db.execute(sql`
    SELECT
      at.name AS category,
      a.code,
      a.name AS account_name,
      COALESCE(SUM(jl.credit_amount - jl.debit_amount), 0) AS amount
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    JOIN journal_lines jl ON jl.account_id = a.id
    JOIN journal_entries je ON je.id = jl.journal_entry_id
      AND je.is_posted = true
      AND je.entry_date BETWEEN ${dateFrom} AND ${dateTo}
    WHERE at.name IN ('Revenue', 'COGS', 'Expense')
      AND a.is_deleted = false
    GROUP BY at.name, a.code, a.name
    ORDER BY at.name, a.code
  `);

  const rows = result.rows as Array<{
    category: string;
    code: string;
    account_name: string;
    amount: number;
  }>;

  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  const totalRevenue = (grouped['Revenue'] ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalCOGS    = (grouped['COGS'] ?? [])   .reduce((s, r) => s + Number(r.amount), 0);
  const grossProfit  = totalRevenue - totalCOGS;
  const totalExpense = (grouped['Expense'] ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const netProfit    = grossProfit - totalExpense;

  return {
    sections: grouped,
    totals: {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpense,
      netProfit,
    },
  };
}

// ─────────────────────────────────────────────
// 3. BALANCE SHEET
// ─────────────────────────────────────────────
export async function getBalanceSheet(asOfDate: string) {
  const result = await db.execute(sql`
    SELECT
      at.name AS category,
      a.code,
      a.name AS account_name,
      COALESCE(SUM(jl.debit_amount - jl.credit_amount), 0) AS balance
    FROM accounts a
    JOIN account_types at ON at.id = a.account_type_id
    JOIN journal_lines jl ON jl.account_id = a.id
    JOIN journal_entries je ON je.id = jl.journal_entry_id
      AND je.is_posted = true
      AND je.entry_date <= ${asOfDate}
    WHERE at.name IN ('Asset', 'Liability', 'Equity')
      AND a.is_deleted = false
    GROUP BY at.name, a.code, a.name
    ORDER BY at.name, a.code
  `);

  const rows = result.rows as Array<{
    category: string;
    code: string;
    account_name: string;
    balance: number;
  }>;

  const grouped: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(row);
  }

  const totalAssets      = (grouped['Asset'] ?? [])    .reduce((s, r) => s + Number(r.balance), 0);
  const totalLiabilities = (grouped['Liability'] ?? []).reduce((s, r) => s + Number(r.balance), 0);
  const totalEquity      = (grouped['Equity'] ?? [])   .reduce((s, r) => s + Number(r.balance), 0);

  return {
    sections: grouped,
    totals: { totalAssets, totalLiabilities, totalEquity },
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 2,
  };
}

// ─────────────────────────────────────────────
// 4. AR AGING
// ─────────────────────────────────────────────
export async function getARAgeing(asOfDate: string) {
  const result = await db.execute(sql`
    SELECT
      c.id   AS customer_id,
      c.code AS customer_code,
      c.company_name,
      si.invoice_number,
      si.invoice_date,
      si.due_date,
      si.total_amount,
      si.amount_due,
      (${asOfDate}::date - si.due_date::date) AS days_overdue
    FROM sales_invoices si
    JOIN customers c ON c.id = si.customer_id
    WHERE si.status NOT IN ('paid', 'cancelled')
      AND si.is_deleted = false
      AND si.invoice_date <= ${asOfDate}
    ORDER BY c.company_name, si.due_date
  `);

  const rows = result.rows as Array<{
    customer_id: number;
    customer_code: string;
    company_name: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    amount_due: number;
    days_overdue: number;
  }>;

  return rows.map(r => ({
    ...r,
    bracket: Number(r.days_overdue) <= 0  ? 'current'   :
             Number(r.days_overdue) <= 30 ? '1-30'      :
             Number(r.days_overdue) <= 60 ? '31-60'     :
             Number(r.days_overdue) <= 90 ? '61-90'     : '90+',
  }));
}

// ─────────────────────────────────────────────
// 5. AP AGING
// ─────────────────────────────────────────────
export async function getAPAgeing(asOfDate: string) {
  const result = await db.execute(sql`
    SELECT
      s.id   AS supplier_id,
      s.code AS supplier_code,
      s.company_name,
      si.invoice_number,
      si.invoice_date,
      si.due_date,
      si.total_amount,
      si.amount_due,
      (${asOfDate}::date - si.due_date::date) AS days_overdue
    FROM supplier_invoices si
    JOIN suppliers s ON s.id = si.supplier_id
    WHERE si.status NOT IN ('paid', 'cancelled')
      AND si.is_deleted = false
      AND si.invoice_date <= ${asOfDate}
    ORDER BY s.company_name, si.due_date
  `);

  const rows = result.rows as Array<{
    supplier_id: number;
    supplier_code: string;
    company_name: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    amount_due: number;
    days_overdue: number;
  }>;

  return rows.map(r => ({
    ...r,
    bracket: Number(r.days_overdue) <= 0  ? 'current' :
             Number(r.days_overdue) <= 30 ? '1-30'    :
             Number(r.days_overdue) <= 60 ? '31-60'   :
             Number(r.days_overdue) <= 90 ? '61-90'   : '90+',
  }));
}

// ─────────────────────────────────────────────
// 6. INVENTORY VALUATION
// ─────────────────────────────────────────────
export async function getInventoryValuation(warehouseId?: number) {
  const result = await db.execute(sql`
    SELECT
      p.code,
      p.name,
      p.product_type,
      w.name AS warehouse_name,
      ib.quantity_on_hand,
      p.purchase_price AS unit_cost,
      (ib.quantity_on_hand * p.purchase_price / 100.0)::bigint AS total_value
    FROM inventory_balances ib
    JOIN products p ON p.id = ib.product_id
    JOIN warehouses w ON w.id = ib.warehouse_id
    WHERE p.is_deleted = false
      ${warehouseId ? sql`AND ib.warehouse_id = ${warehouseId}` : sql``}
    ORDER BY p.code, w.name
  `);
  return result.rows;
}

// ─────────────────────────────────────────────
// 7. PAYROLL SUMMARY
// ─────────────────────────────────────────────
export async function getPayrollSummary(dateFrom: string, dateTo: string) {
  const result = await db.execute(sql`
    SELECT
      pr.run_number,
      pr.run_date,
      pr.status,
      pr.total_gross,
      pr.total_deductions,
      pr.total_net,
      COUNT(pl.id) AS employee_count
    FROM payroll_runs pr
    LEFT JOIN payroll_lines pl ON pl.payroll_run_id = pr.id
    WHERE pr.run_date BETWEEN ${dateFrom} AND ${dateTo}
    GROUP BY pr.id, pr.run_number, pr.run_date, pr.status,
             pr.total_gross, pr.total_deductions, pr.total_net
    ORDER BY pr.run_date DESC
  `);
  return result.rows;
}

// ─────────────────────────────────────────────
// 8. CASH FLOW STATEMENT (indirect method — simplified)
// ─────────────────────────────────────────────
export async function getCashFlow(dateFrom: string, dateTo: string) {
  const plData = await getProfitAndLoss(dateFrom, dateTo);
  const netIncome = plData.totals.netProfit;

  const receipts = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM customer_receipts
    WHERE status = 'posted'
      AND receipt_date BETWEEN ${dateFrom} AND ${dateTo}
  `);
  const cashIn = Number((receipts.rows[0] as any).total);

  const payments = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM supplier_payments
    WHERE status = 'posted'
      AND payment_date BETWEEN ${dateFrom} AND ${dateTo}
  `);
  const cashOut = Number((payments.rows[0] as any).total);

  const payroll = await db.execute(sql`
    SELECT COALESCE(SUM(total_net), 0) AS total
    FROM payroll_runs
    WHERE status = 'posted'
      AND run_date BETWEEN ${dateFrom} AND ${dateTo}
  `);
  const payrollOut = Number((payroll.rows[0] as any).total);

  return {
    operating: {
      netIncome,
      cashReceivedFromCustomers: cashIn,
      cashPaidToSuppliers: cashOut,
      cashPaidForPayroll: payrollOut,
      netOperatingCashFlow: cashIn - cashOut - payrollOut,
    },
    investing: { netInvestingCashFlow: 0 },
    financing: { netFinancingCashFlow: 0 },
    netCashFlow: cashIn - cashOut - payrollOut,
    period: { dateFrom, dateTo },
  };
}
