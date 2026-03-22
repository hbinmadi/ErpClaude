import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';

interface Transfer {
  id: number;
  transferNumber: string;
  fromBranchId: number;
  toBranchId: number;
  fromBranchName: string;
  fromBranchCode: string;
  toBranchName: string;
  toBranchCode: string;
  transferDate: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  notes: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  draft: { background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)' },
  confirmed: { background: 'var(--success-subtle, rgba(22,163,74,0.1))', color: 'var(--success, #16a34a)', border: '1px solid var(--success, #16a34a)' },
  cancelled: { background: 'var(--danger-subtle)', color: 'var(--danger)', border: '1px solid var(--danger)' },
};

export default function BranchTransfersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ data: Transfer[] }>({
    queryKey: ['branch-transfers'],
    queryFn: () => api.get('/branch-transfers').then(r => r.data),
  });

  const confirmMutation = useMutation({
    mutationFn: (id: number) => api.post(`/branch-transfers/${id}/confirm`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branch-transfers'] });
      setConfirmingId(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.post(`/branch-transfers/${id}/cancel`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['branch-transfers'] }),
  });

  const transfers = data?.data ?? [];

  const thStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 11, fontWeight: 600,
    color: 'var(--text-faint)', textTransform: 'uppercase',
    letterSpacing: 0.8, background: 'var(--bg-elevated)',
    borderBottom: '2px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap',
  };

  return (
    <div style={{ maxWidth: 1100, fontFamily: 'var(--font)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Branch Transfers</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Move inventory between branches
          </p>
        </div>
        <button
          onClick={() => navigate('/branch-transfers/new')}
          style={{
            padding: '8px 18px', background: 'var(--primary)', color: 'var(--primary-fg)',
            border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font)',
          }}
        >
          + New Transfer
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            No transfers yet. Create the first one.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Transfer #</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>From</th>
                  <th style={thStyle}>To</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Notes</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, i) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-surface)',
                    }}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                      {t.transferNumber}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                      {t.transferDate ? new Date(t.transferDate).toLocaleDateString('en-SA') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{t.fromBranchCode}</span>
                      {' '}{t.fromBranchName}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{t.toBranchCode}</span>
                      {' '}{t.toBranchName}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        borderRadius: 99, letterSpacing: 0.4,
                        ...STATUS_STYLE[t.status],
                      }}>
                        {t.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.notes ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {t.status === 'draft' && (
                        <>
                          <button
                            onClick={() => navigate(`/branch-transfers/${t.id}`)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setConfirmingId(t.id);
                              confirmMutation.mutate(t.id);
                            }}
                            disabled={confirmMutation.isPending && confirmingId === t.id}
                            style={{ background: 'var(--success, #16a34a)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', padding: '4px 10px', fontSize: 12, cursor: 'pointer', marginRight: 6 }}
                          >
                            {confirmMutation.isPending && confirmingId === t.id ? '…' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => { if (confirm('Cancel this transfer?')) cancelMutation.mutate(t.id); }}
                            style={{ background: 'none', border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {t.status !== 'draft' && (
                        <button
                          onClick={() => navigate(`/branch-transfers/${t.id}`)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
