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

export default function PayrollPage() {
  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['payroll-runs'],
    queryFn: () => api.get('/payroll-runs').then(r => r.data),
  });

  return (
    <div>
      <PageHeader title="Payroll" subtitle="Payroll run history" />
      <Table<Record<string, unknown>>
        columns={[
          { header: 'Run #', accessor: 'runNumber' },
          {
            header: 'Date',
            render: (row) => {
              const d = (row['payPeriodEnd'] ?? row['runDate']) as string | undefined;
              return d ? new Date(d).toLocaleDateString('en-SA') : '—';
            },
          },
          {
            header: 'Status',
            render: (row) => <StatusBadge status={String(row['status'] ?? '')} />,
          },
          {
            header: 'Gross (SAR)',
            render: (row) => formatSAR(Number(row['totalGross'] ?? 0)),
            className: 'text-right',
          },
          {
            header: 'Deductions (SAR)',
            render: (row) => formatSAR(Number(row['totalDeductions'] ?? 0)),
            className: 'text-right',
          },
          {
            header: 'Net (SAR)',
            render: (row) => formatSAR(Number(row['totalNet'] ?? 0)),
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
