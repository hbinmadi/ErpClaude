import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme, THEMES, type Theme } from '../lib/ThemeContext';
import { Palette, Check } from 'lucide-react';

export default function LoginPage() {
  const login = useAuth(s => s.login);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password');
      emailRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg)', fontFamily: 'var(--font)',
    }}>
      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 64px',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 420 }}>
          {/* Logo */}
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--primary)', marginBottom: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>S</span>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 12, lineHeight: 1.1 }}>
            Sara Advanced<br />Trading ERP
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 340 }}>
            Integrated e-Invoicing, accounting, sales, purchase, and HR platform.
            ZATCA-compliant for Saudi Arabia.
          </p>

          <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '⚡', text: 'Real-time financial reporting' },
              { icon: '🔒', text: 'ZATCA Phase 2 compliant e-invoicing' },
              { icon: '🌐', text: 'Multi-currency & multi-module ERP' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: 440, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '48px 40px',
        background: 'var(--bg)', position: 'relative',
      }}>
        {/* Theme picker */}
        <div style={{ position: 'absolute', top: 20, right: 20 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowThemes(t => !t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
                padding: '6px 12px', cursor: 'pointer', fontSize: 12,
              }}
            >
              <Palette size={13} />
              Theme
            </button>
            {showThemes && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
                padding: 8, minWidth: 180, zIndex: 100,
              }}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTheme(t.id as Theme); setShowThemes(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      background: theme === t.id ? 'var(--primary-subtle)' : 'transparent',
                      border: 'none', borderRadius: 'var(--radius-sm)',
                      color: theme === t.id ? 'var(--primary-light)' : 'var(--text)',
                      padding: '6px 8px', cursor: 'pointer', fontSize: 13, textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'flex', gap: 2 }}>
                      {[t.preview.bg, t.preview.surface, t.preview.accent].map((c, i) => (
                        <span key={i} style={{ width: 8, height: 8, borderRadius: 2, background: c, border: '1px solid rgba(255,255,255,0.1)' }} />
                      ))}
                    </span>
                    <span style={{ flex: 1 }}>{t.label}</span>
                    {theme === t.id && <Check size={12} style={{ color: 'var(--primary)' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Sign in
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
            Enter your credentials to access the ERP.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                Email
              </label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="username"
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                  fontSize: 14, outline: 'none', fontFamily: 'var(--font)',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--input-focus)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '10px 12px',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text)',
                  fontSize: 14, outline: 'none', fontFamily: 'var(--font)',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--input-focus)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--input-border)')}
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-subtle)', border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                color: 'var(--danger)', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px',
                background: loading ? 'var(--primary-dark)' : 'var(--primary)',
                color: 'var(--primary-fg)', border: 'none',
                borderRadius: 'var(--radius-sm)', fontSize: 14,
                fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font)', transition: 'background 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.background = 'var(--primary-dark)'; }}
              onMouseOut={e => { if (!loading) e.currentTarget.style.background = 'var(--primary)'; }}
            >
              {loading && (
                <span style={{
                  width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
