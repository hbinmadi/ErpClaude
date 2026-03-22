import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import DosBrowse from '../../components/kbd/DosBrowse';

export default function SuppliersPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); navigate('/suppliers/new'); }
      if (e.key === 'Escape') { e.preventDefault(); navigate('/'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  return (
    <DosBrowse
      title="Suppliers"
      columns={[
        { key: 'code', header: 'CODE', width: 8 },
        { key: 'companyName', header: 'COMPANY NAME', width: 25 },
        { key: 'phone', header: 'PHONE', width: 14 },
        { key: 'paymentTerms', header: 'TERMS', width: 6 },
        {
          key: 'isActive',
          header: 'ACT',
          width: 3,
          render: (row) => row['isActive'] ? 'YES' : 'NO',
        },
      ]}
      rows={data?.data ?? []}
      loading={isLoading}
      onSelect={(row) => navigate(`/suppliers/${row['id']}`)}
      onNew={() => navigate('/suppliers/new')}
    />
  );
}
