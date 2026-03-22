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

export default function SupplierInvoicesPage() {
  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['supplier-invoices'],
    queryFn: () => api.get('/supplier-invoices').then(r => r.data),
  });

  return (
    <div>
      <PageHeader title="Supplier Invoices" subtitle="Accounts payable invoices" />
      <Table<Record<string, unknown>>
        columns={[
          { header: 'Invoice #', accessor: 'invoiceNumber' },
          {
            header: 'Supplier',
            render: (row) => {
              const s = row['supplier'] as Record<string, unknown> | undefined;
              return String(s?.['companyName'] ?? row['supplierId'] ?? '—');
            },
          },
          {
            header: 'Date',
            render: (row) => {
              const d = row['invoiceDate'] as string | undefined;
              return d ? new Date(d).toLocaleDateString('en-SA') : '—';
            },
          },
          {
            header: 'Due Date',
            render: (row) => {
              const d = row['dueDate'] as string | undefined;
              return d ? new Date(d).toLocaleDateString('en-SA') : '—';
            },
          },
          {
            header: 'Total (SAR)',
            render: (row) => formatSAR(Number(row['totalAmount'] ?? 0)),
            className: 'text-right',
          },
          {
            header: 'Amount Due (SAR)',
            render: (row) => formatSAR(Number(row['amountDue'] ?? 0)),
            className: 'text-right',
          },
          {
            header: 'Status',
            render: (row) => <StatusBadge status={String(row['status'] ?? '')} />,
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
