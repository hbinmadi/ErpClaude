import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';

interface StockRow {
  id: number;
  code: string;
  name: string;
  product_type: string;
  sales_price: number;
  purchase_price: number;
  reorder_point: string | null;
  is_active: boolean;
  quantity_on_hand: string;
  quantity_reserved: string;
  quantity_on_order: string;
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function qty(val: string | number | null): number {
  return parseFloat(String(val ?? 0)) || 0;
}

export default function StockPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const { data, isLoading, error } = useQuery<{ data: StockRow[] }>({
    queryKey: ['inventory-stock'],
    queryFn: () => api.get('/inventory/stock').then(r => r.data),
    refetchInterval: 30_000,
  });

  const rows = data?.data ?? [];

  const filtered = rows.filter(r => {
    const matchSearch = !search ||
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase());
    const onHand = qty(r.quantity_on_hand);
    const reorder = r.reorder_point ? parseFloat(r.reorder_point) : null;
    const matchFilter =
      filter === 'all' ? true :
      filter === 'out' ? onHand <= 0 :
      filter === 'low' ? (reorder !== null && onHand <= reorder && onHand > 0) : true;
    return matchSearch && matchFilter;
  });

  const totalValue = rows.reduce((acc, r) => acc + qty(r.quantity_on_hand) * r.purchase_price, 0);
  const lowStock = rows.filter(r => r.reorder_point && qty(r.quantity_on_hand) <= parseFloat(r.reorder_point) && qty(r.quantity_on_hand) > 0).length;
  const outOfStock = rows.filter(r => qty(r.quantity_on_hand) <= 0).length;

  const btnSecondary: React.CSSProperties = {
    padding: '6px 12px', background: 'var(--bg-elevated)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 12,
    cursor: 'pointer', fontFamily: 'var(--font)',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader title="Stock Levels" subtitle="Real-time inventory balances across all warehouses" />
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Inventory Value', value: `SAR ${formatSAR(totalValue)}`, color: 'var(--primary)' },
          { label: 'Low Stock Items', value: String(lowStock), color: 'var(--warning, #f59e0b)', suffix: ' items' },
          { label: 'Out of Stock', value: String(outOfStock), color: 'var(--danger)', suffix: ' items' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', boxShadow: 'var(--shadow-sm)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 6px' }}>{kpi.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: kpi.color, margin: 0, fontFamily: 'monospace' }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product…"
            style={{ padding: '7px 12px 7px 30px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13, outline: 'none', width: 240 }}
          />
        </div>
        {(['all', 'low', 'out'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...btnSecondary, background: filter === f ? 'var(--primary-subtle)' : 'var(--bg-elevated)', color: filter === f ? 'var(--primary)' : 'var(--text)', borderColor: filter === f ? 'var(--primary)' : 'var(--border)' }}
          >
            {f === 'all' ? 'All' : f === 'low' ? `⚠ Low Stock (${lowStock})` : `✗ Out of Stock (${outOfStock})`}
          </button>
        ))}
      </div>

      <Table<Record<string, unknown>>
        columns={[
          { header: 'Code', accessor: 'code' },
          { header: 'Name', accessor: 'name' },
          {
            header: 'On Hand',
            render: row => {
              const onHand = qty(row['quantity_on_hand'] as string);
              const reorder = row['reorder_point'] ? parseFloat(String(row['reorder_point'])) : null;
              const isLow = reorder !== null && onHand <= reorder && onHand > 0;
              const isOut = onHand <= 0;
              return (
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: isOut ? 'var(--danger)' : isLow ? 'var(--warning, #f59e0b)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isLow && <AlertTriangle size={12} />}
                  {onHand.toLocaleString('en-SA', { maximumFractionDigits: 3 })}
                </span>
              );
            },
            align: 'right',
          },
          { header: 'Reserved', render: row => qty(row['quantity_reserved'] as string).toLocaleString('en-SA', { maximumFractionDigits: 3 }), align: 'right' },
          { header: 'On Order', render: row => qty(row['quantity_on_order'] as string).toLocaleString('en-SA', { maximumFractionDigits: 3 }), align: 'right' },
          { header: 'Reorder Pt.', render: row => row['reorder_point'] ? String(row['reorder_point']) : '—', align: 'right' },
          { header: 'Purchase Price', render: row => formatSAR(Number(row['purchase_price'] ?? 0)), align: 'right' },
          {
            header: 'Stock Value',
            render: row => {
              const val = qty(row['quantity_on_hand'] as string) * Number(row['purchase_price'] ?? 0);
              return <span style={{ fontFamily: 'monospace' }}>{formatSAR(val)}</span>;
            },
            align: 'right',
          },
          {
            header: '',
            render: row => (
              <button
                onClick={e => { e.stopPropagation(); navigate(`/inventory/products/${row['id']}`); }}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}
              >
                Edit
              </button>
            ),
          },
        ]}
        data={filtered as unknown as Record<string, unknown>[]}
        isLoading={isLoading}
        error={error as Error | null}
        keyField="id"
      />
    </div>
  );
}
