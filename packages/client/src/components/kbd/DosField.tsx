import React, { useRef, useEffect, useState } from 'react';

export interface DosFieldProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  type?: 'text' | 'number' | 'date' | 'email' | 'password';
  required?: boolean;
  readOnly?: boolean;
  error?: string;
  labelWidth?: number;
  fieldWidth?: number;
  autoFocus?: boolean;
  id?: string;
  multiline?: boolean;
  hint?: string;
}

export default function DosField({
  label,
  value,
  onChange,
  onNext,
  onPrev,
  type = 'text',
  required,
  readOnly,
  error,
  labelWidth,
  fieldWidth,
  autoFocus,
  id,
  multiline,
  hint,
}: DosFieldProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (multiline && !e.ctrlKey) return;
      e.preventDefault();
      onNext?.();
    } else if (e.key === 'Tab') {
      if (e.shiftKey) { e.preventDefault(); onPrev?.(); }
      else { e.preventDefault(); onNext?.(); }
    }
  };

  const inputStyle: React.CSSProperties = {
    width: fieldWidth ? `${fieldWidth}ch` : '100%',
    padding: '8px 10px',
    background: readOnly ? 'var(--bg-elevated)' : 'var(--input-bg)',
    border: `1px solid ${focused ? 'var(--input-focus)' : error ? 'var(--danger)' : 'var(--input-border)'}`,
    borderRadius: 'var(--radius-sm)',
    color: readOnly ? 'var(--text-muted)' : 'var(--text)',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'var(--font)',
    transition: 'border-color 0.15s',
    boxShadow: focused ? `0 0 0 3px ${error ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)'}` : 'none',
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: error ? 'var(--danger)' : 'var(--text-muted)',
        marginBottom: 4, userSelect: 'none',
      }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {multiline ? (
        <textarea
          id={id}
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', width: '100%' }}
        />
      ) : (
        <input
          id={id}
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={String(value)}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          style={inputStyle}
        />
      )}
      {error && (
        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, margin: '4px 0 0' }}>
          {error}
        </p>
      )}
      {hint && focused && (
        <p style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, margin: '4px 0 0' }}>
          {hint}
        </p>
      )}
    </div>
  );
}
