import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import DosBrowse from '../../components/kbd/DosBrowse';

interface JournalEntry {
  id: number;
  entryNumber: string;
  date: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  isPosted: boolean;
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function JournalPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<{ data: JournalEntry[] }>({
    queryKey: ['journal-entries'],
    queryFn: () => api.get('/journal-entries').then(r => r.data),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F3') { e.preventDefault(); navigate('/journal/new'); }
      if (e.key === 'Escape') { e.preventDefault(); navigate('/'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const rows = (data?.data ?? []) as unknown as Record<string, unknown>[];

  return (
    <DosBrowse
      title="Journal Entries"
      columns={[
        { key: 'entryNumber', header: 'ENTRY#', width: 8 },
        {
          key: 'date',
          header: 'DATE',
          width: 12,
          render: (row) => {
            const d = row['date'] as string;
            return d ? new Date(d).toLocaleDateString('en-SA') : '—';
          },
        },
        { key: 'description', header: 'DESCRIPTION', width: 30 },
        {
          key: 'totalDebit',
          header: 'DEBIT',
          width: 12,
          align: 'right',
          render: (row) => formatSAR(Number(row['totalDebit'] ?? 0)),
        },
        {
          key: 'totalCredit',
          header: 'CREDIT',
          width: 12,
          align: 'right',
          render: (row) => formatSAR(Number(row['totalCredit'] ?? 0)),
        },
        {
          key: 'isPosted',
          header: 'POST',
          width: 6,
          render: (row) => row['isPosted'] ? 'POSTED' : 'DRAFT',
        },
      ]}
      rows={rows}
      loading={isLoading}
      onSelect={(row) => navigate(`/journal/${row['id']}`)}
      onNew={() => navigate('/journal/new')}
    />
  );
}
