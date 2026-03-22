import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, pool } from '../../db';
import { accountTypes, accounts, fiscalYears, accountingPeriods, currencies, exchangeRates } from '../schema';

const COA = [
  { code: '1000', name: 'Cash',                     type: 'Asset',     isBank: true },
  { code: '1100', name: 'Accounts Receivable',       type: 'Asset',     isControl: true },
  { code: '1200', name: 'Inventory',                 type: 'Asset' },
  { code: '1300', name: 'Prepaid Expenses',          type: 'Asset' },
  { code: '1500', name: 'Fixed Assets',              type: 'Asset' },
  { code: '1510', name: 'Accumulated Depreciation',  type: 'Asset' },
  { code: '2000', name: 'Accounts Payable',          type: 'Liability', isControl: true },
  { code: '2100', name: 'Accrued Liabilities',       type: 'Liability' },
  { code: '2200', name: 'Tax Payable',               type: 'Liability' },
  { code: '2300', name: 'Loans Payable',             type: 'Liability' },
  { code: '3000', name: 'Owner Equity',              type: 'Equity' },
  { code: '3100', name: 'Retained Earnings',         type: 'Equity' },
  { code: '4000', name: 'Sales Revenue',             type: 'Revenue' },
  { code: '4100', name: 'Sales Returns',             type: 'Revenue' },
  { code: '5000', name: 'COGS',                      type: 'COGS' },
  { code: '5100', name: 'Purchase Returns',          type: 'COGS' },
  { code: '6000', name: 'Salaries Expense',          type: 'Expense' },
  { code: '6100', name: 'Rent',                      type: 'Expense' },
  { code: '6200', name: 'Utilities',                 type: 'Expense' },
  { code: '6300', name: 'Depreciation',              type: 'Expense' },
  { code: '6400', name: 'Bank Charges',              type: 'Expense' },
  { code: '6900', name: 'Misc Expense',              type: 'Expense' },
  { code: '7000', name: 'FX Gain/Loss',              type: 'Expense' },
] as const;

export async function seedAccounts() {
  // Account types
  const typeMap: Record<string, { normalBalance: 'debit'|'credit' }> = {
    Asset:     { normalBalance: 'debit' },
    COGS:      { normalBalance: 'debit' },
    Expense:   { normalBalance: 'debit' },
    Liability: { normalBalance: 'credit' },
    Equity:    { normalBalance: 'credit' },
    Revenue:   { normalBalance: 'credit' },
  };

  const typeIds: Record<string, number> = {};
  for (const [name, { normalBalance }] of Object.entries(typeMap)) {
    const [t] = await db
      .insert(accountTypes)
      .values({ name: name as any, normalBalance })
      .onConflictDoNothing()
      .returning({ id: accountTypes.id });
    if (t) typeIds[name] = t.id;
    else {
      const [existing] = await db.select().from(accountTypes).where(eq(accountTypes.name, name as any));
      typeIds[name] = existing.id;
    }
  }

  // Accounts
  for (const row of COA) {
    await db.insert(accounts).values({
      code: row.code,
      name: row.name,
      accountTypeId: typeIds[row.type],
      isControlAccount: (row as any).isControl ?? false,
      isBankAccount: (row as any).isBank ?? false,
    }).onConflictDoNothing();
  }

  // Fiscal year — current year + 12 monthly periods
  const year = new Date().getFullYear();
  const [fy] = await db.insert(fiscalYears).values({
    name: `FY ${year}`,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  }).onConflictDoNothing().returning({ id: fiscalYears.id });

  if (fy) {
    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0);
      await db.insert(accountingPeriods).values({
        fiscalYearId: fy.id,
        periodNumber: m,
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      }).onConflictDoNothing();
    }
  }

  // Currencies
  await db.insert(currencies).values([
    { code: 'SAR', name: 'Saudi Riyal',     symbol: '﷼', isBaseCurrency: true },
    { code: 'USD', name: 'US Dollar',       symbol: '$' },
    { code: 'EUR', name: 'Euro',            symbol: '€' },
  ]).onConflictDoNothing();

  // 90 days of exchange rates
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    await db.insert(exchangeRates).values([
      { fromCurrency: 'USD', toCurrency: 'SAR', rate: '3.750000', rateDate: ds },
      { fromCurrency: 'SAR', toCurrency: 'USD', rate: '0.266667', rateDate: ds },
      { fromCurrency: 'EUR', toCurrency: 'SAR', rate: '4.050000', rateDate: ds },
      { fromCurrency: 'SAR', toCurrency: 'EUR', rate: '0.246914', rateDate: ds },
    ]).onConflictDoNothing();
  }

  console.log('Accounts seed complete.');
}

// Run standalone
seedAccounts().then(() => pool.end()).catch(err => { console.error(err); process.exit(1); });
