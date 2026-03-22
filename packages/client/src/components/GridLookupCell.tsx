import { useState, useRef, useCallback } from 'react';

export interface LookupOption {
  id: number;
  label: string;
  sub?: string;
}

interface GridLookupCellProps {
  value: string;
  fetchOptions: (search: string) => Promise<LookupOption[]>;
  onChange: (displayValue: string, id: number | null) => void;
  onSelectOption?: (opt: LookupOption) => void;
  onEnter: () => void;
  onBackspaceEmpty?: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  placeholder?: string;
  align?: 'left' | 'right';
}

export default function GridLookupCell({
  value,
  fetchOptions,
  onChange,
  onSelectOption,
  onEnter,
  onBackspaceEmpty,
  inputRef,
  placeholder,
  align = 'left',
}: GridLookupCellProps) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const localRef = useRef<HTMLInputElement | null>(null);

  const setRef = (el: HTMLInputElement | null) => {
    localRef.current = el;
    inputRef?.(el);
  };

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) { setOptions([]); setOpen(false); return; }
      try {
        const opts = await fetchOptions(q);
        setOptions(opts);
        setOpen(opts.length > 0);
        setHighlighted(0);
      } catch {
        // ignore fetch errors
      }
    },
    [fetchOptions]
  );

  const select = (opt: LookupOption) => {
    onChange(opt.label, opt.id);
    onSelectOption?.(opt);
    setOpen(false);
    setOptions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && options.length > 0) {
        select(options[highlighted]);
        setTimeout(() => onEnter(), 0);
      } else {
        onEnter();
      }
    } else if (e.key === 'ArrowDown') {
      if (open) { e.preventDefault(); setHighlighted(h => Math.min(h + 1, options.length - 1)); }
    } else if (e.key === 'ArrowUp') {
      if (open) { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); setOpen(false); }
      else { e.currentTarget.blur(); }
    } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
      onBackspaceEmpty?.();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={setRef}
        value={value}
        placeholder={placeholder}
        onChange={e => {
          onChange(e.target.value, null);
          search(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={e => {
          e.currentTarget.select();
          const td = e.currentTarget.closest('td') as HTMLElement | null;
          if (td) td.style.background = 'var(--primary-subtle)';
          if (value) search(value);
        }}
        onBlur={e => {
          const td = e.currentTarget.closest('td') as HTMLElement | null;
          if (td) td.style.background = '';
          setTimeout(() => setOpen(false), 150);
        }}
        style={{
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
        }}
      />
      {open && options.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 100,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow)',
            minWidth: 280,
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {options.map((opt, i) => (
            <div
              key={opt.id}
              onMouseDown={() => select(opt)}
              style={{
                padding: '7px 10px',
                cursor: 'pointer',
                background: i === highlighted ? 'var(--primary-subtle)' : 'transparent',
                fontSize: 13,
                color: 'var(--text)',
                borderBottom: i < options.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              {opt.sub && (
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono, monospace)', marginBottom: 1 }}>
                  {opt.sub}
                </div>
              )}
              <div>{opt.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
