import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';

interface BSAccount {
  code: string;
  name: string;
  amount: number;
}

interface BSSection {
  name: string;
  accounts: BSAccount[];
  total: number;
}

interface BSData {
  sections: BSSection[];
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    liabilitiesAndEquity: number;
  };
  isBalanced: boolean;
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BalanceSheetPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [asOfDate, setAsOfDate] = useState(today);
  const [queryDate, setQueryDate] = useState(today);

  const { data, isLoading, error } = useQuery<{ data: BSData }>({
    queryKey: ['balance-sheet', queryDate],
    queryFn: () =>
      api
        .get('/reports/balance-sheet', { params: { as_of_date: queryDate } })
        .then(r => r.data),
  });

  const handleRun = () => setQueryDate(asOfDate);
  const bs = data?.data;

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
      <PageHeader title="Balance Sheet" subtitle="Assets, liabilities and equity" />

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
      ) : bs ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>
          {/* Balanced indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderRadius: 'var(--radius)',
            fontSize: 13,
            fontWeight: 500,
            background: bs.isBalanced ? 'var(--success-subtle)' : 'var(--danger-subtle)',
            color: bs.isBalanced ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${bs.isBalanced ? 'var(--success)' : 'var(--danger)'}`,
          }}>
            {bs.isBalanced ? (
              <>
                <CheckCircle size={16} />
                Balance sheet is balanced
              </>
            ) : (
              <>
                <XCircle size={16} />
                Balance sheet is NOT balanced
              </>
            )}
          </div>

          {/* Sections */}
          {(bs.sections ?? []).map((section, si) => (
            <div key={si} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-elevated)' }}>
                <h3 style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontSize: 14 }}>{section.name}</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font)' }}>
                <tbody>
                  {(section.accounts ?? []).map((acc, ai) => (
                    <tr key={ai} style={{ borderBottom: '1px solid var(--border-muted)' }}>
                      <td style={{ padding: '8px 20px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>{acc.code}</td>
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

          {/* Totals summary */}
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-elevated)' }}>
              <h3 style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontSize: 14 }}>Summary</h3>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontSize: 13, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Assets</span>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>SAR {formatSAR(bs.totals?.totalAssets ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontSize: 13, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Liabilities</span>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>SAR {formatSAR(bs.totals?.totalLiabilities ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', fontSize: 13, borderBottom: '1px solid var(--border-muted)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Equity</span>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>SAR {formatSAR(bs.totals?.totalEquity ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', fontSize: 15, fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                <span style={{ color: 'var(--text)' }}>Liabilities + Equity</span>
                <span style={{ color: 'var(--text)' }}>SAR {formatSAR(bs.totals?.liabilitiesAndEquity ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
