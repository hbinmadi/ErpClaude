import { useRef, useCallback } from 'react';
import { api } from '../lib/api';
import GridLookupCell from './GridLookupCell';

export interface JournalLine {
  account: string;
  accountId: number | null;
  description: string;
  debit: string;
  credit: string;
}

interface JournalGridProps {
  rows: JournalLine[];
  onChange: (rows: JournalLine[]) => void;
}

// col 0 = account (lookup), col 1 = description, col 2 = debit, col 3 = credit
type SimpleCol = 'description' | 'debit' | 'credit';
const SIMPLE_COLS: SimpleCol[] = ['description', 'debit', 'credit'];
const TOTAL_EDITABLE_COLS = 4;
const MIN_ROWS = 2;

function newLine(): JournalLine {
  return { account: '', accountId: null, description: '', debit: '', credit: '' };
}

const fetchAccounts = async (search: string) => {
  const r = await api.get(`/accounts?search=${encodeURIComponent(search)}`);
  const items = (r.data?.data ?? r.data ?? []) as Record<string, unknown>[];
  return items.map(a => ({
    id: Number(a['id']),
    label: String(a['name'] ?? ''),
    sub: String(a['code'] ?? ''),
  }));
};

export default function JournalGrid({ rows, onChange }: JournalGridProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const refKey = (row: number, col: number) => `${row}-${col}`;

  const focusCell = useCallback((row: number, col: number) => {
    const el = inputRefs.current[refKey(row, col)];
    if (el) { el.focus(); el.select(); }
  }, []);

  const advanceFrom = useCallback(
    (rowIdx: number, colIdx: number, currentRows: JournalLine[]) => {
      const isLastCol = colIdx === TOTAL_EDITABLE_COLS - 1;
      const isLastRow = rowIdx === currentRows.length - 1;
      if (!isLastCol) {
        focusCell(rowIdx, colIdx + 1);
      } else if (!isLastRow) {
        focusCell(rowIdx + 1, 0);
      } else {
        const newRows = [...currentRows, newLine()];
        onChange(newRows);
        setTimeout(() => focusCell(rowIdx + 1, 0), 0);
      }
    },
    [focusCell, onChange]
  );

  const deleteRow = useCallback(
    (rowIdx: number) => {
      if (rows.length <= MIN_ROWS) return;
      const newRows = rows.filter((_, i) => i !== rowIdx);
      onChange(newRows);
      setTimeout(() => focusCell(Math.max(0, rowIdx - 1), 0), 0);
    },
    [rows, onChange, focusCell]
  );

  const handleSimpleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        advanceFrom(rowIdx, colIdx, rows);
      } else if (e.key === 'Escape') {
        e.currentTarget.blur();
      }
    },
    [rows, advanceFrom]
  );

  const handleSimpleChange = useCallback(
    (rowIdx: number, col: SimpleCol, value: string) => {
      const newRows = rows.map((r, i) => (i === rowIdx ? { ...r, [col]: value } : r));
      onChange(newRows);
    },
    [rows, onChange]
  );

  const thStyle: React.CSSProperties = {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-faint)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    background: 'var(--bg-elevated)',
    borderBottom: '2px solid var(--border)',
    borderRight: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    border: 'none',
    borderRight: '1px solid var(--border)',
    padding: 0,
  };

  const inputStyle = (align: 'left' | 'right' = 'left'): React.CSSProperties => ({
    width: '100%',
    padding: '6px 8px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text)',
    fontFamily: 'var(--font)',
    fontSize: 13,
    textAlign: align,
    outline: 'none',
    boxSizing: 'border-box',
  });

  const COL_LABELS: Record<SimpleCol, string> = { description: 'Description', debit: 'Debit (SAR)', credit: 'Credit (SAR)' };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', fontFamily: 'var(--font)', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>#</th>
            <th style={{ ...thStyle, minWidth: 200, textAlign: 'left' }}>Account</th>
            <th style={{ ...thStyle, minWidth: 200, textAlign: 'left' }}>Description</th>
            <th style={{ ...thStyle, width: 130, textAlign: 'right' }}>Debit (SAR)</th>
            <th style={{ ...thStyle, width: 130, textAlign: 'right', borderRight: 'none' }}>Credit (SAR)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border)' }}>
              {/* Row number */}
              <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--text-faint)', fontSize: 11, userSelect: 'none', padding: '0 8px' }}>
                {rowIdx + 1}
              </td>

              {/* Account (lookup) — col 0 */}
              <td style={tdStyle}>
                <GridLookupCell
                  value={row.account}
                  fetchOptions={fetchAccounts}
                  onChange={(label, id) => {
                    const newRows = rows.map((r, i) =>
                      i === rowIdx ? { ...r, account: label, accountId: id } : r
                    );
                    onChange(newRows);
                  }}
                  onEnter={() => advanceFrom(rowIdx, 0, rows)}
                  onBackspaceEmpty={() => deleteRow(rowIdx)}
                  inputRef={el => { inputRefs.current[refKey(rowIdx, 0)] = el; }}
                  placeholder="Search account…"
                />
              </td>

              {/* Simple cols: description(1), debit(2), credit(3) */}
              {SIMPLE_COLS.map((col, i) => {
                const colIdx = i + 1;
                const isNumber = col !== 'description';
                return (
                  <td key={col} style={{ ...tdStyle, borderRight: col === 'credit' ? 'none' : undefined }}>
                    <input
                      ref={el => { inputRefs.current[refKey(rowIdx, colIdx)] = el; }}
                      style={inputStyle(isNumber ? 'right' : 'left')}
                      type={isNumber ? 'number' : 'text'}
                      value={row[col]}
                      onChange={e => handleSimpleChange(rowIdx, col, e.target.value)}
                      onKeyDown={e => handleSimpleKeyDown(e, rowIdx, colIdx)}
                      onFocus={e => {
                        e.currentTarget.select();
                        const td = e.currentTarget.closest('td') as HTMLElement | null;
                        if (td) td.style.background = 'var(--primary-subtle)';
                      }}
                      onBlur={e => {
                        const td = e.currentTarget.closest('td') as HTMLElement | null;
                        if (td) td.style.background = '';
                      }}
                      min={isNumber ? 0 : undefined}
                      step={isNumber ? 'any' : undefined}
                      placeholder={col === 'description' ? 'Memo…' : undefined}
                      aria-label={COL_LABELS[col]}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, marginBottom: 0 }}>
        Enter to move between cells · Enter on last cell adds a new row · Backspace on empty Account removes the row (min 2 rows)
      </p>
    </div>
  );
}
