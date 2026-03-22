import { useEffect, useRef } from 'react';

interface EscapeMenuProps {
  isOpen: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onStay: () => void;
  saving?: boolean;
  title?: string;
}

/**
 * Shown when the user presses Escape on any form.
 * Keyboard: S = Save & Leave, D = Discard, Esc = Stay
 */
export default function EscapeMenu({
  isOpen, onSave, onDiscard, onStay, saving = false, title = 'Leave this page?',
}: EscapeMenuProps) {
  const discardRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    discardRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onStay(); }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); onSave(); }
      if (e.key === 'd' || e.key === 'D') { e.preventDefault(); onDiscard(); }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isOpen, onSave, onDiscard, onStay]);

  if (!isOpen) return null;

  const kbd = (k: string) => (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 20, height: 20, padding: '0 5px',
      background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
      borderRadius: 4, fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
      flexShrink: 0,
    }}>
      {k}
    </span>
  );

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onStay}
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
        }}
      />

      {/* Menu card */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 901, width: 340,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        fontFamily: 'var(--font)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border)',
        }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            You have unsaved changes. What would you like to do?
          </p>
        </div>

        {/* Options */}
        <div style={{ padding: '8px 0' }}>
          {/* Save & Leave */}
          <button
            onClick={onSave}
            disabled={saving}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '11px 20px',
              background: 'none', border: 'none',
              color: 'var(--text)', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: 13, textAlign: 'left', transition: 'background 0.1s',
            }}
            onMouseOver={e => { if (!saving) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
          >
            {kbd('S')}
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600 }}>
                {saving ? 'Saving…' : 'Save & leave'}
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                Save your changes then go back
              </span>
            </span>
          </button>

          {/* Discard */}
          <button
            ref={discardRef}
            onClick={onDiscard}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '11px 20px',
              background: 'none', border: 'none',
              color: 'var(--danger)', cursor: 'pointer',
              fontSize: 13, textAlign: 'left', transition: 'background 0.1s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--danger-subtle)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
          >
            {kbd('D')}
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600 }}>Discard & leave</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                Lose unsaved changes and go back
              </span>
            </span>
          </button>

          {/* Stay */}
          <button
            onClick={onStay}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '11px 20px',
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: 13, textAlign: 'left', transition: 'background 0.1s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
          >
            {kbd('Esc')}
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 600 }}>Stay here</span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>
                Continue editing
              </span>
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
