import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../../lib/api';
import PageHeader from '../../components/PageHeader';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';

const field: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4,
};
const label: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', fontWeight: 500,
};
const input: React.CSSProperties = {
  padding: '8px 10px', background: 'var(--bg-surface)',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13, outline: 'none',
};

export default function BranchFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    code: '', name: '', address: '', phone: '',
    isHQ: false, isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [escapeOpen, setEscapeOpen] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/branches/${id}`).then(r => {
      const b = r.data.data;
      setForm({
        code: b.code ?? '',
        name: b.name ?? '',
        address: b.address ?? '',
        phone: b.phone ?? '',
        isHQ: b.isHQ ?? false,
        isActive: b.isActive ?? true,
      });
    }).catch(() => setError('Failed to load branch.'));
  }, [id, isEdit]);

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = useCallback(async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Code and name are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await api.put(`/branches/${id}`, form);
      } else {
        await api.post('/branches', form);
      }
      qc.invalidateQueries({ queryKey: ['branches'] });
      navigate('/branches');
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }, [form, id, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); setEscapeOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-fg)',
    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
    cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', opacity: saving ? 0.7 : 1,
  };
  const btnSecondary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', background: 'var(--bg-elevated)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13,
    cursor: 'pointer', fontFamily: 'var(--font)',
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <PageHeader
          title={isEdit ? 'Edit Branch' : 'New Branch'}
          subtitle={isEdit ? `Branch ID: ${id}` : 'Add a new company branch'}
        />
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => navigate('/branches')} style={btnSecondary}>
            <ArrowLeft size={14} /> Back
          </button>
          <button onClick={handleSave} style={btnPrimary} disabled={saving}>
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'var(--danger-subtle)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
          <div style={field}>
            <span style={label}>Code *</span>
            <input style={input} value={form.code} onChange={e => set('code', e.target.value)} placeholder="BR001" />
          </div>
          <div style={field}>
            <span style={label}>Name *</span>
            <input style={input} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Main Branch" />
          </div>
        </div>

        <div style={field}>
          <span style={label}>Address</span>
          <input style={input} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Branch address" />
        </div>

        <div style={field}>
          <span style={label}>Phone</span>
          <input style={input} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+966 xx xxx xxxx" />
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
            <input type="checkbox" checked={form.isHQ} onChange={e => set('isHQ', e.target.checked)} />
            Headquarters
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', color: 'var(--text)' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} />
            Active
          </label>
        </div>
      </div>

      <KbdStatusBar
        shortcuts={[{ key: 'F2', label: 'Save' }, { key: 'Esc', label: 'Leave' }]}
        message={saving ? 'Saving...' : error ? error : ''}
        messageType={error ? 'error' : 'info'}
      />

      <EscapeMenu
        isOpen={escapeOpen}
        onSave={() => { setEscapeOpen(false); handleSave(); }}
        onDiscard={() => navigate('/branches')}
        onStay={() => setEscapeOpen(false)}
        saving={saving}
      />
    </div>
  );
}
