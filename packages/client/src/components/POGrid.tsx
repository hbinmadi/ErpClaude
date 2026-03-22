import { useRef, useCallback, useState } from 'react';
import { api } from '../lib/api';
import GridLookupCell, { LookupOption } from './GridLookupCell';

export interface POLine {
  product: string;
  productId: number | null;
  description: string;
  qty: string;
  unitCost: string;
  taxRate: string;
}

interface ProductOption extends LookupOption {
  purchasePrice: number; // halalas
  taxRate: string;
}

interface POGridProps {
  rows: POLine[];
  onChange: (rows: POLine[]) => void;
  readOnly?: boolean;
}

type SimpleCol = 'description' | 'qty' | 'unitCost' | 'taxRate';
const SIMPLE_COLS: SimpleCol[] = ['description', 'qty', 'unitCost', 'taxRate'];
const TOTAL_EDITABLE_COLS = 5; // product + 4 simple

export function newPOLine(): POLine {
  return { product: '', productId: null, description: '', qty: '1', unitCost: '', taxRate: '15' };
}

function calcTotal(line: POLine): string {
  const qty = parseFloat(line.qty) || 0;
  const uc = parseFloat(line.unitCost) || 0;
  const tax = parseFloat(line.taxRate) || 0;
  const result = qty * uc * (1 + tax / 100);
  if (!qty && !uc) return '';
  return result.toLocaleString('en-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchProducts(q: string): Promise<LookupOption[]> {
  const r = await api.get(`/products/search?q=${encodeURIComponent(q)}&limit=15`);
  const items = (r.data?.data ?? r.data ?? []) as Record<string, unknown>[];
  return items.map(p => ({
    id: Number(p['id']),
    label: String(p['name'] ?? ''),
    sub: String(p['code'] ?? ''),
    purchasePrice: Number(p['purchase_price'] ?? 0),
    taxRate: String(p['tax_rate'] ?? '15'),
  })) as ProductOption[];
}

export default function POGrid({ rows, onChange, readOnly = false }: POGridProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [lastAdded, setLastAdded] = useState<number | null>(null);

  const refKey = (row: number, col: number) => `${row}-${col}`;

  const focusCell = useCallback((row: number, col: number) => {
    const tryFocus = (attempts = 0) => {
      const el = inputRefs.current[refKey(row, col)];
      if (el) { el.focus(); el.select(); }
      else if (attempts < 5) setTimeout(() => tryFocus(attempts + 1), 20);
    };
    tryFocus();
  }, []);

  const advanceFrom = useCallback((rowIdx: number, colIdx: number, currentRows?: POLine[]) => {
    const r = currentRows ?? rows;
    const isLastCol = colIdx === TOTAL_EDITABLE_COLS - 1;
    const isLastRow = rowIdx === r.length - 1;
    if (!isLastCol) {
      focusCell(rowIdx, colIdx + 1);
    } else if (!isLastRow) {
      focusCell(rowIdx + 1, 0);
    } else {
      const newRows = [...r, newPOLine()];
      onChange(newRows);
      setLastAdded(rowIdx + 1);
      setTimeout(() => focusCell(rowIdx + 1, 0), 30);
    }
  }, [rows, onChange, focusCell]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number, col: SimpleCol) => {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        advanceFrom(rowIdx, colIdx);
      } else if (e.key === 'Escape') {
        e.currentTarget.blur();
      } else if (e.key === 'Backspace' && col === 'description' && e.currentTarget.value === '' && rows.length > 1) {
        e.preventDefault();
        const newRows = rows.filter((_, i) => i !== rowIdx);
        onChange(newRows);
        setTimeout(() => focusCell(Math.max(0, rowIdx - 1), 0), 0);
      }
    },
    [rows, onChange, focusCell, advanceFrom]
  );

  const handleChange = useCallback(
    (rowIdx: number, col: SimpleCol, value: string) => {
      onChange(rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r)));
    },
    [rows, onChange]
  );

  const handleProductSelect = useCallback(
    (rowIdx: number, label: string, id: number | null, opt?: LookupOption) => {
      const row = rows[rowIdx];
      const pOpt = opt as ProductOption | undefined;
      const updated: POLine = { ...row, product: label, productId: id };
      if (pOpt) {
        updated.unitCost = (pOpt.purchasePrice / 100).toFixed(2);
        updated.taxRate = pOpt.taxRate;
        if (!row.description) updated.description = label;
      }
      onChange(rows.map((r, i) => (i === rowIdx ? updated : r)));
    },
    [rows, onChange]
  );

  const removeRow = (rowIdx: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, i) => i !== rowIdx));
  };

  const addRow = () => {
    const newRows = [...rows, newPOLine()];
    onChange(newRows);
    const newIdx = newRows.length - 1;
    setLastAdded(newIdx);
    setTimeout(() => focusCell(newIdx, 0), 30);
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
              <th style={{ ...thStyle, width: 70, textAlign: 'right' }}>Qty</th>
              <th style={{ ...thStyle, width: 110, textAlign: 'right' }}>Unit Cost</th>
              <th style={{ ...thStyle, width: 65, textAlign: 'right' }}>VAT%</th>
              <th style={{ ...thStyle, width: 120, textAlign: 'right' }}>Total (SAR)</th>
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

                  {/* Simple cols */}
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
                    {calcTotal(row)}
                  </td>

                  {/* Remove */}
                  {!readOnly && (
                    <td style={{ padding: '0 4px', textAlign: 'center', borderRight: 'none' }}>
                      <button
                        onClick={() => removeRow(rowIdx)}
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
            onClick={addRow}
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
