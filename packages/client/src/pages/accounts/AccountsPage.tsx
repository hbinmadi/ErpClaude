import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import DosBrowse from '../../components/kbd/DosBrowse';

interface Account {
  id: number;
  code: string;
  name: string;
  type: string;
  normalBalance: string;
  isActive: boolean;
}

export default function AccountsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<{ data: Account[] }>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts').then(r => r.data),
  });

  const rows = (data?.data ?? []) as unknown as Record<string, unknown>[];

  return (
    <DosBrowse
      title="Chart of Accounts"
      columns={[
        { key: 'code', header: 'CODE', width: 8 },
        { key: 'name', header: 'ACCOUNT NAME', width: 30 },
        { key: 'type', header: 'TYPE', width: 12 },
        { key: 'normalBalance', header: 'NORMAL', width: 6 },
        {
          key: 'isActive',
          header: 'ACT',
          width: 3,
          render: (row) => row['isActive'] ? 'YES' : 'NO',
        },
      ]}
      rows={rows}
      loading={isLoading}
      onSelect={(row) => navigate(`/accounts/${row['id']}`)}
    />
  );
}
