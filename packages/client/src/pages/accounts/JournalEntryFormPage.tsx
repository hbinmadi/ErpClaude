import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import KbdField from '../../components/kbd/KbdField';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';
import { useFormNav } from '../../components/kbd/useFormNav';
import JournalGrid, { JournalLine } from '../../components/JournalGrid';

interface JournalForm {
  entryDate: string;
  description: string;
  reference: string;
  lines: JournalLine[];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function parseSAR(v: string): number {
  return Math.round((parseFloat(v) || 0) * 100);
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FIELD_IDS = ['entryDate', 'description', 'reference'];

function newLine(): JournalLine {
  return { account: '', accountId: null, description: '', debit: '', credit: '' };
}

export default function JournalEntryFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const nav = useFormNav(FIELD_IDS);

  const [form, setForm] = useState<JournalForm>({
    entryDate: today(),
    description: '',
    reference: '',
    lines: [newLine(), newLine()],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [escapeOpen, setEscapeOpen] = useState(false);

  const totalDebit = form.lines.reduce((acc, l) => acc + parseSAR(l.debit), 0);
  const totalCredit = form.lines.reduce((acc, l) => acc + parseSAR(l.credit), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = difference === 0 && totalDebit > 0;

  const handleLinesChange = (rows: JournalLine[]) => {
    setForm(f => ({ ...f, lines: rows }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.entryDate) errs['entryDate'] = 'Date is required';
    if (!form.description.trim()) errs['description'] = 'Description is required';
    if (!isBalanced) errs['balance'] = 'Debits must equal credits';
    const hasLines = form.lines.some(l => l.accountId && (parseSAR(l.debit) > 0 || parseSAR(l.credit) > 0));
    if (!hasLines) errs['lines'] = 'At least one line with account and amount is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    entryDate: form.entryDate,
    description: form.description,
    reference: form.reference,
    lines: form.lines
      .filter(l => l.accountId && (parseSAR(l.debit) > 0 || parseSAR(l.credit) > 0))
      .map(l => ({
        accountId: l.accountId,
        description: l.description,
        debitAmount: parseSAR(l.debit),
        creditAmount: parseSAR(l.credit),
      })),
    createdBy: 1,
  });

  const saveMutation = useMutation({
    mutationFn: () => api.post('/journal-entries', buildPayload()).then(r => r.data),
    onSuccess: () => {
      setStatusMsg('Saved & Posted');
      setStatusType('success');
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      setTimeout(() => {
        setStatusMsg('');
        navigate('/journal');
      }, 2000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed';
      setApiError(msg);
    },
  });

  const handleSave = useCallback(() => {
    if (!validate()) return;
    setApiError('');
    saveMutation.mutate();
  }, [form, isBalanced]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); setEscapeOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px',
    background: 'var(--primary)',
    color: 'var(--primary-fg)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px',
    background: 'var(--bg-elevated)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'var(--font)',
  };

  return (
    <div style={{ maxWidth: 900, fontFamily: 'var(--font)' }}>
      {apiError && (
        <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, border: '1px solid var(--danger)' }}>
          {apiError}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>New Journal Entry</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
            Create a new journal entry
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/journal')} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={btnPrimary}>
            {saveMutation.isPending ? 'Saving…' : 'Save & Post (F2)'}
          </button>
        </div>
      </div>

      {/* Header fields card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
          Entry Details
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <KbdField
              id="entryDate"
              label="Entry Date"
              type="date"
              value={form.entryDate}
              onChange={v => setForm(f => ({ ...f, entryDate: v }))}
              onNext={() => nav.nextField('entryDate')}
              autoFocus
              error={errors['entryDate']}
            />
            <KbdField
              id="description"
              label="Description"
              value={form.description}
              onChange={v => setForm(f => ({ ...f, description: v }))}
              onNext={() => nav.nextField('description')}
              onPrev={() => nav.prevField('description')}
              error={errors['description']}
              width="w-64"
            />
          </div>
          <div>
            <KbdField
              id="reference"
              label="Reference"
              value={form.reference}
              onChange={v => setForm(f => ({ ...f, reference: v }))}
              onNext={() => nav.nextField('reference')}
              onPrev={() => nav.prevField('reference')}
              width="w-48"
            />
          </div>
        </div>
      </div>

      {/* Lines card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 16px' }}>
          Journal Lines
        </p>
        {errors['lines'] && (
          <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 13 }}>
            {errors['lines']}
          </div>
        )}
        <JournalGrid rows={form.lines} onChange={handleLinesChange} />
      </div>

      {/* Totals card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 260, fontFamily: 'var(--font)', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '4px 0', color: 'var(--text-muted)' }}>
              <span>Total Debit:</span>
              <span style={{ color: 'var(--text)', fontFamily: 'monospace', fontWeight: 600 }}>SAR {formatSAR(totalDebit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '4px 0', color: 'var(--text-muted)' }}>
              <span>Total Credit:</span>
              <span style={{ color: 'var(--text)', fontFamily: 'monospace', fontWeight: 600 }}>SAR {formatSAR(totalCredit)}</span>
            </div>
            <div style={{ padding: '8px 0 4px', borderTop: '2px solid var(--border)', marginTop: 4, fontWeight: 700, fontSize: 14, color: isBalanced ? 'var(--success)' : 'var(--danger)', textAlign: 'right' }}>
              {isBalanced ? '✓ Balanced' : `Difference: SAR ${formatSAR(Math.abs(difference))}`}
            </div>
          </div>
        </div>
      </div>

      <KbdStatusBar
        shortcuts={[
          { key: 'F2', label: 'Save & Post' },
          { key: 'Esc', label: 'Leave' },
        ]}
        message={statusMsg || (saveMutation.isPending ? 'Saving...' : '')}
        messageType={statusType}
      />

      <EscapeMenu
        isOpen={escapeOpen}
        onSave={() => { setEscapeOpen(false); handleSave(); }}
        onDiscard={() => navigate('/journal')}
        onStay={() => setEscapeOpen(false)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
