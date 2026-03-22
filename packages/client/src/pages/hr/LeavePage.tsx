import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';

export default function LeavePage() {
  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['leave-requests'],
    queryFn: () => api.get('/leave-requests').then(r => r.data),
  });

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Employee leave management" />
      <Table<Record<string, unknown>>
        columns={[
          {
            header: 'Employee ID',
            render: (row) => String(row['employeeId'] ?? '—'),
          },
          { header: 'Type', accessor: 'leaveType' },
          {
            header: 'Start',
            render: (row) => {
              const d = row['startDate'] as string | undefined;
              return d ? new Date(d).toLocaleDateString('en-SA') : '—';
            },
          },
          {
            header: 'End',
            render: (row) => {
              const d = row['endDate'] as string | undefined;
              return d ? new Date(d).toLocaleDateString('en-SA') : '—';
            },
          },
          {
            header: 'Status',
            render: (row) => <StatusBadge status={String(row['status'] ?? '')} />,
          },
          {
            header: 'Days',
            render: (row) => String(row['totalDays'] ?? row['days'] ?? '—'),
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
