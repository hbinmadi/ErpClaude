import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';

interface PLSection {
  name: string;
  accounts: { code: string; name: string; amount: number }[];
  total: number;
}

interface PLData {
  sections: PLSection[];
  totals: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
  };
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ProfitLossPage() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(today);
  const [queryParams, setQueryParams] = useState({ from: firstOfYear, to: today });

  const { data, isLoading, error } = useQuery<{ data: PLData }>({
    queryKey: ['profit-loss', queryParams.from, queryParams.to],
    queryFn: () =>
      api
        .get('/reports/profit-and-loss', {
          params: { date_from: queryParams.from, date_to: queryParams.to },
        })
        .then(r => r.data),
  });

  const handleRun = () => setQueryParams({ from: dateFrom, to: dateTo });

  const pl = data?.data;

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
      <PageHeader title="Profit & Loss" subtitle="Income statement for the selected period" />

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
      ) : pl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
          {/* Sections */}
          {(pl.sections ?? []).map((section, si) => (
            <div key={si} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-elevated)' }}>
                <h3 style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontSize: 14 }}>{section.name}</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font)' }}>
                <tbody>
                  {(section.accounts ?? []).map((acc, ai) => (
                    <tr key={ai} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '8px 20px', color: 'var(--text-muted)' }}>{acc.code}</td>
                      <td style={{ padding: '8px 8px', color: 'var(--text)' }}>{acc.name}</td>
                      <td style={{ padding: '8px 20px', textAlign: 'right', color: 'var(--text)' }}>
                        SAR {formatSAR(acc.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)' }}>
                    <td colSpan={2} style={{ padding: '8px 20px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Total {section.name}
                    </td>
                    <td style={{ padding: '8px 20px', textAlign: 'right', fontWeight: 700, color: 'var(--text)' }}>
                      SAR {formatSAR(section.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          {/* Summary */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-elevated)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontSize: 14 }}>Summary</h3>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontSize: 13, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Revenue</span>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>SAR {formatSAR(pl.totals?.revenue ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontSize: 13, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cost of Goods Sold</span>
                <span style={{ fontWeight: 500, color: 'var(--danger)' }}>SAR {formatSAR(pl.totals?.cogs ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontSize: 13, fontWeight: 600, borderBottom: '1px solid var(--border)', borderTop: '2px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Gross Profit</span>
                <span style={{ color: (pl.totals?.grossProfit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  SAR {formatSAR(pl.totals?.grossProfit ?? 0)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontSize: 13, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Expenses</span>
                <span style={{ fontWeight: 500, color: 'var(--danger)' }}>SAR {formatSAR(pl.totals?.expenses ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', fontSize: 15, fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                <span style={{ color: 'var(--text)' }}>Net Profit</span>
                <span style={{ color: (pl.totals?.netProfit ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  SAR {formatSAR(pl.totals?.netProfit ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
