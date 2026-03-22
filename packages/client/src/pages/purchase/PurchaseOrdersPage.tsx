import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import DosBrowse from '../../components/kbd/DosBrowse';

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then(r => r.data),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); navigate('/purchase-orders/new'); }
      if (e.key === 'Escape') { e.preventDefault(); navigate('/'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <DosBrowse
      title="Purchase Orders"
      columns={[
        { key: 'poNumber', header: 'PO#', width: 10 },
        {
          key: 'supplier',
          header: 'SUPPLIER',
          width: 20,
          render: (row) => {
            const s = row['supplier'] as Record<string, unknown> | undefined;
            return String(s?.['companyName'] ?? row['supplierId'] ?? '—');
          },
        },
        {
          key: 'orderDate',
          header: 'DATE',
          width: 12,
          render: (row) => {
            const d = row['orderDate'] as string | undefined;
            return d ? new Date(d).toLocaleDateString('en-SA') : '—';
          },
        },
        { key: 'status', header: 'STATUS', width: 10 },
        {
          key: 'totalAmount',
          header: 'TOTAL SAR',
          width: 12,
          align: 'right',
          render: (row) => formatSAR(Number(row['totalAmount'] ?? 0)),
        },
      ]}
      rows={data?.data ?? []}
      loading={isLoading}
      onSelect={(row) => navigate(`/purchase-orders/${row['id']}`)}
      onNew={() => navigate('/purchase-orders/new')}
    />
  );
}
