import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';

export interface DosBrowseColumn {
  key: string;
  header: string;
  width: number;
  align?: 'left' | 'right';
  render?: (row: Record<string, unknown>) => string;
}

export interface DosBrowseProps {
  title: string;
  columns: DosBrowseColumn[];
  rows: Record<string, unknown>[];
  onSelect?: (row: Record<string, unknown>) => void;
  onNew?: () => void;
  onDelete?: (row: Record<string, unknown>) => void;
  loading?: boolean;
  total?: number;
  page?: number;
}

export default function DosBrowse({
  title, columns, rows, onSelect, onNew, onDelete, loading,
}: DosBrowseProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { containerRef.current?.focus(); }, []);

  const filtered = search.trim()
    ? rows.filter(row =>
        columns.some(col => {
          const v = col.render ? col.render(row) : String(row[col.key] ?? '');
          return v.toLowerCase().includes(search.toLowerCase());
        })
      )
    : rows;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.target === searchRef.current) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 1, 0));
        break;
      case 'PageDown':
        e.preventDefault();
        setSelectedIdx(i => Math.min(i + 10, filtered.length - 1));
        break;
      case 'PageUp':
        e.preventDefault();
        setSelectedIdx(i => Math.max(i - 10, 0));
        break;
      case 'Home':
        if (e.ctrlKey) { e.preventDefault(); setSelectedIdx(0); }
        break;
      case 'End':
        if (e.ctrlKey) { e.preventDefault(); setSelectedIdx(filtered.length - 1); }
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIdx]) onSelect?.(filtered[selectedIdx]);
        break;
      case 'Insert':
        e.preventDefault(); onNew?.();
        break;
      case 'Delete':
        e.preventDefault();
        if (filtered[selectedIdx]) onDelete?.(filtered[selectedIdx]);
        break;
    }
  }, [filtered, selectedIdx, onSelect, onNew, onDelete]);

  const getCellValue = (row: Record<string, unknown>, col: DosBrowseColumn): string => {
    if (col.render) return col.render(row);
    const v = row[col.key];
    if (v === null || v === undefined) return '';
    return String(v);
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: 'none', fontFamily: 'var(--font)' }}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, gap: 12,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-faint)', pointerEvents: 'none',
            }} />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedIdx(0); }}
              placeholder="Filter…"
              style={{
                padding: '7px 10px 7px 32px',
                background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                fontSize: 13, outline: 'none', width: 180,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--input-focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
            />
          </div>
          {onNew && (
            <button
              onClick={onNew}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', background: 'var(--primary)',
                color: 'var(--primary-fg)', border: 'none',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
              }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--primary-dark)')}
              onMouseOut={e => (e.currentTarget.style.background = 'var(--primary)')}
            >
              <Plus size={14} />
              New
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{
                    padding: '10px 14px', textAlign: col.align ?? 'left',
                    color: 'var(--text-muted)', fontWeight: 600,
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
                    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
                  }}
                >
                  {col.header}
                </th>
              ))}
              {(onSelect || onDelete) && (
                <th style={{
                  padding: '10px 14px', textAlign: 'right',
                  color: 'var(--text-muted)', fontWeight: 600,
                  fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6,
                  borderBottom: '1px solid var(--border)',
                }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, ci) => (
                    <td key={ci} style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-muted)' }}>
                      <div style={{
                        height: 13, width: '75%', background: 'var(--bg-elevated)',
                        borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite',
                      }} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (onSelect || onDelete ? 1 : 0)}
                  style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}
                >
                  No records found
                </td>
              </tr>
            )}
            {!loading && filtered.map((row, i) => {
              const isSelected = i === selectedIdx;
              return (
                <tr
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  onDoubleClick={() => { setSelectedIdx(i); onSelect?.(row); }}
                  style={{
                    background: isSelected ? 'var(--primary-subtle)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      style={{
                        padding: '9px 14px',
                        color: isSelected ? 'var(--primary-light)' : 'var(--text)',
                        borderBottom: '1px solid var(--border-muted)',
                        textAlign: col.align ?? 'left',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        maxWidth: `${col.width * 8}px`, textOverflow: 'ellipsis',
                      }}
                    >
                      {getCellValue(row, col)}
                    </td>
                  ))}
                  {(onSelect || onDelete) && (
                    <td style={{
                      padding: '9px 14px', textAlign: 'right',
                      borderBottom: '1px solid var(--border-muted)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        {onSelect && (
                          <button
                            onClick={e => { e.stopPropagation(); onSelect(row); }}
                            style={{
                              padding: '3px 10px', background: 'var(--primary-subtle)',
                              color: 'var(--primary-light)', border: 'none',
                              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                              fontSize: 12, fontWeight: 500,
                            }}
                          >
                            Open
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={e => { e.stopPropagation(); onDelete(row); }}
                            style={{
                              padding: '3px 8px', background: 'transparent',
                              color: 'var(--text-faint)', border: 'none',
                              borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 12,
                            }}
                            onMouseOver={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-subtle)'; }}
                            onMouseOut={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 10, padding: '0 2px',
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          {search && ` (filtered from ${rows.length})`}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setSelectedIdx(i => Math.max(i - 1, 0))}
            style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <ChevronUp size={14} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70, textAlign: 'center' }}>
            {filtered.length > 0 ? `${selectedIdx + 1} / ${filtered.length}` : '0 / 0'}
          </span>
          <button
            onClick={() => setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))}
            style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)',
            }}
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
