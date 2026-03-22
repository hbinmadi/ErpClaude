import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';

interface APRow {
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amountDue: number;
  agingBracket: string;
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function bracketColors(bracket: string): React.CSSProperties {
  const b = bracket?.toLowerCase() ?? '';
  if (b.includes('current') || b === '0') return { background: 'var(--success-subtle)', color: 'var(--success)' };
  if (b.includes('1-30') || b === '1_30') return { background: 'var(--warning-subtle)', color: 'var(--warning)' };
  if (b.includes('31-60') || b === '31_60') return { background: 'var(--danger-subtle)', color: 'var(--danger)' };
  if (b.includes('61-90') || b === '61_90') return { background: 'var(--danger-subtle)', color: 'var(--danger)' };
  if (b.includes('90') || b === '90_plus') return { background: 'var(--danger-subtle)', color: 'var(--danger)' };
  return { background: 'var(--bg-elevated)', color: 'var(--text-muted)' };
}

export default function ApAgeingPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [asOfDate, setAsOfDate] = useState(today);
  const [queryDate, setQueryDate] = useState(today);

  const { data, isLoading, error } = useQuery<{ data: APRow[] }>({
    queryKey: ['ap-ageing', queryDate],
    queryFn: () =>
      api.get('/reports/ap-ageing', { params: { as_of_date: queryDate } }).then(r => r.data),
  });

  const handleRun = () => setQueryDate(asOfDate);
  const rows = data?.data ?? [];

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
      <PageHeader title="AP Ageing" subtitle="Accounts payable ageing report" />

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 24, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>As of Date</label>
          <input
            type="date"
            value={asOfDate}
            onChange={e => setAsOfDate(e.target.value)}
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
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Supplier</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Invoice #</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Invoice Date</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Due Date</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Amount Due (SAR)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Bracket</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 14px', textAlign: 'center', color: 'var(--text-faint)' }}>No records found.</td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={i}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)' }}>{row.supplierName}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)', fontFamily: 'monospace', fontSize: 12 }}>{row.invoiceNumber}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)' }}>{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString('en-SA') : '—'}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)' }}>{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-SA') : '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)' }}>{formatSAR(row.amountDue)}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap', ...bracketColors(row.agingBracket) }}>
                          {row.agingBracket ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
