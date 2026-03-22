import React, { useEffect } from 'react';
import { AlertCircle, Info, HelpCircle, X } from 'lucide-react';

export interface DosAlertProps {
  message: string;
  onDismiss: () => void;
  type?: 'error' | 'info' | 'confirm';
}

export default function DosAlert({ message, onDismiss, type = 'info' }: DosAlertProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [onDismiss]);

  const icon = type === 'error'
    ? <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
    : type === 'confirm'
    ? <HelpCircle size={20} style={{ color: 'var(--warning)' }} />
    : <Info size={20} style={{ color: 'var(--info)' }} />;

  const title = type === 'error' ? 'Error' : type === 'confirm' ? 'Confirm' : 'Information';

  const borderColor = type === 'error'
    ? 'var(--danger)'
    : type === 'confirm'
    ? 'var(--warning)'
    : 'var(--primary)';

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
      }}
      onClick={onDismiss}
    >
      <div
        style={{
          background: 'var(--bg-surface)', border: `1px solid ${borderColor}`,
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          padding: '24px 28px', maxWidth: 400, width: '90%',
          fontFamily: 'var(--font)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {icon}
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{title}</span>
          </div>
          <button
            onClick={onDismiss}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-faint)', padding: 4, display: 'flex', borderRadius: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Message */}
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
          {message}
        </p>

        {/* Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onDismiss}
            autoFocus
            style={{
              padding: '8px 20px',
              background: 'var(--primary)', color: 'var(--primary-fg)',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
