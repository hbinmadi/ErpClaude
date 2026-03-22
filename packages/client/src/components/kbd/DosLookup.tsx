import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';

export interface LookupOption {
  id: number;
  label: string;
  sub?: string;
}

export interface DosLookupProps {
  label: string;
  value: string;
  selectedId: number | null;
  onSelect: (id: number, label: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  fetchOptions: (search: string) => Promise<LookupOption[]>;
  error?: string;
  labelWidth?: number;
  fieldWidth?: number;
  id?: string;
  required?: boolean;
}

export default function DosLookup({
  label,
  value,
  selectedId,
  onSelect,
  onNext,
  onPrev,
  fetchOptions,
  error,
  fieldWidth,
  id,
  required,
}: DosLookupProps) {
  const [inputVal, setInputVal] = useState(value);
  const [results, setResults] = useState<LookupOption[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  const doSearch = useCallback(async (s: string) => {
    if (!s.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetchOptions(s);
      setResults(res); setOpen(true); setHighlighted(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [fetchOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputVal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 200);
  };

  const selectResult = useCallback((opt: LookupOption) => {
    onSelect(opt.id, opt.label);
    setInputVal(opt.label);
    setOpen(false);
    setResults([]);
    onNext?.();
  }, [onSelect, onNext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'F2') { e.preventDefault(); doSearch(inputVal || ''); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open && inputVal.trim()) doSearch(inputVal);
      else setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && results[highlighted]) selectResult(results[highlighted]);
      else onNext?.();
    } else if (e.key === 'Escape') {
      e.preventDefault(); setOpen(false); setInputVal(value);
    } else if (e.key === 'Tab') {
      if (e.shiftKey) { e.preventDefault(); setOpen(false); onPrev?.(); }
      else { e.preventDefault(); if (open && results[highlighted]) selectResult(results[highlighted]); else { setOpen(false); onNext?.(); } }
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (selectedId === null) setInputVal('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedId]);

  return (
    <div style={{ marginBottom: 14 }} ref={containerRef}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: error ? 'var(--danger)' : 'var(--text-muted)',
        marginBottom: 4, userSelect: 'none',
      }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      <div style={{ position: 'relative', width: fieldWidth ? `${fieldWidth}ch` : '100%' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id={id}
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={`Type to search ${label.toLowerCase()}…`}
            style={{
              width: '100%', padding: '8px 36px 8px 10px',
              background: 'var(--input-bg)',
              border: `1px solid ${focused ? 'var(--input-focus)' : error ? 'var(--danger)' : 'var(--input-border)'}`,
              borderRadius: 'var(--radius-sm)', color: 'var(--text)',
              fontSize: 13, outline: 'none', fontFamily: 'var(--font)',
              boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}` : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          />
          <div style={{
            position: 'absolute', right: 10,
            color: 'var(--text-faint)', display: 'flex', alignItems: 'center',
            pointerEvents: 'none',
          }}>
            {loading
              ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
              : <Search size={14} />
            }
          </div>
        </div>

        {open && (
          <div style={{
            position: 'absolute', left: 0, top: 'calc(100% + 4px)', zIndex: 300,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
            minWidth: '100%', maxWidth: 400, maxHeight: 220, overflowY: 'auto',
            padding: 4,
          }}>
            {results.length === 0 ? (
              <div style={{ padding: '10px 12px', color: 'var(--text-faint)', fontSize: 13, textAlign: 'center' }}>
                No results found
              </div>
            ) : (
              results.map((opt, i) => (
                <div
                  key={opt.id}
                  onMouseDown={() => selectResult(opt)}
                  onMouseEnter={() => setHighlighted(i)}
                  style={{
                    padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                    background: i === highlighted ? 'var(--primary-subtle)' : 'transparent',
                    color: i === highlighted ? 'var(--primary-light)' : 'var(--text)',
                    cursor: 'pointer', fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{opt.label}</span>
                  {opt.sub && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-faint)' }}>
                      {opt.sub}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, margin: '4px 0 0' }}>{error}</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
