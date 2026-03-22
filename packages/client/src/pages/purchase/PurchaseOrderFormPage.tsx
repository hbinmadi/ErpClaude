import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import KbdField from '../../components/kbd/KbdField';
import KbdSelect from '../../components/kbd/KbdSelect';
import KbdLookup from '../../components/kbd/KbdLookup';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';
import { useFormNav } from '../../components/kbd/useFormNav';
import POGrid, { POLine, newPOLine } from '../../components/POGrid';

interface SupplierInfo {
  id: number;
  code: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
  crNumber?: string;
  buildingNumber?: string;
  streetName?: string;
  additionalNumber?: string;
  district?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  paymentTermsDays?: number;
}

interface POForm {
  supplierId: number | null;
  supplierName: string;
  warehouseId: string;
  orderDate: string;
  expectedDate: string;
  notes: string;
  status: string;
  lines: POLine[];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function calcLine(line: POLine): { base: number; vat: number; total: number } {
  const qty = parseFloat(line.qty) || 0;
  const uc = parseFloat(line.unitCost) || 0;
  const tax = parseFloat(line.taxRate) || 0;
  const ucH = Math.round(uc * 100);
  const base = Math.round(qty * ucH);
  const vat = Math.round(base * tax / 100);
  return { base, vat, total: base + vat };
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FIELD_IDS = ['supplier', 'warehouse', 'orderDate', 'expectedDate', 'notes'];

const WAREHOUSE_OPTIONS = [
  { value: '1', label: 'Main Warehouse' },
  { value: '2', label: 'Secondary Warehouse' },
];

/* ── Supplier Info Panel ── */
function SupplierPanel({ supplier }: { supplier: SupplierInfo }) {
  const isB2B = supplier.taxId?.trim().length === 15 && supplier.taxId.startsWith('3');

  const addrParts = [
    supplier.buildingNumber && supplier.streetName
      ? `${supplier.buildingNumber} ${supplier.streetName}`
      : supplier.streetName,
    supplier.additionalNumber ? `Unit ${supplier.additionalNumber}` : null,
    supplier.district,
    supplier.city && supplier.postalCode ? `${supplier.city} ${supplier.postalCode}` : supplier.city,
    supplier.country && supplier.country !== 'SA' ? supplier.country : null,
  ].filter(Boolean);

  const missing: string[] = [];
  if (!supplier.taxId) missing.push('VAT number');
  if (!supplier.buildingNumber) missing.push('building number');
  if (!supplier.streetName) missing.push('street name');
  if (!supplier.city) missing.push('city');

  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '14px 18px', marginTop: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{supplier.companyName}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px',
              borderRadius: 99, letterSpacing: 0.5,
              background: isB2B ? 'var(--primary-subtle)' : 'var(--bg-surface)',
              color: isB2B ? 'var(--primary)' : 'var(--text-muted)',
              border: `1px solid ${isB2B ? 'var(--primary)' : 'var(--border)'}`,
            }}>
              {isB2B ? 'B2B' : 'B2C'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px', fontSize: 12, color: 'var(--text-muted)' }}>
            {supplier.phone && <span>Phone: {supplier.phone}</span>}
            {supplier.email && <span>Email: {supplier.email}</span>}
            {supplier.taxId && <span>VAT: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{supplier.taxId}</span></span>}
            {supplier.crNumber && <span>CR: <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{supplier.crNumber}</span></span>}
            {supplier.paymentTermsDays != null && <span>Payment: {supplier.paymentTermsDays} days</span>}
            {addrParts.length > 0 && (
              <span style={{ gridColumn: '1/-1', marginTop: 2 }}>
                Address: {addrParts.join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--warning, #d97706)', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>⚠ ZATCA missing:</span>
          {missing.map(m => (
            <span key={m} style={{ background: 'var(--warning-subtle, rgba(217,119,6,0.1))', padding: '1px 6px', borderRadius: 4 }}>{m}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PurchaseOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === 'new';
  const nav = useFormNav(FIELD_IDS);

  const [form, setForm] = useState<POForm>({
    supplierId: null,
    supplierName: '',
    warehouseId: '1',
    orderDate: today(),
    expectedDate: today(),
    notes: '',
    status: 'draft',
    lines: [newPOLine()],
  });

  const [supplierInfo, setSupplierInfo] = useState<SupplierInfo | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [escapeOpen, setEscapeOpen] = useState(false);
  const leaveAfterSave = useRef(false);

  const { data: existing } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['purchase-order', id],
    queryFn: () => api.get(`/purchase-orders/${id}`).then(r => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing?.data) {
      const d = existing.data;
      const supplier = d['supplier'] as Record<string, unknown> | undefined;
      const linesRaw = (d['lines'] as Record<string, unknown>[] | undefined) ?? [];
      setForm({
        supplierId: Number(d['supplierId']) || null,
        supplierName: String(supplier?.['companyName'] ?? ''),
        warehouseId: String(d['warehouseId'] ?? '1'),
        orderDate: String(d['orderDate'] ?? today()).split('T')[0],
        expectedDate: String(d['expectedDate'] ?? today()).split('T')[0],
        notes: String(d['notes'] ?? ''),
        status: String(d['status'] ?? 'draft'),
        lines: linesRaw.length
          ? linesRaw.map(l => ({
              product: String((l['product'] as Record<string, unknown>)?.['name'] ?? ''),
              productId: Number(l['productId']) || null,
              description: String(l['description'] ?? ''),
              qty: String(l['quantity'] ?? '1'),
              unitCost: String((Number(l['unitCost'] ?? 0) / 100).toFixed(2)),
              taxRate: String(l['taxRate'] ?? '15'),
            }))
          : [newPOLine()],
      });
      if (supplier) {
        setSupplierInfo({
          id: Number(d['supplierId']),
          code: String(supplier['code'] ?? ''),
          companyName: String(supplier['companyName'] ?? ''),
          contactName: String(supplier['contactName'] ?? ''),
          email: String(supplier['email'] ?? ''),
          phone: String(supplier['phone'] ?? ''),
          taxId: String(supplier['taxId'] ?? ''),
          crNumber: String(supplier['crNumber'] ?? ''),
          buildingNumber: String(supplier['buildingNumber'] ?? ''),
          streetName: String(supplier['streetName'] ?? ''),
          additionalNumber: String(supplier['additionalNumber'] ?? ''),
          district: String(supplier['district'] ?? ''),
          city: String(supplier['city'] ?? ''),
          postalCode: String(supplier['postalCode'] ?? ''),
          country: String(supplier['country'] ?? 'SA'),
          paymentTermsDays: Number(supplier['paymentTermsDays']) || undefined,
        });
      }
    }
  }, [existing]);

  const totals = form.lines.reduce(
    (acc, l) => {
      const { base, vat, total } = calcLine(l);
      return { base: acc.base + base, vat: acc.vat + vat, total: acc.total + total };
    },
    { base: 0, vat: 0, total: 0 }
  );

  const handleLinesChange = (rows: POLine[]) => {
    setForm(f => ({ ...f, lines: rows }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.supplierId) errs['supplier'] = 'Supplier is required';
    if (!form.orderDate) errs['orderDate'] = 'Order date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    supplierId: form.supplierId,
    warehouseId: parseInt(form.warehouseId) || 1,
    orderDate: form.orderDate,
    expectedDate: form.expectedDate,
    notes: form.notes,
    lines: form.lines
      .filter(l => l.productId || l.description)
      .map(l => ({
        productId: l.productId,
        description: l.description || l.product,
        quantity: parseFloat(l.qty) || 0,
        unitCost: Math.round((parseFloat(l.unitCost) || 0) * 100),
        taxRate: parseFloat(l.taxRate) || 0,
      })),
    createdBy: 1,
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/purchase-orders', buildPayload()).then(r => r.data)
        : api.put(`/purchase-orders/${id}`, buildPayload()).then(r => r.data),
    onSuccess: (data: { data?: { id?: unknown } }) => {
      setStatusMsg('Saved ✓');
      setStatusType('success');
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      const newId = data?.data?.id;
      if (leaveAfterSave.current) {
        leaveAfterSave.current = false;
        navigate('/purchase-orders');
        return;
      }
      setTimeout(() => {
        setStatusMsg('');
        if (isNew && newId) navigate(`/purchase-orders/${newId}`);
      }, 2000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Save failed';
      setApiError(msg);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/purchase-orders/${id}/submit`).then(r => r.data),
    onSuccess: () => {
      setStatusMsg('Submitted ✓');
      setStatusType('success');
      setForm(f => ({ ...f, status: 'submitted' }));
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Submit failed';
      setApiError(msg);
    },
  });

  const handleSave = useCallback(() => {
    if (!validate()) return;
    setApiError('');
    saveMutation.mutate();
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = useCallback(() => {
    if (isNew) { setApiError('Save first before submitting.'); return; }
    setApiError('');
    submitMutation.mutate();
  }, [isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handleSave(); }
      if (e.key === 'F8') { e.preventDefault(); handleSubmit(); }
      if (e.key === 'Escape') { e.preventDefault(); setEscapeOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleSubmit]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSuppliers = async (search: string) => {
    const r = await api.get(`/suppliers?search=${encodeURIComponent(search)}`);
    const items = (r.data?.data ?? r.data ?? []) as Record<string, unknown>[];
    return items.map(s => ({
      id: Number(s['id']),
      label: String(s['companyName'] ?? ''),
      sub: String(s['code'] ?? ''),
    }));
  };

  const handleSupplierSelect = async (sid: number, label: string) => {
    setForm(f => ({ ...f, supplierId: sid, supplierName: label }));
    setSupplierInfo(null);
    try {
      const r = await api.get(`/suppliers/${sid}`);
      const s = r.data?.data as Record<string, unknown>;
      if (s) {
        setSupplierInfo({
          id: Number(s['id']),
          code: String(s['code'] ?? ''),
          companyName: String(s['companyName'] ?? ''),
          contactName: String(s['contactName'] ?? ''),
          email: String(s['email'] ?? ''),
          phone: String(s['phone'] ?? ''),
          taxId: String(s['taxId'] ?? ''),
          crNumber: String(s['crNumber'] ?? ''),
          buildingNumber: String(s['buildingNumber'] ?? ''),
          streetName: String(s['streetName'] ?? ''),
          additionalNumber: String(s['additionalNumber'] ?? ''),
          district: String(s['district'] ?? ''),
          city: String(s['city'] ?? ''),
          postalCode: String(s['postalCode'] ?? ''),
          country: String(s['country'] ?? 'SA'),
          paymentTermsDays: Number(s['paymentTermsDays']) || undefined,
        });
      }
    } catch { /* ignore */ }
  };

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
    <div style={{ maxWidth: 960, fontFamily: 'var(--font)' }}>
      {apiError && (
        <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, border: '1px solid var(--danger)' }}>
          {apiError}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {isNew ? 'New Purchase Order' : `Purchase Order ${existing?.data?.['poNumber'] ?? id}`}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {isNew ? 'Create a new purchase order' : `Status: ${form.status}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/purchase-orders')} style={btnSecondary}>Cancel</button>
          {!isNew && (
            <button onClick={handleSubmit} disabled={submitMutation.isPending || form.status === 'submitted'} style={{ ...btnSecondary, color: 'var(--primary)', borderColor: 'var(--primary)' }}>
              {submitMutation.isPending ? 'Submitting…' : 'Submit (F8)'}
            </button>
          )}
          <button onClick={handleSave} disabled={saveMutation.isPending} style={btnPrimary}>
            {saveMutation.isPending ? 'Saving…' : 'Save (F2)'}
          </button>
        </div>
      </div>

      {/* Header fields card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16, margin: '0 0 16px' }}>
          Order Details
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <KbdLookup
              id="supplier"
              label="Supplier"
              value={form.supplierName}
              selectedId={form.supplierId}
              onSelect={(sid, label) => { handleSupplierSelect(sid, label); }}
              onNext={() => nav.nextField('supplier')}
              onPrev={() => nav.prevField('supplier')}
              fetchOptions={fetchSuppliers}
              error={errors['supplier']}
            />
            {supplierInfo && <SupplierPanel supplier={supplierInfo} />}
          </div>
          <div>
            <KbdSelect
              id="warehouse"
              label="Warehouse"
              value={form.warehouseId}
              onChange={v => setForm(f => ({ ...f, warehouseId: v }))}
              options={WAREHOUSE_OPTIONS}
              onNext={() => nav.nextField('warehouse')}
              onPrev={() => nav.prevField('warehouse')}
            />
            <KbdField
              id="orderDate"
              label="Order Date"
              type="date"
              value={form.orderDate}
              onChange={v => setForm(f => ({ ...f, orderDate: v }))}
              onNext={() => nav.nextField('orderDate')}
              onPrev={() => nav.prevField('orderDate')}
              error={errors['orderDate']}
            />
            <KbdField
              id="expectedDate"
              label="Expected Date"
              type="date"
              value={form.expectedDate}
              onChange={v => setForm(f => ({ ...f, expectedDate: v }))}
              onNext={() => nav.nextField('expectedDate')}
              onPrev={() => nav.prevField('expectedDate')}
            />
            <KbdField id="status" label="Status" value={form.status} onChange={() => {}} readOnly />
            <KbdField
              id="notes"
              label="Notes"
              value={form.notes}
              onChange={v => setForm(f => ({ ...f, notes: v }))}
              onNext={() => nav.nextField('notes')}
              onPrev={() => nav.prevField('notes')}
              multiline
            />
          </div>
        </div>
      </div>

      {/* Lines card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 16px' }}>
          Order Lines
        </p>
        <POGrid rows={form.lines} onChange={handleLinesChange} />
      </div>

      {/* Totals card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 280, fontFamily: 'var(--font)', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '4px 0', color: 'var(--text-muted)' }}>
              <span>Subtotal (excl. VAT)</span>
              <span style={{ fontFamily: 'monospace' }}>SAR {formatSAR(totals.base)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '4px 0', color: 'var(--text-muted)' }}>
              <span>VAT</span>
              <span style={{ fontFamily: 'monospace' }}>SAR {formatSAR(totals.vat)}</span>
            </div>
            <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '4px 0', fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
              <span>TOTAL DUE</span>
              <span style={{ fontFamily: 'monospace' }}>SAR {formatSAR(totals.total)}</span>
            </div>
          </div>
        </div>
      </div>

      <KbdStatusBar
        shortcuts={[
          { key: 'F2', label: 'Save' },
          { key: 'F8', label: 'Submit PO' },
          { key: 'Esc', label: 'Leave' },
        ]}
        message={statusMsg || (saveMutation.isPending ? 'Saving...' : submitMutation.isPending ? 'Submitting...' : '')}
        messageType={statusType}
      />

      <EscapeMenu
        isOpen={escapeOpen}
        onSave={() => { leaveAfterSave.current = true; setEscapeOpen(false); handleSave(); }}
        onDiscard={() => navigate('/purchase-orders')}
        onStay={() => setEscapeOpen(false)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
