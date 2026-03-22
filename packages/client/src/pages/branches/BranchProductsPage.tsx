import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, GitBranch, Search } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type BranchProduct = {
  id: number;
  code: string;
  name: string;
  product_type: string;
  is_active: boolean;
  branch_product_id: number | null;
  cost_price: number;
  sales_price: number;
  missing: boolean;
};

export default function BranchProductsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'missing' | 'synced'>('all');
  const [editing, setEditing] = useState<Record<number, { costPrice: string; salesPrice: string }>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  const { data: branchData } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['branch', id],
    queryFn: () => api.get(`/branches/${id}`).then(r => r.data),
  });

  const { data, isLoading, error } = useQuery<{ data: BranchProduct[] }>({
    queryKey: ['branch-products', id],
    queryFn: () => api.get(`/branches/${id}/products`).then(r => r.data),
  });

  const branch = branchData?.data;
  const rows = data?.data ?? [];

  const filtered = rows.filter(r => {
    const matchSearch = !search ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'all' ? true :
      filter === 'missing' ? r.missing :
      !r.missing;
    return matchSearch && matchFilter;
  });

  const missingCount = rows.filter(r => r.missing).length;

  const startEdit = (row: BranchProduct) => {
    setEditing(prev => ({
      ...prev,
      [row.id]: {
        costPrice: (row.cost_price / 100).toFixed(2),
        salesPrice: (row.sales_price / 100).toFixed(2),
      },
    }));
  };

  const cancelEdit = (productId: number) => {
    setEditing(prev => { const n = { ...prev }; delete n[productId]; return n; });
  };

  const saveEdit = async (productId: number) => {
    const e = editing[productId];
    if (!e) return;
    setSaving(prev => ({ ...prev, [productId]: true }));
    try {
      await api.put(`/branches/${id}/products/${productId}`, {
        costPrice: e.costPrice,
        salesPrice: e.salesPrice,
      });
      qc.invalidateQueries({ queryKey: ['branch-products', id] });
      cancelEdit(productId);
    } catch (err: any) {
      alert('Save failed: ' + (err.response?.data?.message ?? err.message));
    } finally {
      setSaving(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleSyncBranch = async () => {
    try {
      const res = await api.post('/branches/sync', {});
      const { synced } = res.data.data;
      alert(`Synced ${synced} missing product(s) to all branches.`);
      qc.invalidateQueries({ queryKey: ['branch-products', id] });
    } catch (e: any) {
      alert('Sync failed: ' + (e.response?.data?.message ?? e.message));
    }
  };

  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', background: 'var(--bg-elevated)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13,
    cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0,
  };
  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '5px 12px', borderRadius: 20, border: 'none', fontSize: 12, cursor: 'pointer',
    fontFamily: 'var(--font)', fontWeight: active ? 600 : 400,
    background: active ? 'var(--primary)' : 'var(--bg-elevated)',
    color: active ? 'var(--primary-fg)' : 'var(--text-muted)',
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <PageHeader
          title={`${branch ? String(branch['name']) : 'Branch'} — Products`}
          subtitle={`${rows.length} products · ${missingCount} not synced`}
        />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => navigate('/branches')} style={btnSecondary}>
            <ArrowLeft size={14} /> Branches
          </button>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['branch-products', id] })} style={btnSecondary}>
            <RefreshCw size={14} /> Refresh
          </button>
          {missingCount > 0 && (
            <button onClick={handleSyncBranch} style={{ ...btnSecondary, color: 'var(--warning)', borderColor: 'var(--warning)' }}>
              <GitBranch size={14} /> Sync {missingCount} Missing
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button style={pillStyle(filter === 'all')} onClick={() => setFilter('all')}>All ({rows.length})</button>
        <button style={pillStyle(filter === 'missing')} onClick={() => setFilter('missing')}>
          Not Synced ({missingCount})
        </button>
        <button style={pillStyle(filter === 'synced')} onClick={() => setFilter('synced')}>
          Synced ({rows.length - missingCount})
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by code or name…"
          style={{
            width: '100%', padding: '8px 12px 8px 32px', boxSizing: 'border-box',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font)',
            fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {isLoading && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>}
      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>Failed to load products.</p>}

      {!isLoading && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Code', 'Name', 'Type', 'Status', 'Cost Price', 'Sales Price', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const isEditing = !!editing[row.id];
                const isSaving = !!saving[row.id];
                const ed = editing[row.id];
                return (
                  <tr
                    key={row.id}
                    style={{
                      background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-surface)',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 500 }}>{row.code}</td>
                    <td style={{ padding: '8px 12px' }}>{row.name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{String(row.product_type).replace('_', ' ')}</td>
                    <td style={{ padding: '8px 12px' }}>
                      {row.missing
                        ? <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--warning-subtle)', color: 'var(--warning)', borderRadius: 10, fontWeight: 600 }}>Not Synced</span>
                        : <StatusBadge status="active" />}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          value={ed.costPrice}
                          onChange={e => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], costPrice: e.target.value } }))}
                          style={{ width: 90, padding: '4px 8px', background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13, textAlign: 'right', outline: 'none' }}
                        />
                      ) : (
                        <span style={{ color: row.missing ? 'var(--text-faint)' : 'var(--text)' }}>
                          {row.missing ? '—' : formatSAR(row.cost_price)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      {isEditing ? (
                        <input
                          value={ed.salesPrice}
                          onChange={e => setEditing(prev => ({ ...prev, [row.id]: { ...prev[row.id], salesPrice: e.target.value } }))}
                          style={{ width: 90, padding: '4px 8px', background: 'var(--bg-surface)', border: '1px solid var(--primary)', borderRadius: 4, color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13, textAlign: 'right', outline: 'none' }}
                        />
                      ) : (
                        <span style={{ color: row.missing ? 'var(--text-faint)' : 'var(--text)' }}>
                          {row.missing ? '—' : formatSAR(row.sales_price)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => saveEdit(row.id)}
                            disabled={isSaving}
                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}
                          >
                            {isSaving ? '…' : 'Save'}
                          </button>
                          <button
                            onClick={() => cancelEdit(row.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row)}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}
                        >
                          Edit Prices
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
