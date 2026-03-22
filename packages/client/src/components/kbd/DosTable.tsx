import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface DosTableColumn {
  key: string;
  header: string;
  width: string;
  type: 'text' | 'number' | 'lookup' | 'readonly';
  lookupFetch?: (s: string) => Promise<Array<{ id: number; label: string; sub?: string }>>;
}

export interface DosTableProps {
  columns: DosTableColumn[];
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
  onAddRow: () => void;
  onDeleteRow: (index: number) => void;
  activeRow?: number;
  onActiveRowChange?: (row: number) => void;
}

interface CellPos { row: number; col: number; }

interface LookupState {
  query: string;
  results: Array<{ id: number; label: string; sub?: string }>;
  open: boolean;
  highlighted: number;
  loading: boolean;
}

const defaultLookup: LookupState = { query: '', results: [], open: false, highlighted: 0, loading: false };

export default function DosTable({
  columns, rows, onChange, onAddRow, onDeleteRow, activeRow, onActiveRowChange,
}: DosTableProps) {
  const [active, setActive] = useState<CellPos | null>(null);
  const [lookups, setLookups] = useState<Record<string, LookupState>>({});
  const debounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const cellKey = (r: number, c: number) => `${r}-${c}`;

  const moveTo = useCallback((row: number, col: number) => {
    const clampedRow = Math.max(0, Math.min(row, rows.length - 1));
    const clampedCol = Math.max(0, Math.min(col, columns.length - 1));
    setActive({ row: clampedRow, col: clampedCol });
    onActiveRowChange?.(clampedRow);
    setTimeout(() => { inputRefs.current[cellKey(clampedRow, clampedCol)]?.focus(); }, 0);
  }, [rows.length, columns.length, onActiveRowChange]);

  useEffect(() => {
    if (active !== null) onActiveRowChange?.(active.row);
  }, [active, onActiveRowChange]);

  useEffect(() => {
    if (activeRow !== undefined && (active === null || active.row !== activeRow)) {
      setActive({ row: activeRow, col: 0 });
    }
  }, [activeRow]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateCell = useCallback((row: number, key: string, value: unknown) => {
    const updated = rows.map((r, i) => i === row ? { ...r, [key]: value } : r);
    onChange(updated);
  }, [rows, onChange]);

  const getLookupState = (key: string): LookupState => lookups[key] ?? defaultLookup;
  const setLookupState = (key: string, state: Partial<LookupState>) => {
    setLookups(prev => ({ ...prev, [key]: { ...(prev[key] ?? defaultLookup), ...state } }));
  };

  const handleLookupSearch = useCallback((row: number, col: number, col_def: DosTableColumn, query: string) => {
    const key = cellKey(row, col);
    setLookupState(key, { query, open: query.length > 0 });
    updateCell(row, col_def.key, query);
    if (debounceRefs.current[key]) clearTimeout(debounceRefs.current[key]);
    if (!query.trim() || !col_def.lookupFetch) { setLookupState(key, { results: [], open: false, loading: false }); return; }
    setLookupState(key, { loading: true });
    debounceRefs.current[key] = setTimeout(async () => {
      try {
        const results = await col_def.lookupFetch!(query);
        setLookupState(key, { results, open: true, loading: false, highlighted: 0 });
      } catch { setLookupState(key, { results: [], loading: false }); }
    }, 200);
  }, [updateCell]);

  const selectLookupOption = useCallback((row: number, col: number, col_def: DosTableColumn, opt: { id: number; label: string; sub?: string }) => {
    const key = cellKey(row, col);
    updateCell(row, col_def.key, opt.label);
    updateCell(row, `${col_def.key}Id`, opt.id);
    setLookupState(key, { query: opt.label, open: false, results: [] });
    const nextCol = col + 1 < columns.length ? col + 1 : 0;
    const nextRow = col + 1 < columns.length ? row : row + 1;
    if (nextRow < rows.length) moveTo(nextRow, nextCol);
    else moveTo(row, col);
  }, [updateCell, columns.length, rows.length, moveTo]);

  const moveNext = (row: number, col: number) => {
    let nextCol = col + 1;
    while (nextCol < columns.length && columns[nextCol].type === 'readonly') nextCol++;
    if (nextCol < columns.length) moveTo(row, nextCol);
    else if (row + 1 < rows.length) {
      let firstEditCol = 0;
      while (firstEditCol < columns.length && columns[firstEditCol].type === 'readonly') firstEditCol++;
      moveTo(row + 1, firstEditCol);
    }
  };

  const movePrev = (row: number, col: number) => {
    let prevCol = col - 1;
    while (prevCol >= 0 && columns[prevCol].type === 'readonly') prevCol--;
    if (prevCol >= 0) moveTo(row, prevCol);
    else if (row > 0) {
      let lastEditCol = columns.length - 1;
      while (lastEditCol >= 0 && columns[lastEditCol].type === 'readonly') lastEditCol--;
      moveTo(row - 1, lastEditCol);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, row: number, col: number, col_def: DosTableColumn) => {
    const lKey = cellKey(row, col);
    const lookup = getLookupState(lKey);

    if (col_def.type === 'lookup' && lookup.open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setLookupState(lKey, { highlighted: Math.min(lookup.highlighted + 1, lookup.results.length - 1) }); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setLookupState(lKey, { highlighted: Math.max(lookup.highlighted - 1, 0) }); return; }
      if (e.key === 'Enter') {
        e.preventDefault();
        const opt = lookup.results[lookup.highlighted];
        if (opt) selectLookupOption(row, col, col_def, opt);
        else moveNext(row, col);
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setLookupState(lKey, { open: false }); return; }
    }

    if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (col_def.type === 'lookup' && lookup.open) {
        const opt = lookup.results[lookup.highlighted];
        if (opt) { selectLookupOption(row, col, col_def, opt); return; }
      }
      moveNext(row, col);
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault(); movePrev(row, col);
    } else if (e.key === 'ArrowRight' && col_def.type !== 'lookup') { e.preventDefault(); if (col + 1 < columns.length) moveTo(row, col + 1); }
    else if (e.key === 'ArrowLeft' && col_def.type !== 'lookup') { e.preventDefault(); if (col > 0) moveTo(row, col - 1); }
    else if (e.key === 'ArrowDown' && col_def.type !== 'lookup') { e.preventDefault(); if (row + 1 < rows.length) moveTo(row + 1, col); }
    else if (e.key === 'ArrowUp' && col_def.type !== 'lookup') { e.preventDefault(); if (row > 0) moveTo(row - 1, col); }
    else if (e.key === 'Escape' && col_def.type === 'lookup') { setLookupState(lKey, { open: false }); }
  };

  const renderCell = (row: number, col: number, col_def: DosTableColumn, rowData: Record<string, unknown>) => {
    const key = cellKey(row, col);
    const isActive = active?.row === row && active?.col === col;
    const isActiveRow = active?.row === row;
    const cellVal = rowData[col_def.key];
    const lookup = getLookupState(key);

    const cellBg = isActive
      ? 'var(--primary-subtle)'
      : isActiveRow
      ? 'var(--bg-elevated)'
      : 'transparent';

    const baseCellStyle: React.CSSProperties = {
      padding: 0, background: cellBg,
      borderBottom: '1px solid var(--border-muted)',
    };

    const inputStyle: React.CSSProperties = {
      width: '100%', padding: '7px 10px',
      background: 'transparent', color: 'var(--text)',
      border: 'none', outline: 'none',
      fontFamily: 'var(--font)', fontSize: 13,
    };

    if (col_def.type === 'readonly') {
      return (
        <td key={col_def.key} style={{ ...baseCellStyle, cursor: 'default' }} className={col_def.width} onClick={() => moveTo(row, col)}>
          <span style={{ display: 'block', padding: '7px 10px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'right' }}>
            {String(cellVal ?? '')}
          </span>
        </td>
      );
    }

    if (col_def.type === 'lookup') {
      return (
        <td key={col_def.key} style={{ ...baseCellStyle, position: 'relative' }} className={col_def.width} onClick={() => moveTo(row, col)}>
          <input
            ref={el => { inputRefs.current[key] = el; }}
            type="text"
            value={isActive ? (lookup.query !== '' ? lookup.query : String(cellVal ?? '')) : String(cellVal ?? '')}
            onChange={e => { if (isActive) handleLookupSearch(row, col, col_def, e.target.value); }}
            onKeyDown={e => handleCellKeyDown(e, row, col, col_def)}
            onFocus={() => { setActive({ row, col }); setLookupState(key, { query: String(cellVal ?? '') }); }}
            style={inputStyle}
          />
          {lookup.loading && (
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', fontSize: 11 }}>…</span>
          )}
          {isActive && lookup.open && (
            <div style={{
              position: 'absolute', left: 0, top: '100%', zIndex: 200,
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
              minWidth: '200px', maxHeight: 160, overflowY: 'auto', padding: 4,
            }}>
              {lookup.results.length === 0
                ? <div style={{ padding: '8px 10px', color: 'var(--text-faint)', fontSize: 13 }}>No results</div>
                : lookup.results.map((opt, i) => (
                  <div
                    key={opt.id}
                    onMouseDown={() => selectLookupOption(row, col, col_def, opt)}
                    onMouseEnter={() => setLookupState(key, { highlighted: i })}
                    style={{
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                      background: i === lookup.highlighted ? 'var(--primary-subtle)' : 'transparent',
                      color: i === lookup.highlighted ? 'var(--primary-light)' : 'var(--text)',
                      cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                    }}
                  >
                    {opt.sub ? <span style={{ color: 'var(--text-faint)', marginRight: 6, fontSize: 11 }}>[{opt.sub}]</span> : null}
                    {opt.label}
                  </div>
                ))
              }
            </div>
          )}
        </td>
      );
    }

    return (
      <td key={col_def.key} style={baseCellStyle} className={col_def.width} onClick={() => moveTo(row, col)}>
        <input
          ref={el => { inputRefs.current[key] = el; }}
          type="text"
          inputMode={col_def.type === 'number' ? 'decimal' : 'text'}
          value={String(cellVal ?? '')}
          onChange={e => updateCell(row, col_def.key, e.target.value)}
          onKeyDown={e => handleCellKeyDown(e, row, col, col_def)}
          onFocus={() => setActive({ row, col })}
          style={{ ...inputStyle, textAlign: col_def.type === 'number' ? 'right' : 'left' }}
        />
      </td>
    );
  };

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', fontFamily: 'var(--font)' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              <th style={{
                padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
                color: 'var(--text-faint)', borderBottom: '1px solid var(--border)',
                width: 36,
              }}>#</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.width}
                  style={{
                    padding: '8px 10px', textAlign: 'left', fontWeight: 600,
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
                    color: 'var(--text-faint)', borderBottom: '1px solid var(--border)',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{ background: active?.row === rowIdx ? 'var(--bg-elevated)' : 'transparent' }}
                onClick={() => { setActive({ row: rowIdx, col: active?.col ?? 0 }); onActiveRowChange?.(rowIdx); }}
              >
                <td style={{
                  padding: '4px 10px', textAlign: 'center',
                  color: 'var(--text-faint)', fontSize: 12,
                  borderBottom: '1px solid var(--border-muted)',
                  cursor: 'pointer',
                }}>
                  {rowIdx + 1}
                </td>
                {columns.map((col, colIdx) => renderCell(rowIdx, colIdx, col, row))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{
                    padding: '24px', textAlign: 'center',
                    color: 'var(--text-faint)', fontSize: 13, fontStyle: 'italic',
                  }}
                >
                  No lines — press F3 to add a row
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
