import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then(r => r.data),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); navigate('/customers/new'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader title="Customers" subtitle="Customer master list" />
        <button
          onClick={() => navigate('/customers/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--primary-dark)')}
          onMouseOut={e => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <Plus size={14} />
          New Customer
        </button>
      </div>
      <Table<Record<string, unknown>>
        columns={[
          { header: 'Code', accessor: 'code' },
          { header: 'Company', accessor: 'companyName' },
          { header: 'Email', accessor: 'email' },
          { header: 'Phone', accessor: 'phone' },
          {
            header: 'Credit Limit (SAR)',
            render: (row) => formatSAR(Number(row['creditLimit'] ?? 0)),
            className: 'text-right',
          },
          {
            header: 'Active',
            render: (row) => (
              <StatusBadge status={row['isActive'] ? 'active' : 'inactive'} />
            ),
          },
          {
            header: 'Actions',
            render: (row) => (
              <button
                onClick={() => navigate(`/customers/${row['id']}`)}
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
      />
    </div>
  );
}
