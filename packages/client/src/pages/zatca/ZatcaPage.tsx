import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

interface ZatcaStats {
  pending: number;
  cleared: number;
  reported: number;
  rejected: number;
  error: number;
}

interface ZatcaRecord {
  id: number;
  salesInvoiceId: number;
  type: string;
  counter: number;
  status: string;
  createdAt: string;
  retryCount: number;
}

function StatCard({ label, value, valueColor }: { label: string; value: number; valueColor: string }) {
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-muted)', marginBottom: 4, margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 700, color: valueColor, margin: 0 }}>{value}</p>
    </div>
  );
}

function SubmitButton({ id, onSuccess }: { id: number; onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: () => api.post(`/zatca/${id}/submit`),
    onSuccess,
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: mutation.isPending ? 'var(--text-faint)' : 'var(--primary)', fontSize: 12, cursor: mutation.isPending ? 'not-allowed' : 'pointer', padding: 0, fontFamily: 'var(--font)', opacity: mutation.isPending ? 0.5 : 1 }}
    >
      <Upload size={13} />
      {mutation.isPending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

export default function ZatcaPage() {
  const qc = useQueryClient();

  const { data: statsData, isLoading: statsLoading } = useQuery<{ data: ZatcaStats }>({
    queryKey: ['zatca-stats'],
    queryFn: () => api.get('/zatca/stats/summary').then(r => r.data),
  });

  const { data: listData, isLoading: listLoading, error } = useQuery<{ data: ZatcaRecord[] }>({
    queryKey: ['zatca'],
    queryFn: () => api.get('/zatca').then(r => r.data),
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['zatca'] });
    qc.invalidateQueries({ queryKey: ['zatca-stats'] });
  };

  const stats = statsData?.data;
  const records = listData?.data ?? [];

  return (
    <div>
      <PageHeader title="ZATCA" subtitle="e-Invoicing compliance — Fatoora" />

      {/* Stats bar */}
      {statsLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', marginBottom: 24 }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} />
          Loading stats...
        </div>
      ) : stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Pending" value={stats.pending} valueColor="var(--warning)" />
          <StatCard label="Cleared" value={stats.cleared} valueColor="var(--success)" />
          <StatCard label="Reported" value={stats.reported} valueColor="var(--info)" />
          <StatCard label="Rejected" value={stats.rejected} valueColor="var(--danger)" />
          <StatCard label="Error" value={stats.error} valueColor="var(--danger)" />
        </div>
      ) : null}

      {/* Table */}
      {listLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          <Loader2 style={{ animation: 'spin 1s linear infinite', marginRight: 8, width: 20, height: 20 }} />
          Loading...
        </div>
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--danger)' }}>
          Failed to load ZATCA records.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', fontFamily: 'var(--font)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>ID</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Sales Invoice ID</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Type</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Counter</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Created At</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Retries</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px 14px', textAlign: 'center', color: 'var(--text-faint)' }}>
                      No ZATCA records found.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '10px 14px', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)', fontFamily: 'monospace', fontSize: 12 }}>{rec.id}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)' }}>{rec.salesInvoiceId}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)', textTransform: 'capitalize' }}>{rec.type}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text)', borderBottom: '1px solid var(--border-muted)' }}>{rec.counter}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-muted)' }}>
                        <StatusBadge status={rec.status} />
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)' }}>
                        {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-SA') : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-muted)' }}>{rec.retryCount}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <SubmitButton id={rec.id} onSuccess={refetch} />
                          <button
                            onClick={() => window.open(`/api/zatca/${rec.id}/xml`, '_blank')}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font)', padding: 0 }}
                          >
                            XML
                          </button>
                        </div>
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
