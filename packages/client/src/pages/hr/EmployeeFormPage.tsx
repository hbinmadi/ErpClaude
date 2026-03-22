import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import KbdField from '../../components/kbd/KbdField';
import KbdSelect from '../../components/kbd/KbdSelect';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';
import { useFormNav } from '../../components/kbd/useFormNav';

interface EmployeeForm {
  fullName: string;
  email: string;
  phone: string;
  nationalId: string;
  jobTitle: string;
  employmentType: string;
  hireDate: string;
  basicSalary: string;   // display SAR
  bankName: string;
  bankAccountNumber: string;
  isActive: string;
}

const FIELD_IDS = [
  'fullName', 'email', 'phone', 'nationalId', 'jobTitle',
  'employmentType', 'hireDate', 'basicSalary', 'bankName', 'bankAccountNumber', 'isActive',
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
];

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

function defaultForm(): EmployeeForm {
  return {
    fullName: '',
    email: '',
    phone: '',
    nationalId: '',
    jobTitle: '',
    employmentType: 'full_time',
    hireDate: new Date().toISOString().split('T')[0],
    basicSalary: '0.00',
    bankName: '',
    bankAccountNumber: '',
    isActive: 'true',
  };
}

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === 'new';
  const nav = useFormNav(FIELD_IDS);

  const [form, setForm] = useState<EmployeeForm>(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [escapeOpen, setEscapeOpen] = useState(false);
  const leaveAfterSave = useRef(false);

  const { data: existing } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['employee', id],
    queryFn: () => api.get(`/employees/${id}`).then(r => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing?.data) {
      const d = existing.data;
      setForm({
        fullName: String(d['fullName'] ?? d['name'] ?? ''),
        email: String(d['email'] ?? ''),
        phone: String(d['phone'] ?? ''),
        nationalId: String(d['nationalId'] ?? ''),
        jobTitle: String(d['jobTitle'] ?? ''),
        employmentType: String(d['employmentType'] ?? 'full_time'),
        hireDate: String(d['hireDate'] ?? '').split('T')[0],
        basicSalary: String((Number(d['basicSalary'] ?? d['salary'] ?? 0) / 100).toFixed(2)),
        bankName: String(d['bankName'] ?? ''),
        bankAccountNumber: String(d['bankAccountNumber'] ?? d['bankAccount'] ?? ''),
        isActive: String(d['isActive'] ?? 'true'),
      });
    }
  }, [existing]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs['fullName'] = 'Full name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs['email'] = 'Invalid email';
    if (!form.hireDate) errs['hireDate'] = 'Hire date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    fullName: form.fullName,
    email: form.email,
    phone: form.phone,
    nationalId: form.nationalId,
    jobTitle: form.jobTitle,
    employmentType: form.employmentType,
    hireDate: form.hireDate,
    basicSalary: Math.round((parseFloat(form.basicSalary) || 0) * 100),
    bankName: form.bankName,
    bankAccountNumber: form.bankAccountNumber,
    isActive: form.isActive === 'true',
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/employees', buildPayload()).then(r => r.data)
        : api.put(`/employees/${id}`, buildPayload()).then(r => r.data),
    onSuccess: (data: { data?: { id?: unknown } }) => {
      setStatusMsg('Saved ✓');
      setStatusType('success');
      qc.invalidateQueries({ queryKey: ['employees'] });
      const newId = data?.data?.id;
      if (leaveAfterSave.current) {
        leaveAfterSave.current = false;
        navigate('/employees');
        return;
      }
      setTimeout(() => {
        setStatusMsg('');
        if (isNew && newId) navigate(`/employees/${newId}`);
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
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); setEscapeOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const f = (key: keyof EmployeeForm, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }));

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
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {isNew ? 'New Employee' : 'Edit Employee'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
            {isNew ? 'Create a new employee record' : `Editing ${form.fullName}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/employees')} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={btnPrimary}>
            {saveMutation.isPending ? 'Saving…' : 'Save (F2)'}
          </button>
        </div>
      </div>

      {/* Main form card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
          Employee Details
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          {/* Left column */}
          <div>
            <KbdField
              id="fullName"
              label="Full Name"
              value={form.fullName}
              onChange={v => f('fullName', v)}
              onNext={() => nav.nextField('fullName')}
              autoFocus
              required
              error={errors['fullName']}
              width="w-64"
            />
            <KbdField
              id="phone"
              label="Phone"
              value={form.phone}
              onChange={v => f('phone', v)}
              onNext={() => nav.nextField('phone')}
              onPrev={() => nav.prevField('phone')}
              width="w-48"
            />
            <KbdField
              id="jobTitle"
              label="Job Title"
              value={form.jobTitle}
              onChange={v => f('jobTitle', v)}
              onNext={() => nav.nextField('jobTitle')}
              onPrev={() => nav.prevField('jobTitle')}
              width="w-56"
            />
            <KbdField
              id="hireDate"
              label="Hire Date"
              type="date"
              value={form.hireDate}
              onChange={v => f('hireDate', v)}
              onNext={() => nav.nextField('hireDate')}
              onPrev={() => nav.prevField('hireDate')}
              error={errors['hireDate']}
            />
            <KbdField
              id="bankName"
              label="Bank Name"
              value={form.bankName}
              onChange={v => f('bankName', v)}
              onNext={() => nav.nextField('bankName')}
              onPrev={() => nav.prevField('bankName')}
              width="w-56"
            />
          </div>
          {/* Right column */}
          <div>
            <KbdField
              id="email"
              label="Email"
              type="email"
              value={form.email}
              onChange={v => f('email', v)}
              onNext={() => nav.nextField('email')}
              onPrev={() => nav.prevField('email')}
              error={errors['email']}
              width="w-64"
            />
            <KbdField
              id="nationalId"
              label="National ID"
              value={form.nationalId}
              onChange={v => f('nationalId', v)}
              onNext={() => nav.nextField('nationalId')}
              onPrev={() => nav.prevField('nationalId')}
              width="w-48"
            />
            <KbdSelect
              id="employmentType"
              label="Employ. Type"
              value={form.employmentType}
              onChange={v => f('employmentType', v)}
              options={EMPLOYMENT_TYPE_OPTIONS}
              onNext={() => nav.nextField('employmentType')}
              onPrev={() => nav.prevField('employmentType')}
              width="w-40"
            />
            <KbdField
              id="basicSalary"
              label="Basic Salary SAR"
              type="number"
              value={form.basicSalary}
              onChange={v => f('basicSalary', v)}
              onNext={() => nav.nextField('basicSalary')}
              onPrev={() => nav.prevField('basicSalary')}
              width="w-32"
            />
            <KbdField
              id="bankAccountNumber"
              label="Bank Account"
              value={form.bankAccountNumber}
              onChange={v => f('bankAccountNumber', v)}
              onNext={() => nav.nextField('bankAccountNumber')}
              onPrev={() => nav.prevField('bankAccountNumber')}
              width="w-56"
            />
            <KbdSelect
              id="isActive"
              label="Active"
              value={form.isActive}
              onChange={v => f('isActive', v)}
              options={ACTIVE_OPTIONS}
              onNext={() => nav.nextField('isActive')}
              onPrev={() => nav.prevField('isActive')}
              width="w-24"
            />
          </div>
        </div>
      </div>

      <KbdStatusBar
        shortcuts={[
          { key: 'F2', label: 'Save' },
          { key: 'Esc', label: 'Leave' },
        ]}
        message={statusMsg || (saveMutation.isPending ? 'Saving...' : '')}
        messageType={statusType}
      />

      <EscapeMenu
        isOpen={escapeOpen}
        onSave={() => { leaveAfterSave.current = true; setEscapeOpen(false); handleSave(); }}
        onDiscard={() => navigate('/employees')}
        onStay={() => setEscapeOpen(false)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
