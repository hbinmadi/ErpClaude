import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DosSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  onNext?: () => void;
  onPrev?: () => void;
  error?: string;
  labelWidth?: number;
  fieldWidth?: number;
  id?: string;
  required?: boolean;
}

export default function DosSelect({
  label,
  value,
  onChange,
  options,
  onNext,
  onPrev,
  error,
  labelWidth,
  fieldWidth,
  id,
  required,
}: DosSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = options.find(o => o.value === value)?.label ?? value;

  useEffect(() => {
    if (open) {
      const idx = options.findIndex(o => o.value === value);
      setHighlighted(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  const selectOption = useCallback((optValue: string) => {
    onChange(optValue);
    setOpen(false);
    onNext?.();
  }, [onChange, onNext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); }
      else if (e.key === 'Enter') { selectOption(options[highlighted]?.value ?? value); }
      else if (e.key === 'ArrowDown') { setHighlighted(h => Math.min(h + 1, options.length - 1)); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Escape') {
      e.preventDefault(); setOpen(false);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (open) { selectOption(options[highlighted]?.value ?? value); }
      else if (e.shiftKey) { onPrev?.(); }
      else { onNext?.(); }
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
        <div
          id={id}
          tabIndex={0}
          role="combobox"
          aria-expanded={open}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 150); }}
          onClick={() => setOpen(o => !o)}
          style={{
            padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'var(--input-bg)',
            border: `1px solid ${focused || open ? 'var(--input-focus)' : error ? 'var(--danger)' : 'var(--input-border)'}`,
            borderRadius: 'var(--radius-sm)', color: 'var(--text)',
            cursor: 'pointer', fontSize: 13, userSelect: 'none',
            boxShadow: (focused || open) ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}` : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        >
          <span>{currentLabel || <span style={{ color: 'var(--text-faint)' }}>Select…</span>}</span>
          <ChevronDown size={14} style={{
            color: 'var(--text-faint)', marginLeft: 8, flexShrink: 0,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'none',
          }} />
        </div>

        {open && (
          <div style={{
            position: 'absolute', left: 0, top: 'calc(100% + 4px)', zIndex: 200,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '100%', maxHeight: 220, overflowY: 'auto',
            padding: 4,
          }}>
            {options.map((opt, i) => (
              <div
                key={opt.value}
                onMouseDown={() => selectOption(opt.value)}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: i === highlighted ? 'var(--primary-subtle)' : 'transparent',
                  color: i === highlighted ? 'var(--primary-light)' : 'var(--text)',
                  cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                }}
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, margin: '4px 0 0' }}>{error}</p>
      )}
    </div>
  );
}
