import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileDown, CheckCircle, Plus } from 'lucide-react';
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

function PostButton({ id, onSuccess }: { id: number; onSuccess: () => void }) {
  const mutation = useMutation({
    mutationFn: () => api.post(`/sales-invoices/${id}/post`),
    onSuccess,
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--success)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', opacity: mutation.isPending ? 0.5 : 1 }}
    >
      <CheckCircle size={13} />
      {mutation.isPending ? 'Posting…' : 'Post'}
    </button>
  );
}

export default function SalesInvoicesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['sales-invoices'],
    queryFn: () => api.get('/sales-invoices').then(r => r.data),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['sales-invoices'] });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); navigate('/sales-invoices/new'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageHeader title="Sales Invoices" subtitle="Accounts receivable invoices" />
        <button
          onClick={() => navigate('/sales-invoices/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--primary)', color: 'var(--primary-fg)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--primary-dark)')}
          onMouseOut={e => (e.currentTarget.style.background = 'var(--primary)')}
        >
          <Plus size={14} />
          New Invoice
        </button>
      </div>
      <Table<Record<string, unknown>>
        columns={[
          { header: 'Invoice #', accessor: 'invoiceNumber' },
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
          {
            header: 'PDF',
            render: (row) => (
              <button
                onClick={() =>
                  window.open(`/api/pdf/sales-invoices/${row['id']}`, '_blank')
                }
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                <FileDown size={14} />
                PDF
              </button>
            ),
          },
          {
            header: 'Actions',
            render: (row) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => navigate(`/sales-invoices/${row['id']}`)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 500 }}
                >
                  Edit
                </button>
                {String(row['status']) === 'draft' ? (
                  <PostButton id={Number(row['id'])} onSuccess={refetch} />
                ) : null}
              </div>
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
