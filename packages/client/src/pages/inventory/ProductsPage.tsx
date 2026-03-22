import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, RefreshCw, Search } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import ExcelImport from '../../components/ExcelImport';

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showImport, setShowImport] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['products', debouncedSearch],
    queryFn: () => api.get(`/products${debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : ''}`).then(r => r.data),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); navigate('/inventory/products/new'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

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

  return (
    <div>
      {showImport && (
        <ExcelImport
          onClose={() => setShowImport(false)}
          onComplete={() => {
            qc.invalidateQueries({ queryKey: ['products'] });
            setShowImport(false);
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <PageHeader title="Products" subtitle="Product master & catalogue" />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => qc.invalidateQueries({ queryKey: ['products'] })} style={btnSecondary}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowImport(true)} style={btnSecondary}>
            <Upload size={14} /> Import Excel
          </button>
          <button onClick={() => navigate('/inventory/products/new')} style={btnPrimary}>
            <Plus size={14} /> New Product (F3)
          </button>
        </div>
      </div>

      {/* Search bar */}
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

      <Table<Record<string, unknown>>
        columns={[
          { header: 'Code', accessor: 'code' },
          { header: 'Name', accessor: 'name' },
          { header: 'Type', render: row => String(row['productType'] ?? '').replace('_', ' ') },
          { header: 'Sales Price', render: row => formatSAR(Number(row['salesPrice'] ?? 0)), align: 'right' },
          { header: 'Purchase Price', render: row => formatSAR(Number(row['purchasePrice'] ?? 0)), align: 'right' },
          { header: 'Tax %', render: row => `${row['taxRate'] ?? '15'}%`, align: 'right' },
          { header: 'Reorder Pt.', render: row => row['reorderPoint'] ? String(row['reorderPoint']) : '—', align: 'right' },
          { header: 'Active', render: row => <StatusBadge status={row['isActive'] ? 'active' : 'inactive'} /> },
          {
            header: 'Actions',
            render: row => (
              <button
                onClick={() => navigate(`/inventory/products/${row['id']}`)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}
              >
                Edit
              </button>
            ),
          },
        ]}
        data={data?.data ?? []}
        isLoading={isLoading}
        error={error as Error | null}
        keyField="id"
        onRowClick={row => navigate(`/inventory/products/${row['id']}`)}
      />
    </div>
  );
}
