import { useQuery } from '@tanstack/react-query';
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

export default function SalesOrdersPage() {
  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['sales-orders'],
    queryFn: () => api.get('/sales-orders').then(r => r.data),
  });

  return (
    <div>
      <PageHeader title="Sales Orders" subtitle="All sales orders" />
      <Table<Record<string, unknown>>
        columns={[
          { header: 'SO #', accessor: 'soNumber' },
          {
            header: 'Customer',
            render: (row) => {
              const c = row['customer'] as Record<string, unknown> | undefined;
              return String(c?.['companyName'] ?? row['customerId'] ?? '—');
            },
          },
          {
            header: 'Date',
            render: (row) => {
              const d = row['orderDate'] as string | undefined;
              return d ? new Date(d).toLocaleDateString('en-SA') : '—';
            },
          },
          {
            header: 'Status',
            render: (row) => <StatusBadge status={String(row['status'] ?? '')} />,
          },
          {
            header: 'Total (SAR)',
            render: (row) => formatSAR(Number(row['totalAmount'] ?? 0)),
            className: 'text-right',
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
