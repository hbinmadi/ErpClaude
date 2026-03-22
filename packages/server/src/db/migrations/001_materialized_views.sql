-- Account balances materialised view
CREATE MATERIALIZED VIEW IF NOT EXISTS account_balances AS
SELECT
  jl.account_id,
  je.accounting_period_id,
  SUM(jl.debit_amount)  AS period_debit,
  SUM(jl.credit_amount) AS period_credit,
  SUM(jl.debit_amount - jl.credit_amount) AS closing_balance
FROM journal_lines jl
JOIN journal_entries je ON je.id = jl.journal_entry_id
WHERE je.is_posted = true
GROUP BY jl.account_id, je.accounting_period_id;

CREATE UNIQUE INDEX IF NOT EXISTS ab_account_period
  ON account_balances(account_id, accounting_period_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS jl_account ON journal_lines(account_id, journal_entry_id);
CREATE INDEX IF NOT EXISTS jl_entry   ON journal_lines(journal_entry_id);
