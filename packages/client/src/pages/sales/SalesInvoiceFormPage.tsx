import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import KbdField from '../../components/kbd/KbdField';
import KbdSelect from '../../components/kbd/KbdSelect';
import KbdLookup from '../../components/kbd/KbdLookup';
import InvoiceGrid, { InvoiceLine as GridLine, newLine } from '../../components/InvoiceGrid';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';
import { useFormNav } from '../../components/kbd/useFormNav';

type InvoiceLine = GridLine;

interface CustomerInfo {
  id: number;
  companyName: string;
  taxId: string | null;
  crNumber: string | null;
  buildingNumber: string | null;
  streetName: string | null;
  additionalNumber: string | null;
  district: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
}

interface InvoiceForm {
  customerId: number | null;
  customerName: string;
  customer: CustomerInfo | null;
  invoiceDate: string;
  supplyDate: string;
  dueDate: string;
  invoiceType: string;
  paymentMeans: string;
  currency: string;
  soReference: string;
  status: string;
  notes: string;
  lines: InvoiceLine[];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function calcLine(line: InvoiceLine): number {
  const qty = parseFloat(line.qty) || 0;
  const up = parseFloat(line.unitPrice) || 0;
  const disc = parseFloat(line.discPct) || 0;
  const upHalalas = Math.round(up * 100);
  return Math.round(qty * upHalalas * (1 - disc / 100));
}

function calcLineTax(line: InvoiceLine): number {
  const tax = parseFloat(line.taxRate) || 0;
  return Math.round(calcLine(line) * tax / 100);
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FIELD_IDS = ['customer', 'invoiceDate', 'supplyDate', 'dueDate', 'invoiceType', 'paymentMeans', 'currency', 'soReference', 'notes'];

const CURRENCY_OPTIONS = [
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
];

const INVOICE_TYPE_OPTIONS = [
  { value: 'standard', label: 'Standard (B2B — Clearance)' },
  { value: 'simplified', label: 'Simplified (B2C — Reporting)' },
];

const PAYMENT_MEANS_OPTIONS = [
  { value: 'credit', label: 'Credit / On Account' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
];

// ── Customer info panel ───────────────────────────────────────────────────────
function CustomerPanel({ customer }: { customer: CustomerInfo }) {
  const isB2B = !!(customer.taxId && customer.taxId.length === 15 && customer.taxId.startsWith('3'));
  const hasAddress = customer.buildingNumber || customer.streetName || customer.city;

  const addrLine = [
    customer.buildingNumber && `Bldg ${customer.buildingNumber}`,
    customer.streetName,
    customer.additionalNumber && `(Add. ${customer.additionalNumber})`,
  ].filter(Boolean).join(', ');

  const cityLine = [customer.district, customer.city, customer.postalCode, customer.country]
    .filter(Boolean).join(', ');

  const missing: string[] = [];
  if (!customer.taxId && isB2B) missing.push('VAT number');
  if (!customer.buildingNumber) missing.push('Building number');
  if (!customer.streetName) missing.push('Street name');
  if (!customer.city) missing.push('City');
  if (!customer.postalCode) missing.push('Postal code');

  return (
    <div style={{
      background: isB2B ? 'var(--primary-subtle)' : 'var(--bg-elevated)',
      border: `1px solid ${isB2B ? 'var(--primary)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-sm)',
      padding: '12px 16px',
      marginTop: 8,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 20,
      fontSize: 13,
    }}>
      {/* Type badge */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
        <span style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 10px',
          borderRadius: 10, alignSelf: 'flex-start',
          background: isB2B ? 'var(--primary)' : 'var(--bg-surface)',
          color: isB2B ? 'var(--primary-fg)' : 'var(--text-muted)',
        }}>
          {isB2B ? 'B2B — Standard' : 'B2C — Simplified'}
        </span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{customer.companyName}</span>
        {customer.phone && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{customer.phone}</span>}
        {customer.email && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{customer.email}</span>}
      </div>

      {/* Tax info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tax / CRN</span>
        <span style={{ color: customer.taxId ? 'var(--text)' : 'var(--text-faint)', fontFamily: 'monospace' }}>
          VAT: {customer.taxId || '— not set'}
        </span>
        <span style={{ color: customer.crNumber ? 'var(--text)' : 'var(--text-faint)', fontFamily: 'monospace', fontSize: 12 }}>
          CR: {customer.crNumber || '— not set'}
        </span>
      </div>

      {/* Address */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Address</span>
        {hasAddress ? (
          <>
            {addrLine && <span style={{ color: 'var(--text)' }}>{addrLine}</span>}
            {cityLine && <span style={{ color: 'var(--text)', fontSize: 12 }}>{cityLine}</span>}
          </>
        ) : (
          <span style={{ color: 'var(--text-faint)', fontSize: 12 }}>No structured address</span>
        )}
      </div>

      {/* Warnings */}
      {isB2B && missing.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: 0.5 }}>ZATCA Gaps</span>
          {missing.map(m => (
            <span key={m} style={{ fontSize: 12, color: 'var(--warning)' }}>⚠ {m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export default function SalesInvoiceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === 'new';
  const nav = useFormNav(FIELD_IDS);

  const [form, setForm] = useState<InvoiceForm>({
    customerId: null,
    customerName: '',
    customer: null,
    invoiceDate: today(),
    supplyDate: today(),
    dueDate: today(),
    invoiceType: 'standard',
    paymentMeans: 'credit',
    currency: 'SAR',
    soReference: '',
    status: 'draft',
    notes: '',
    lines: [newLine()],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [escapeOpen, setEscapeOpen] = useState(false);
  const leaveAfterSave = useRef(false);

  // Load existing record
  const { data: existing } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['sales-invoice', id],
    queryFn: () => api.get(`/sales-invoices/${id}`).then(r => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing?.data) {
      const d = existing.data;
      const customer = d['customer'] as CustomerInfo | undefined;
      const linesRaw = (d['lines'] as Record<string, unknown>[] | undefined) ?? [];
      setForm({
        customerId: Number(d['customerId']) || null,
        customerName: String(customer?.companyName ?? ''),
        customer: customer ?? null,
        invoiceDate: String(d['invoiceDate'] ?? today()).split('T')[0],
        supplyDate: String(d['supplyDate'] ?? today()).split('T')[0],
        dueDate: String(d['dueDate'] ?? today()).split('T')[0],
        invoiceType: String(d['invoiceType'] ?? 'standard'),
        paymentMeans: String(d['paymentMeans'] ?? 'credit'),
        currency: String(d['currency'] ?? 'SAR'),
        soReference: String(d['soNumber'] ?? d['soReference'] ?? ''),
        status: String(d['status'] ?? 'draft'),
        notes: String(d['notes'] ?? ''),
        lines: linesRaw.length
          ? linesRaw.map(l => ({
              product: '',
              productId: l['productId'] ? Number(l['productId']) : null,
              description: String(l['description'] ?? ''),
              qty: String(l['quantity'] ?? '1'),
              unitPrice: String((Number(l['unitPrice'] ?? 0) / 100).toFixed(2)),
              discPct: String(l['discountPct'] ?? '0'),
              taxRate: String(l['taxRate'] ?? '15'),
            }))
          : [newLine()],
      });
    }
  }, [existing]);

  // When customer changes, auto-set invoiceType based on their taxId
  const handleCustomerSelect = async (cid: number, label: string) => {
    setForm(f => ({ ...f, customerId: cid, customerName: label, customer: null }));
    try {
      const r = await api.get(`/customers/${cid}`);
      const c = r.data.data as CustomerInfo;
      const isB2B = !!(c.taxId && c.taxId.length === 15 && c.taxId.startsWith('3'));
      setForm(f => ({
        ...f,
        customer: c,
        invoiceType: isB2B ? 'standard' : 'simplified',
      }));
    } catch { /* ignore */ }
  };

  const subtotal = form.lines.reduce((acc, l) => acc + calcLine(l), 0);
  const discountAmount = form.lines.reduce((acc, l) => {
    const qty = parseFloat(l.qty) || 0;
    const up = Math.round((parseFloat(l.unitPrice) || 0) * 100);
    const disc = parseFloat(l.discPct) || 0;
    return acc + Math.round(qty * up * disc / 100);
  }, 0);
  const taxAmount = form.lines.reduce((acc, l) => acc + calcLineTax(l), 0);
  const totalDue = subtotal + taxAmount;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.customerId) errs['customer'] = 'Customer is required';
    if (!form.invoiceDate) errs['invoiceDate'] = 'Invoice date is required';
    if (!form.dueDate) errs['dueDate'] = 'Due date is required';
    if (form.lines.every(l => !l.product && !l.description && !l.unitPrice)) errs['lines'] = 'At least one line is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    customerId: form.customerId,
    invoiceDate: form.invoiceDate,
    supplyDate: form.supplyDate || form.invoiceDate,
    dueDate: form.dueDate,
    invoiceType: form.invoiceType,
    paymentMeans: form.paymentMeans,
    currency: form.currency,
    notes: form.notes,
    lines: form.lines
      .filter(l => l.product || l.description || l.unitPrice)
      .map(l => ({
        productId: l.productId ?? undefined,
        description: l.description || l.product,
        quantity: parseFloat(l.qty) || 0,
        unitPrice: Math.round((parseFloat(l.unitPrice) || 0) * 100),
        discountPct: parseFloat(l.discPct) || 0,
        taxRate: parseFloat(l.taxRate) || 0,
      })),
    createdBy: 1,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/sales-invoices', buildPayload()).then(r => r.data)
        : api.put(`/sales-invoices/${id}`, buildPayload()).then(r => r.data),
    onSuccess: (data: { data?: { id?: unknown } }) => {
      setStatusMsg('Saved ✓');
      setStatusType('success');
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      const newId = data?.data?.id;
      if (leaveAfterSave.current) { leaveAfterSave.current = false; navigate('/sales-invoices'); return; }
      setTimeout(() => {
        setStatusMsg('');
        if (isNew && newId) navigate(`/sales-invoices/${newId}`);
      }, 2000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data?.message
        ?? (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? 'Save failed';
      setApiError(msg);
    },
  });

  const postMutation = useMutation({
    mutationFn: () => api.post(`/sales-invoices/${id}/post`).then(r => r.data),
    onSuccess: () => {
      setStatusMsg('Posted ✓');
      setStatusType('success');
      setForm(f => ({ ...f, status: 'posted' }));
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Post failed';
      setApiError(msg);
    },
  });

  const handleSave = useCallback(() => {
    if (!validate()) return;
    setApiError('');
    saveMutation.mutate();
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePost = useCallback(() => {
    if (isNew) { setApiError('Save the invoice first before posting.'); return; }
    if (form.status === 'posted') { setApiError('Invoice is already posted.'); return; }
    setApiError('');
    postMutation.mutate();
  }, [isNew, form.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handleSave(); }
      if (e.key === 'F8') { e.preventDefault(); handlePost(); }
      if (e.key === 'Escape') { e.preventDefault(); setEscapeOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handlePost]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCustomers = async (search: string) => {
    const r = await api.get(`/customers?search=${encodeURIComponent(search)}`);
    const items = (r.data?.data ?? r.data ?? []) as Record<string, unknown>[];
    return items.map(c => ({
      id: Number(c['id']),
      label: String(c['companyName'] ?? ''),
      sub: String(c['code'] ?? ''),
    }));
  };

  const isPosted = form.status === 'posted';

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
  const card: React.CSSProperties = {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 24, marginBottom: 16, boxShadow: 'var(--shadow-sm)',
  };
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
  };

  return (
    <div style={{ maxWidth: 980, fontFamily: 'var(--font)' }}>
      {apiError && (
        <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, border: '1px solid var(--danger)' }}>
          {apiError}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {isNew ? 'New Sales Invoice' : `Invoice ${existing?.data?.['invoiceNumber'] ?? id}`}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, margin: '4px 0 0' }}>
            {isNew ? 'Create a ZATCA-compliant sales invoice' : `Status: ${form.status}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/sales-invoices')} style={btnSecondary}>Cancel</button>
          {!isNew && (
            <button
              onClick={handlePost}
              disabled={postMutation.isPending || isPosted}
              style={{ ...btnSecondary, color: 'var(--primary)', borderColor: 'var(--primary)', opacity: isPosted ? 0.5 : 1 }}
            >
              {postMutation.isPending ? 'Posting…' : 'Post (F8)'}
            </button>
          )}
          <button onClick={handleSave} disabled={saveMutation.isPending || isPosted} style={btnPrimary}>
            {saveMutation.isPending ? 'Saving…' : 'Save (F2)'}
          </button>
        </div>
      </div>

      {/* ── Customer & Invoice Details ── */}
      <div style={card}>
        <p style={sectionLabel}>Customer & Invoice</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
          {/* Left column */}
          <div>
            <KbdLookup
              id="customer"
              label="Customer *"
              value={form.customerName}
              selectedId={form.customerId}
              onSelect={(cid, label) => { handleCustomerSelect(cid, label); }}
              onNext={() => nav.nextField('customer')}
              onPrev={() => nav.prevField('customer')}
              fetchOptions={fetchCustomers}
              error={errors['customer']}
              required
            />

            {/* Customer ZATCA panel */}
            {form.customer && <CustomerPanel customer={form.customer} />}

            <div style={{ marginTop: form.customer ? 16 : 0 }}>
              <KbdField id="invoiceDate" label="Invoice Date" type="date" value={form.invoiceDate}
                onChange={v => setForm(f => ({ ...f, invoiceDate: v }))}
                onNext={() => nav.nextField('invoiceDate')} onPrev={() => nav.prevField('invoiceDate')}
                error={errors['invoiceDate']} />
              <KbdField id="supplyDate" label="Supply / Delivery Date" type="date" value={form.supplyDate}
                onChange={v => setForm(f => ({ ...f, supplyDate: v }))}
                onNext={() => nav.nextField('supplyDate')} onPrev={() => nav.prevField('supplyDate')} />
              <KbdField id="dueDate" label="Due Date" type="date" value={form.dueDate}
                onChange={v => setForm(f => ({ ...f, dueDate: v }))}
                onNext={() => nav.nextField('dueDate')} onPrev={() => nav.prevField('dueDate')}
                error={errors['dueDate']} />
            </div>
          </div>

          {/* Right column */}
          <div>
            <KbdSelect id="invoiceType" label="Invoice Type (ZATCA)"
              value={form.invoiceType}
              onChange={v => setForm(f => ({ ...f, invoiceType: v }))}
              options={INVOICE_TYPE_OPTIONS}
              onNext={() => nav.nextField('invoiceType')} onPrev={() => nav.prevField('invoiceType')} />

            <KbdSelect id="paymentMeans" label="Payment Means"
              value={form.paymentMeans}
              onChange={v => setForm(f => ({ ...f, paymentMeans: v }))}
              options={PAYMENT_MEANS_OPTIONS}
              onNext={() => nav.nextField('paymentMeans')} onPrev={() => nav.prevField('paymentMeans')} />

            <KbdSelect id="currency" label="Currency"
              value={form.currency}
              onChange={v => setForm(f => ({ ...f, currency: v }))}
              options={CURRENCY_OPTIONS}
              onNext={() => nav.nextField('currency')} onPrev={() => nav.prevField('currency')} />

            <KbdField id="soReference" label="SO Reference"
              value={form.soReference}
              onChange={v => setForm(f => ({ ...f, soReference: v }))}
              onNext={() => nav.nextField('soReference')} onPrev={() => nav.prevField('soReference')}
              readOnly={!isNew && !!form.soReference} />

            <KbdField id="status" label="Status" value={form.status}
              onChange={() => {}} readOnly />

            <KbdField id="notes" label="Notes" value={form.notes}
              onChange={v => setForm(f => ({ ...f, notes: v }))}
              onNext={() => nav.nextField('notes')} onPrev={() => nav.prevField('notes')}
              multiline />
          </div>
        </div>
      </div>

      {/* ── Invoice Lines ── */}
      <div style={card}>
        <p style={sectionLabel}>Invoice Lines</p>
        {errors['lines'] && (
          <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 13 }}>
            {errors['lines']}
          </div>
        )}
        <InvoiceGrid rows={form.lines} onChange={rows => setForm(f => ({ ...f, lines: rows }))} readOnly={isPosted} />
      </div>

      {/* ── Totals ── */}
      <div style={{ ...card, padding: '16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 300, fontFamily: 'var(--font)', fontSize: 13 }}>
            {[
              { label: 'Subtotal (excl. VAT)', value: subtotal },
              { label: 'Discount', value: discountAmount },
              { label: 'VAT (15%)', value: taxAmount },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '5px 0', color: 'var(--text-muted)' }}>
                <span>{label}</span>
                <span style={{ color: 'var(--text)', fontFamily: 'monospace' }}>{formatSAR(value)} {form.currency}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '10px 0 4px', borderTop: '2px solid var(--border)', marginTop: 4, fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              <span>TOTAL DUE</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{formatSAR(totalDue)} {form.currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '3px 0', fontSize: 12, color: 'var(--text-faint)' }}>
              <span>In words (SAR)</span>
              <span>{formatSAR(totalDue)} SAR</span>
            </div>
          </div>
        </div>
      </div>

      <KbdStatusBar
        shortcuts={[
          { key: 'F2', label: 'Save' },
          { key: 'F8', label: 'Post' },
          { key: 'Esc', label: 'Leave' },
        ]}
        message={statusMsg || (saveMutation.isPending ? 'Saving...' : postMutation.isPending ? 'Posting...' : '')}
        messageType={statusType}
      />

      <EscapeMenu
        isOpen={escapeOpen}
        onSave={() => { leaveAfterSave.current = true; setEscapeOpen(false); handleSave(); }}
        onDiscard={() => navigate('/sales-invoices')}
        onStay={() => setEscapeOpen(false)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
