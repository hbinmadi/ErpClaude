import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import { Loader2 } from 'lucide-react';

interface TrialBalanceRow {
  code: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TrialBalancePage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(today);
  const [queryParams, setQueryParams] = useState({ from: firstOfYear, to: today });

  const { data, isLoading, error } = useQuery<{ data: TrialBalanceRow[] }>({
    queryKey: ['trial-balance', queryParams.from, queryParams.to],
    queryFn: () =>
      api
        .get('/reports/trial-balance', {
          params: { date_from: queryParams.from, date_to: queryParams.to },
        })
        .then(r => r.data),
  });

  const handleRun = () => {
    setQueryParams({ from: dateFrom, to: dateTo });
  };

  const handleExportCsv = () => {
    window.open(
      `/api/reports/trial-balance?date_from=${queryParams.from}&date_to=${queryParams.to}&format=csv`,
      '_blank'
    );
  };

  const rows = data?.data ?? [];
  const totalDebit = rows.reduce((sum, r) => sum + r.totalDebit, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.totalCredit, 0);

  const inputStyle: React.CSSProperties = {
    padding: '7px 10px',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'var(--font)',
  };

  return (
    <div>
      <PageHeader title="Trial Balance" subtitle="Debit and credit totals by account" />

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 24, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Date From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--input-focus)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Date To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={inputStyle}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--input-focus)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border)'}
          />
        </div>
        <button
          onClick={handleRun}
          style={{ padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          Run Report
        </button>
        <button
          onClick={handleExportCsv}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite', marginRight: 8, width: 20, height: 20 }} />
          Loading...
        </div>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--danger)' }}>
          Failed to load report.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', fontFamily: 'var(--font)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Code</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Account</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Debit (SAR)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Credit (SAR)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Net Balance (SAR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 14px', textAlign: 'center', color: 'var(--text-faint)' }}>
                      No data for the selected period.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={i}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)', fontFamily: 'monospace', fontSize: 12 }}>{row.code}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)' }}>{row.accountName}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)', textTransform: 'capitalize' }}>{row.accountType}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)' }}>{formatSAR(row.totalDebit)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)' }}>{formatSAR(row.totalCredit)}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 500, color: row.netBalance >= 0 ? 'var(--text)' : 'var(--danger)', borderBottom: '1px solid var(--border-muted)' }}>
                        {formatSAR(row.netBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--bg-elevated)', borderTop: '2px solid var(--border)' }}>
                    <td colSpan={3} style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>Totals</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{formatSAR(totalDebit)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{formatSAR(totalCredit)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>{formatSAR(totalDebit - totalCredit)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
