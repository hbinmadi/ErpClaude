import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, GitBranch } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';

export default function BranchesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data),
  });

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', background: 'var(--primary)', color: 'var(--primary-fg)',
    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0,
  };
  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', background: 'var(--bg-elevated)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13,
    cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0,
  };

  const handleSync = async () => {
    try {
      const res = await api.post('/branches/sync', {});
      const { synced, branches: b } = res.data.data;
      alert(`Sync complete: ${synced} product(s) replicated across ${b} branch(es).`);
      qc.invalidateQueries({ queryKey: ['branches'] });
    } catch (e: any) {
      alert('Sync failed: ' + (e.response?.data?.message ?? e.message));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <PageHeader title="Branches" subtitle="Manage company branches and their product catalogues" />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['branches'] })} style={btnSecondary}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={handleSync} style={btnSecondary}>
            <GitBranch size={14} /> Sync Products
          </button>
          <button onClick={() => navigate('/branches/new')} style={btnPrimary}>
            <Plus size={14} /> New Branch
          </button>
        </div>
      </div>

      <Table<Record<string, unknown>>
        columns={[
          { header: 'Code', accessor: 'code' },
          { header: 'Name', accessor: 'name' },
          { header: 'Phone', render: row => String(row['phone'] ?? '—') },
          { header: 'HQ', render: row => row['isHQ'] ? <StatusBadge status="posted" /> : null },
          { header: 'Active', render: row => <StatusBadge status={row['isActive'] ? 'active' : 'inactive'} /> },
          {
            header: 'Actions',
            render: row => (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/branches/${row['id']}`); }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}
                >
                  Edit
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/branches/${row['id']}/products`); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}
                >
                  Products
                </button>
              </div>
            ),
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        error={error as Error | null}
        keyField="id"
        onRowClick={row => navigate(`/branches/${row['id']}`)}
      />
    </div>
  );
}
