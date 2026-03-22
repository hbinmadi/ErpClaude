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

export default function EmployeesPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); navigate('/employees/new'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader title="Employees" subtitle="Employee master list" />
        <button
          onClick={() => navigate('/employees/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--primary-dark)')}
          onMouseOut={e => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <Plus size={14} />
          New Employee
        </button>
      </div>
      <Table<Record<string, unknown>>
        columns={[
          { header: 'Emp #', accessor: 'employeeNumber' },
          {
            header: 'Name',
            render: (row) => String(row['fullName'] ?? row['name'] ?? '—'),
          },
          { header: 'Job Title', accessor: 'jobTitle' },
          {
            header: 'Hire Date',
            render: (row) => {
              const d = row['hireDate'] as string | undefined;
              return d ? new Date(d).toLocaleDateString('en-SA') : '—';
            },
          },
          {
            header: 'Salary (SAR)',
            render: (row) => formatSAR(Number(row['basicSalary'] ?? row['salary'] ?? 0)),
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
                onClick={() => navigate(`/employees/${row['id']}`)}
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
