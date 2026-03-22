import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import GridLookupCell, { LookupOption } from '../../components/GridLookupCell';
import KbdStatusBar from '../../components/kbd/KbdStatusBar';
import EscapeMenu from '../../components/kbd/EscapeMenu';

/* ── Types ── */
interface Branch {
  id: number;
  code: string;
  name: string;
}

interface TransferLine {
  product: string;
  productId: number | null;
  description: string;
  qty: string;
  unitCost: string;
}

interface ProductOption extends LookupOption {
  purchasePrice: number;
}

function newTransferLine(): TransferLine {
  return { product: '', productId: null, description: '', qty: '1', unitCost: '' };
}

function today() {
  return new Date().toISOString().split('T')[0];
}

/* ── Transfer Grid ── */
const SIMPLE_COLS = ['description', 'qty', 'unitCost'] as const;
type SimpleCol = typeof SIMPLE_COLS[number];
const TOTAL_COLS = 4; // product + description + qty + unitCost

async function fetchProducts(q: string): Promise<LookupOption[]> {
  const r = await api.get(`/products/search?q=${encodeURIComponent(q)}&limit=15`);
  const items = (r.data?.data ?? r.data ?? []) as Record<string, unknown>[];
  return items.map(p => ({
    id: Number(p['id']),
    label: String(p['name'] ?? ''),
    sub: String(p['code'] ?? ''),
    purchasePrice: Number(p['purchase_price'] ?? 0),
  })) as ProductOption[];
}

interface TransferGridProps {
  rows: TransferLine[];
  onChange: (rows: TransferLine[]) => void;
  readOnly?: boolean;
}

function TransferGrid({ rows, onChange, readOnly = false }: TransferGridProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const refKey = (r: number, c: number) => `${r}-${c}`;

  const focusCell = useCallback((row: number, col: number) => {
    const tryFocus = (attempts = 0) => {
      const el = inputRefs.current[refKey(row, col)];
      if (el) { el.focus(); el.select(); }
      else if (attempts < 5) setTimeout(() => tryFocus(attempts + 1), 20);
    };
    tryFocus();
  }, []);

  const advanceFrom = useCallback((rowIdx: number, colIdx: number, currentRows?: TransferLine[]) => {
    const r = currentRows ?? rows;
    const isLastCol = colIdx === TOTAL_COLS - 1;
    const isLastRow = rowIdx === r.length - 1;
    if (!isLastCol) {
      focusCell(rowIdx, colIdx + 1);
    } else if (!isLastRow) {
      focusCell(rowIdx + 1, 0);
    } else {
      const newRows = [...r, newTransferLine()];
      onChange(newRows);
      setLastAdded(rowIdx + 1);
      setTimeout(() => focusCell(rowIdx + 1, 0), 30);
    }
  }, [rows, onChange, focusCell]);

  const handleChange = useCallback((rowIdx: number, col: SimpleCol, value: string) => {
    onChange(rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)));
  }, [rows, onChange]);

  const handleProductSelect = useCallback((rowIdx: number, label: string, id: number | null, opt?: LookupOption) => {
    const row = rows[rowIdx];
    const pOpt = opt as ProductOption | undefined;
    const updated: TransferLine = { ...row, product: label, productId: id };
    if (pOpt) {
      updated.unitCost = (pOpt.purchasePrice / 100).toFixed(2);
      if (!row.description) updated.description = label;
    }
    onChange(rows.map((r, i) => (i === rowIdx ? updated : r)));
  }, [rows, onChange]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number, colIdx: number, col: SimpleCol
  ) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      advanceFrom(rowIdx, colIdx);
    } else if (e.key === 'Escape') {
      e.currentTarget.blur();
    } else if (e.key === 'Backspace' && col === 'description' && e.currentTarget.value === '' && rows.length > 1) {
      e.preventDefault();
      onChange(rows.filter((_, i) => i !== rowIdx));
      setTimeout(() => focusCell(Math.max(0, rowIdx - 1), 0), 0);
    }
  }, [rows, onChange, focusCell, advanceFrom]);

  const lineTotal = (line: TransferLine) => {
    const qty = parseFloat(line.qty) || 0;
    const uc = parseFloat(line.unitCost) || 0;
    const result = qty * uc;
    if (!qty && !uc) return '';
    return result.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const thStyle: React.CSSProperties = {
    padding: '9px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
    textTransform: 'uppercase', letterSpacing: 0.8, background: 'var(--bg-elevated)',
    borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = { border: 'none', borderRight: '1px solid var(--border)', padding: 0 };
  const inputStyle = (align: 'left' | 'right' = 'left'): React.CSSProperties => ({
    width: '100%', padding: '7px 8px', border: 'none', background: 'transparent',
    color: 'var(--text)', fontFamily: 'var(--font)', fontSize: 13,
    textAlign: align, outline: 'none', boxSizing: 'border-box',
  });

  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font)', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 32, textAlign: 'center', padding: '9px 6px' }}>#</th>
              <th style={{ ...thStyle, minWidth: 180, textAlign: 'left' }}>Product</th>
              <th style={{ ...thStyle, minWidth: 200, textAlign: 'left' }}>Description</th>
              <th style={{ ...thStyle, width: 80, textAlign: 'right' }}>Qty</th>
              <th style={{ ...thStyle, width: 120, textAlign: 'right' }}>Unit Cost</th>
              <th style={{ ...thStyle, width: 120, textAlign: 'right', borderRight: readOnly ? 'none' : '1px solid var(--border)' }}>Total (SAR)</th>
              {!readOnly && <th style={{ ...thStyle, width: 36, borderRight: 'none', textAlign: 'center' }} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => {
              const isNewRow = rowIdx === lastAdded;
              return (
                <tr
                  key={rowIdx}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isNewRow ? 'var(--primary-subtle)'
                      : rowIdx % 2 === 0 ? 'var(--bg)' : 'var(--bg-surface)',
                    transition: 'background 0.4s',
                  }}
                >
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-faint)', fontSize: 11, userSelect: 'none', padding: '0 6px' }}>
                    {rowIdx + 1}
                  </td>

                  {/* Product lookup */}
                  <td style={tdStyle}>
                    {readOnly ? (
                      <span style={{ display: 'block', padding: '7px 8px', fontSize: 13 }}>{row.product}</span>
                    ) : (
                      <GridLookupCell
                        value={row.product}
                        fetchOptions={fetchProducts}
                        onChange={(label, id) => handleProductSelect(rowIdx, label, id)}
                        onSelectOption={opt => handleProductSelect(rowIdx, opt.label, opt.id, opt)}
                        onEnter={() => advanceFrom(rowIdx, 0)}
                        onBackspaceEmpty={rows.length > 1 ? () => {
                          onChange(rows.filter((_, i) => i !== rowIdx));
                          setTimeout(() => focusCell(Math.max(0, rowIdx - 1), 0), 0);
                        } : undefined}
                        inputRef={el => { inputRefs.current[refKey(rowIdx, 0)] = el; }}
                        placeholder="Code or name…"
                      />
                    )}
                  </td>

                  {/* Simple cols: description, qty, unitCost */}
                  {SIMPLE_COLS.map((col, i) => {
                    const colIdx = i + 1;
                    const isNum = col !== 'description';
                    return (
                      <td key={col} style={tdStyle}>
                        {readOnly ? (
                          <span style={{ display: 'block', padding: '7px 8px', fontSize: 13, textAlign: isNum ? 'right' : 'left' }}>
                            {row[col]}
                          </span>
                        ) : (
                          <input
                            ref={el => { inputRefs.current[refKey(rowIdx, colIdx)] = el; }}
                            style={inputStyle(isNum ? 'right' : 'left')}
                            type={isNum ? 'number' : 'text'}
                            value={row[col]}
                            onChange={e => handleChange(rowIdx, col, e.target.value)}
                            onKeyDown={e => handleKeyDown(e, rowIdx, colIdx, col)}
                            onFocus={e => {
                              e.currentTarget.select();
                              const tr = e.currentTarget.closest('tr') as HTMLElement | null;
                              if (tr) tr.style.background = 'var(--primary-subtle)';
                            }}
                            onBlur={e => {
                              const tr = e.currentTarget.closest('tr') as HTMLElement | null;
                              if (tr) tr.style.background = '';
                            }}
                            min={isNum ? 0 : undefined}
                            step={isNum ? 'any' : undefined}
                            placeholder={col === 'description' ? 'Description…' : undefined}
                          />
                        )}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td style={{ ...tdStyle, textAlign: 'right', borderRight: readOnly ? 'none' : '1px solid var(--border)', padding: '7px 10px', color: 'var(--text)', fontFamily: 'monospace', fontWeight: 500 }}>
                    {lineTotal(row)}
                  </td>

                  {/* Remove */}
                  {!readOnly && (
                    <td style={{ padding: '0 4px', textAlign: 'center', borderRight: 'none' }}>
                      <button
                        onClick={() => { if (rows.length <= 1) return; onChange(rows.filter((_, i) => i !== rowIdx)); }}
                        disabled={rows.length <= 1}
                        title="Remove row"
                        style={{
                          background: 'none', border: 'none',
                          cursor: rows.length <= 1 ? 'default' : 'pointer',
                          color: rows.length <= 1 ? 'var(--text-faint)' : 'var(--danger)',
                          fontSize: 16, lineHeight: 1, padding: '2px 4px',
                          opacity: rows.length <= 1 ? 0.3 : 0.6, transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => { if (rows.length > 1) e.currentTarget.style.opacity = '1'; }}
                        onMouseOut={e => { e.currentTarget.style.opacity = rows.length <= 1 ? '0.3' : '0.6'; }}
                      >×</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <button
            onClick={() => {
              const newRows = [...rows, newTransferLine()];
              onChange(newRows);
              setLastAdded(newRows.length - 1);
              setTimeout(() => focusCell(newRows.length - 1, 0), 30);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px dashed var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
              padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)',
              transition: 'all 0.15s',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            + Add Row
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            Enter / Tab to advance · Backspace on empty desc removes row
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Form Page ── */
export default function BranchTransferFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = !id || id === 'new';

  const [fromBranchId, setFromBranchId] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [transferDate, setTransferDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<TransferLine[]>([newTransferLine()]);
  const [apiError, setApiError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [escapeOpen, setEscapeOpen] = useState(false);
  const leaveAfterSave = useRef(false);

  const { data: branchesData } = useQuery<{ data: Branch[] }>({
    queryKey: ['branches'],
    queryFn: () => api.get('/branches').then(r => r.data),
  });
  const branches = branchesData?.data ?? [];

  const { data: existing } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['branch-transfer', id],
    queryFn: () => api.get(`/branch-transfers/${id}`).then(r => r.data),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing?.data) {
      const d = existing.data;
      setFromBranchId(String(d['fromBranchId'] ?? ''));
      setToBranchId(String(d['toBranchId'] ?? ''));
      setTransferDate(String(d['transferDate'] ?? today()).split('T')[0]);
      setNotes(String(d['notes'] ?? ''));
      const linesRaw = (d['lines'] as Record<string, unknown>[] | undefined) ?? [];
      setLines(linesRaw.length
        ? linesRaw.map(l => ({
            product: String(l['product_name'] ?? ''),
            productId: Number(l['productId']) || null,
            description: String(l['description'] ?? ''),
            qty: String(l['quantity'] ?? '1'),
            unitCost: String((Number(l['unitCost'] ?? 0) / 100).toFixed(2)),
          }))
        : [newTransferLine()]
      );
    }
  }, [existing]);

  const status = existing?.data?.['status'] as string | undefined;
  const readOnly = !isNew && status !== 'draft';

  const grandTotal = lines.reduce((acc, l) => {
    const qty = parseFloat(l.qty) || 0;
    const uc = parseFloat(l.unitCost) || 0;
    return acc + Math.round(qty * Math.round(uc * 100));
  }, 0);

  const buildPayload = () => ({
    fromBranchId: Number(fromBranchId),
    toBranchId: Number(toBranchId),
    transferDate,
    notes: notes || null,
    lines: lines
      .filter(l => l.productId && parseFloat(l.qty) > 0)
      .map(l => ({
        productId: l.productId,
        description: l.description || l.product,
        quantity: parseFloat(l.qty) || 0,
        unitCost: Math.round((parseFloat(l.unitCost) || 0) * 100),
      })),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? api.post('/branch-transfers', buildPayload()).then(r => r.data)
        : api.put(`/branch-transfers/${id}`, buildPayload()).then(r => r.data),
    onSuccess: (data: { data?: { id?: unknown; transferNumber?: string } }) => {
      setStatusMsg('Saved ✓');
      qc.invalidateQueries({ queryKey: ['branch-transfers'] });
      const newId = data?.data?.id;
      if (leaveAfterSave.current) {
        leaveAfterSave.current = false;
        navigate('/branch-transfers');
        return;
      }
      setTimeout(() => {
        setStatusMsg('');
        if (isNew && newId) navigate(`/branch-transfers/${newId}`);
      }, 1800);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Save failed';
      setApiError(msg);
    },
  });

  const handleSave = useCallback(() => {
    setApiError('');
    if (!fromBranchId || !toBranchId) { setApiError('From and To branches are required'); return; }
    if (fromBranchId === toBranchId) { setApiError('Cannot transfer to the same branch'); return; }
    if (!lines.some(l => l.productId && parseFloat(l.qty) > 0)) { setApiError('At least one product line is required'); return; }
    saveMutation.mutate();
  }, [fromBranchId, toBranchId, lines]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') { e.preventDefault(); setEscapeOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', fontSize: 13,
    background: 'var(--bg-elevated)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font)', cursor: 'pointer',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)',
    textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6,
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

  const transferNumber = existing?.data?.['transferNumber'] as string | undefined;

  return (
    <div style={{ maxWidth: 960, fontFamily: 'var(--font)' }}>
      {apiError && (
        <div style={{ background: 'var(--danger-subtle)', color: 'var(--danger)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, border: '1px solid var(--danger)' }}>
          {apiError}
        </div>
      )}
      {statusMsg && (
        <div style={{ background: 'var(--success-subtle, rgba(22,163,74,0.1))', color: 'var(--success, #16a34a)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
          {statusMsg}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {isNew ? 'New Branch Transfer' : `Transfer ${transferNumber ?? id}`}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {isNew ? 'Move inventory between branches' : `Status: ${status ?? 'draft'}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/branch-transfers')} style={btnSecondary}>Cancel</button>
          {!readOnly && (
            <button onClick={handleSave} disabled={saveMutation.isPending} style={btnPrimary}>
              {saveMutation.isPending ? 'Saving…' : 'Save (F2)'}
            </button>
          )}
        </div>
      </div>

      {/* Transfer details */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 16px' }}>
          Transfer Details
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 20px' }}>
          <div>
            <label style={labelStyle}>From Branch</label>
            <select
              value={fromBranchId}
              onChange={e => setFromBranchId(e.target.value)}
              disabled={readOnly}
              style={selectStyle}
            >
              <option value="">Select branch…</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>To Branch</label>
            <select
              value={toBranchId}
              onChange={e => setToBranchId(e.target.value)}
              disabled={readOnly}
              style={selectStyle}
            >
              <option value="">Select branch…</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Transfer Date</label>
            <input
              type="date"
              value={transferDate}
              onChange={e => setTransferDate(e.target.value)}
              disabled={readOnly}
              style={selectStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={readOnly}
              style={selectStyle}
              placeholder="Optional notes…"
            />
          </div>
        </div>
      </div>

      {/* Lines */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 16px' }}>
          Transfer Lines
        </p>
        <TransferGrid rows={lines} onChange={setLines} readOnly={readOnly} />
      </div>

      {/* Totals */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 24px', marginBottom: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ minWidth: 260, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, padding: '4px 0', fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>
              <span>TOTAL VALUE</span>
              <span style={{ fontFamily: 'monospace' }}>
                SAR {(grandTotal / 100).toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <KbdStatusBar
        shortcuts={[
          ...(readOnly ? [] : [{ key: 'F2', label: 'Save' }]),
          { key: 'Esc', label: 'Leave' },
        ]}
        message={statusMsg || (saveMutation.isPending ? 'Saving...' : '')}
        messageType="success"
      />

      <EscapeMenu
        isOpen={escapeOpen}
        onSave={() => { leaveAfterSave.current = true; setEscapeOpen(false); handleSave(); }}
        onDiscard={() => navigate('/branch-transfers')}
        onStay={() => setEscapeOpen(false)}
        saving={saveMutation.isPending}
      />
    </div>
  );
}
