import React from 'react';

export interface DosStatusBarShortcut {
  key: string;
  label: string;
}

export interface DosStatusBarProps {
  shortcuts: DosStatusBarShortcut[];
  message?: string;
  messageType?: 'success' | 'error' | 'info';
  record?: string;
  mode?: string;
}

export default function DosStatusBar({ shortcuts, message, messageType, record, mode }: DosStatusBarProps) {
  const msgColor =
    messageType === 'success' ? 'var(--success)' :
    messageType === 'error' ? 'var(--danger)' :
    'var(--info)';

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      padding: '6px 16px',
      display: 'flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--font)', fontSize: 12, flexWrap: 'wrap',
    }}>
      {shortcuts.map((s, i) => (
        <React.Fragment key={s.key}>
          {i > 0 && <span style={{ color: 'var(--border)', marginInline: 4 }}>|</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <kbd style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 3, padding: '0px 5px', fontSize: 11, fontWeight: 600,
              color: 'var(--primary-light)', fontFamily: 'inherit',
            }}>
              {s.key}
            </kbd>
            <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
          </span>
        </React.Fragment>
      ))}
      {message && (
        <span style={{ marginLeft: 'auto', fontWeight: 600, color: msgColor, fontSize: 12 }}>
          {message}
        </span>
      )}
      {record && (
        <span style={{ marginLeft: message ? 12 : 'auto', color: 'var(--text-faint)', fontSize: 12 }}>
          {record}
        </span>
      )}
      {mode && (
        <span style={{ marginLeft: record ? 12 : 'auto', fontWeight: 600, color: 'var(--text-muted)', fontSize: 12 }}>
          {mode}
        </span>
      )}
    </div>
  );
}
