import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import KbdField from '../../components/kbd/KbdField';
import KbdSelect from '../../components/kbd/KbdSelect';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';
import { useFormNav } from '../../components/kbd/useFormNav';

interface ProductForm {
  code: string;
  name: string;
  description: string;
  productType: string;
  salesPrice: string;
  purchasePrice: string;
  taxRate: string;
  reorderPoint: string;
  reorderQty: string;
  isActive: string;
}

const FIELD_IDS = ['code', 'name', 'description', 'productType', 'salesPrice', 'purchasePrice', 'taxRate', 'reorderPoint', 'reorderQty', 'isActive'];

const PRODUCT_TYPE_OPTIONS = [
  { value: 'inventory', label: 'Inventory (storable)' },
  { value: 'service', label: 'Service' },
  { value: 'expense', label: 'Expense' },
];

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

function defaultForm(): ProductForm {
  return {
    code: '',
    name: '',
    description: '',
    productType: 'inventory',
    salesPrice: '0.00',
    purchasePrice: '0.00',
    taxRate: '15',
    reorderPoint: '',
    reorderQty: '',
    isActive: 'true',
  };
}

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === 'new';
  const nav = useFormNav(FIELD_IDS);

  const [form, setForm] = useState<ProductForm>(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | 'info'>('info');
  const [escapeOpen, setEscapeOpen] = useState(false);
  const leaveAfterSave = useRef(false);

  const { data: existing } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['product', id],
    queryFn: () => api.get(`/products/${id}`).then(r => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing?.data) {
      const d = existing.data;
      setForm({
        code: String(d['code'] ?? ''),
        name: String(d['name'] ?? ''),
        description: String(d['description'] ?? ''),
        productType: String(d['productType'] ?? 'inventory'),
        salesPrice: ((Number(d['salesPrice'] ?? 0)) / 100).toFixed(2),
        purchasePrice: ((Number(d['purchasePrice'] ?? 0)) / 100).toFixed(2),
        taxRate: String(d['taxRate'] ?? '15'),
        reorderPoint: d['reorderPoint'] ? String(d['reorderPoint']) : '',
        reorderQty: d['reorderQty'] ? String(d['reorderQty']) : '',
        isActive: String(d['isActive'] ?? 'true'),
      });
    }
  }, [existing]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs['code'] = 'Code is required';
    if (!form.name.trim()) errs['name'] = 'Name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    code: form.code.trim(),
    name: form.name.trim(),
    description: form.description || null,
    productType: form.productType,
    salesPrice: form.salesPrice,
    purchasePrice: form.purchasePrice,
    taxRate: parseFloat(form.taxRate) || 15,
    reorderPoint: form.reorderPoint ? parseFloat(form.reorderPoint) : null,
    reorderQty: form.reorderQty ? parseFloat(form.reorderQty) : null,
    isActive: form.isActive === 'true',
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/products', buildPayload()).then(r => r.data)
        : api.put(`/products/${id}`, buildPayload()).then(r => r.data),
    onSuccess: (data: { data?: { id?: unknown } }) => {
      setStatusMsg('Saved ✓');
      setStatusType('success');
      qc.invalidateQueries({ queryKey: ['products'] });
      const newId = data?.data?.id;
      if (leaveAfterSave.current) {
        leaveAfterSave.current = false;
        navigate('/inventory/products');
        return;
      }
      setTimeout(() => {
        setStatusMsg('');
        if (isNew && newId) navigate(`/inventory/products/${newId}`);
      }, 1500);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed';
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

  const f = (key: keyof ProductForm, val: string) => setForm(p => ({ ...p, [key]: val }));

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
            {isNew ? 'New Product' : 'Edit Product'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {isNew ? 'Create a new product record' : `Editing ${form.code} — ${form.name}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/inventory/products')} style={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={btnPrimary}>
            {saveMutation.isPending ? 'Saving…' : 'Save (F2)'}
          </button>
        </div>
      </div>

      {/* Product Details card */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>
          Product Details
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
          <div>
            <KbdField id="code" label="Code" value={form.code}
              onChange={v => f('code', v)} onNext={() => nav.nextField('code')}
              autoFocus required error={errors['code']} width="w-40"
              readOnly={!isNew} />
            <KbdField id="name" label="Name" value={form.name}
              onChange={v => f('name', v)} onNext={() => nav.nextField('name')}
              onPrev={() => nav.prevField('name')} required error={errors['name']} width="w-64" />
            <KbdField id="description" label="Description" value={form.description}
              onChange={v => f('description', v)} onNext={() => nav.nextField('description')}
              onPrev={() => nav.prevField('description')} multiline width="w-64" />
            <KbdSelect id="productType" label="Product Type" value={form.productType}
              onChange={v => f('productType', v)} options={PRODUCT_TYPE_OPTIONS}
              onNext={() => nav.nextField('productType')} onPrev={() => nav.prevField('productType')}
              width="w-48" />
          </div>
          <div>
            <KbdField id="salesPrice" label="Sales Price (SAR)" type="number" value={form.salesPrice}
              onChange={v => f('salesPrice', v)} onNext={() => nav.nextField('salesPrice')}
              onPrev={() => nav.prevField('salesPrice')} width="w-32" />
            <KbdField id="purchasePrice" label="Purchase Price (SAR)" type="number" value={form.purchasePrice}
              onChange={v => f('purchasePrice', v)} onNext={() => nav.nextField('purchasePrice')}
              onPrev={() => nav.prevField('purchasePrice')} width="w-32" />
            <KbdField id="taxRate" label="Tax Rate %" type="number" value={form.taxRate}
              onChange={v => f('taxRate', v)} onNext={() => nav.nextField('taxRate')}
              onPrev={() => nav.prevField('taxRate')} width="w-24" />
            <KbdField id="reorderPoint" label="Reorder Point" type="number" value={form.reorderPoint}
              onChange={v => f('reorderPoint', v)} onNext={() => nav.nextField('reorderPoint')}
              onPrev={() => nav.prevField('reorderPoint')} width="w-24" />
            <KbdField id="reorderQty" label="Reorder Qty" type="number" value={form.reorderQty}
              onChange={v => f('reorderQty', v)} onNext={() => nav.nextField('reorderQty')}
              onPrev={() => nav.prevField('reorderQty')} width="w-24" />
            <KbdSelect id="isActive" label="Active" value={form.isActive}
              onChange={v => f('isActive', v)} options={ACTIVE_OPTIONS}
              onNext={() => nav.nextField('isActive')} onPrev={() => nav.prevField('isActive')}
              width="w-24" />
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
        onDiscard={() => navigate('/inventory/products')}
        onStay={() => setEscapeOpen(false)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
