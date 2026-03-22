import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import KbdField from '../../components/kbd/KbdField';
import KbdSelect from '../../components/kbd/KbdSelect';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';
import { useFormNav } from '../../components/kbd/useFormNav';

interface SupplierForm {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  // ZATCA
  taxId: string;
  crNumber: string;
  streetName: string;
  buildingNumber: string;
  additionalNumber: string;
  district: string;
  city: string;
  postalCode: string;
  country: string;
  // Banking
  bankName: string;
  bankAccount: string;
  bankIban: string;
  paymentTermsDays: string;
  currency: string;
  isActive: string;
}

const FIELD_IDS = [
  'companyName', 'contactName', 'email', 'phone',
  'taxId', 'crNumber',
  'buildingNumber', 'streetName', 'additionalNumber', 'district', 'city', 'postalCode', 'country',
  'bankName', 'bankAccount', 'bankIban', 'paymentTermsDays', 'currency', 'isActive',
];

const CURRENCY_OPTIONS = [
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
];
const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

function defaultForm(): SupplierForm {
  return {
    companyName: '', contactName: '', email: '', phone: '',
    taxId: '', crNumber: '',
    streetName: '', buildingNumber: '', additionalNumber: '',
    district: '', city: '', postalCode: '', country: 'SA',
    bankName: '', bankAccount: '', bankIban: '',
    paymentTermsDays: '30', currency: 'SAR', isActive: 'true',
  };
}

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
  textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
};
const card: React.CSSProperties = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: 24, marginBottom: 16, boxShadow: 'var(--shadow-sm)',
};

export default function SupplierFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === 'new';
  const nav = useFormNav(FIELD_IDS);

  const [form, setForm] = useState<SupplierForm>(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [escapeOpen, setEscapeOpen] = useState(false);
  const leaveAfterSave = useRef(false);

  const { data: existing } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['supplier', id],
    queryFn: () => api.get(`/suppliers/${id}`).then(r => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing?.data) {
      const d = existing.data;
      setForm({
        companyName: String(d['companyName'] ?? ''),
        contactName: String(d['contactName'] ?? ''),
        email: String(d['email'] ?? ''),
        phone: String(d['phone'] ?? ''),
        taxId: String(d['taxId'] ?? ''),
        crNumber: String(d['crNumber'] ?? ''),
        streetName: String(d['streetName'] ?? ''),
        buildingNumber: String(d['buildingNumber'] ?? ''),
        additionalNumber: String(d['additionalNumber'] ?? ''),
        district: String(d['district'] ?? ''),
        city: String(d['city'] ?? ''),
        postalCode: String(d['postalCode'] ?? ''),
        country: String(d['country'] ?? 'SA'),
        bankName: String(d['bankName'] ?? ''),
        bankAccount: String(d['bankAccount'] ?? ''),
        bankIban: String(d['bankIban'] ?? ''),
        paymentTermsDays: String(d['paymentTermsDays'] ?? '30'),
        currency: String(d['currency'] ?? 'SAR'),
        isActive: String(d['isActive'] ?? 'true'),
      });
    }
  }, [existing]);

  const isB2B = form.taxId.trim().length === 15 && form.taxId.startsWith('3');
  const vatStatus = form.taxId.trim()
    ? isB2B ? 'Registered — B2B' : 'Invalid format'
    : 'Not registered — B2C';

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs['companyName'] = 'Company name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs['email'] = 'Invalid email';
    if (form.taxId.trim() && (form.taxId.trim().length !== 15 || !form.taxId.startsWith('3')))
      errs['taxId'] = 'VAT must be 15 digits starting with 3';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    companyName: form.companyName,
    contactName: form.contactName || null,
    email: form.email || null,
    phone: form.phone || null,
    taxId: form.taxId || null,
    crNumber: form.crNumber || null,
    streetName: form.streetName || null,
    buildingNumber: form.buildingNumber || null,
    additionalNumber: form.additionalNumber || null,
    district: form.district || null,
    city: form.city || null,
    postalCode: form.postalCode || null,
    country: form.country || 'SA',
    bankName: form.bankName || null,
    bankAccount: form.bankAccount || null,
    bankIban: form.bankIban || null,
    paymentTermsDays: parseInt(form.paymentTermsDays) || 30,
    currency: form.currency,
    isActive: form.isActive === 'true',
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/suppliers', buildPayload()).then(r => r.data)
        : api.put(`/suppliers/${id}`, buildPayload()).then(r => r.data),
    onSuccess: (data: { data?: { id?: unknown } }) => {
      setStatusMsg('Saved ✓');
      setStatusType('success');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      const newId = data?.data?.id;
      if (leaveAfterSave.current) { leaveAfterSave.current = false; navigate('/suppliers'); return; }
      setTimeout(() => { setStatusMsg(''); if (isNew && newId) navigate(`/suppliers/${newId}`); }, 2000);
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

  const f = (key: keyof SupplierForm, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', background: 'var(--primary)', color: 'var(--primary-fg)',
    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font)',
  };
  const btnSecondary: React.CSSProperties = {
    padding: '8px 16px', background: 'var(--bg-elevated)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13,
    cursor: 'pointer', fontFamily: 'var(--font)',
  };

  return (
    <div style={{ maxWidth: 860, fontFamily: 'var(--font)' }}>
      {apiError && (
        <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, border: '1px solid var(--danger)' }}>
          {apiError}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {isNew ? 'New Supplier' : 'Edit Supplier'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {isNew ? 'Create a new supplier record' : `Editing ${form.companyName}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/suppliers')} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={btnPrimary}>
            {saveMutation.isPending ? 'Saving…' : 'Save (F2)'}
          </button>
        </div>
      </div>

      {/* ── Company Details ── */}
      <div style={card}>
        <p style={sectionLabel}>Company Details</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <KbdField id="companyName" label="Company Name" value={form.companyName}
              onChange={v => f('companyName', v)} onNext={() => nav.nextField('companyName')}
              autoFocus required error={errors['companyName']} />
            <KbdField id="contactName" label="Contact Name" value={form.contactName}
              onChange={v => f('contactName', v)} onNext={() => nav.nextField('contactName')}
              onPrev={() => nav.prevField('contactName')} />
            <KbdField id="email" label="Email" type="email" value={form.email}
              onChange={v => f('email', v)} onNext={() => nav.nextField('email')}
              onPrev={() => nav.prevField('email')} error={errors['email']} />
          </div>
          <div>
            <KbdField id="phone" label="Phone" value={form.phone}
              onChange={v => f('phone', v)} onNext={() => nav.nextField('phone')}
              onPrev={() => nav.prevField('phone')} />
            <KbdSelect id="currency" label="Currency" value={form.currency}
              onChange={v => f('currency', v)} options={CURRENCY_OPTIONS}
              onNext={() => nav.nextField('currency')} onPrev={() => nav.prevField('currency')} />
            <KbdSelect id="isActive" label="Active" value={form.isActive}
              onChange={v => f('isActive', v)} options={ACTIVE_OPTIONS}
              onNext={() => nav.nextField('isActive')} onPrev={() => nav.prevField('isActive')} />
          </div>
        </div>
      </div>

      {/* ── ZATCA / Tax ── */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ ...sectionLabel, marginBottom: 0 }}>ZATCA / Tax Identification</p>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
            background: isB2B ? 'var(--primary-subtle)' : 'var(--bg-elevated)',
            color: isB2B ? 'var(--primary-light)' : form.taxId.trim() ? 'var(--danger)' : 'var(--text-muted)',
          }}>
            {vatStatus}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <KbdField id="taxId" label="VAT Registration Number (15 digits, starts with 3)"
            value={form.taxId} onChange={v => f('taxId', v)}
            onNext={() => nav.nextField('taxId')} onPrev={() => nav.prevField('taxId')}
            error={errors['taxId']} hint="e.g. 3XXXXXXXXXXXXX" />
          <KbdField id="crNumber" label="CR Number (Commercial Registration)"
            value={form.crNumber} onChange={v => f('crNumber', v)}
            onNext={() => nav.nextField('crNumber')} onPrev={() => nav.prevField('crNumber')}
            hint="e.g. 1010XXXXXX" />
        </div>
      </div>

      {/* ── ZATCA Structured Address ── */}
      <div style={card}>
        <p style={sectionLabel}>ZATCA Structured Address <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(for purchase invoices)</span></p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <KbdField id="buildingNumber" label="Building Number"
              value={form.buildingNumber} onChange={v => f('buildingNumber', v)}
              onNext={() => nav.nextField('buildingNumber')} onPrev={() => nav.prevField('buildingNumber')}
              hint="e.g. 1234" />
            <KbdField id="streetName" label="Street Name"
              value={form.streetName} onChange={v => f('streetName', v)}
              onNext={() => nav.nextField('streetName')} onPrev={() => nav.prevField('streetName')}
              hint="e.g. King Fahad Road" />
            <KbdField id="additionalNumber" label="Additional Number"
              value={form.additionalNumber} onChange={v => f('additionalNumber', v)}
              onNext={() => nav.nextField('additionalNumber')} onPrev={() => nav.prevField('additionalNumber')}
              hint="e.g. 5678" />
          </div>
          <div>
            <KbdField id="district" label="District / Neighbourhood"
              value={form.district} onChange={v => f('district', v)}
              onNext={() => nav.nextField('district')} onPrev={() => nav.prevField('district')}
              hint="e.g. Al Olaya" />
            <KbdField id="city" label="City"
              value={form.city} onChange={v => f('city', v)}
              onNext={() => nav.nextField('city')} onPrev={() => nav.prevField('city')}
              hint="e.g. Riyadh" />
            <KbdField id="postalCode" label="Postal Code"
              value={form.postalCode} onChange={v => f('postalCode', v)}
              onNext={() => nav.nextField('postalCode')} onPrev={() => nav.prevField('postalCode')}
              hint="e.g. 12345" />
            <KbdField id="country" label="Country Code"
              value={form.country} onChange={v => f('country', v)}
              onNext={() => nav.nextField('country')} onPrev={() => nav.prevField('country')}
              hint="SA" />
          </div>
        </div>
      </div>

      {/* ── Banking & Payment ── */}
      <div style={card}>
        <p style={sectionLabel}>Banking & Payment</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <KbdField id="bankName" label="Bank Name"
              value={form.bankName} onChange={v => f('bankName', v)}
              onNext={() => nav.nextField('bankName')} onPrev={() => nav.prevField('bankName')} />
            <KbdField id="bankAccount" label="Account Number"
              value={form.bankAccount} onChange={v => f('bankAccount', v)}
              onNext={() => nav.nextField('bankAccount')} onPrev={() => nav.prevField('bankAccount')} />
            <KbdField id="bankIban" label="IBAN"
              value={form.bankIban} onChange={v => f('bankIban', v)}
              onNext={() => nav.nextField('bankIban')} onPrev={() => nav.prevField('bankIban')}
              hint="SA + 22 digits" />
          </div>
          <div>
            <KbdField id="paymentTermsDays" label="Payment Terms (days)" type="number"
              value={form.paymentTermsDays} onChange={v => f('paymentTermsDays', v)}
              onNext={() => nav.nextField('paymentTermsDays')} onPrev={() => nav.prevField('paymentTermsDays')} />
          </div>
        </div>
      </div>

      <KbdStatusBar
        shortcuts={[{ key: 'F2', label: 'Save' }, { key: 'Esc', label: 'Leave' }]}
        message={statusMsg || (saveMutation.isPending ? 'Saving...' : '')}
        messageType={statusType}
      />

      <EscapeMenu
        isOpen={escapeOpen}
        onSave={() => { leaveAfterSave.current = true; setEscapeOpen(false); handleSave(); }}
        onDiscard={() => navigate('/suppliers')}
        onStay={() => setEscapeOpen(false)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
