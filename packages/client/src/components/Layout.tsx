import { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, FileText, Truck, ShoppingCart,
  Receipt, Users, Package, UserCheck, DollarSign, Calendar,
  BarChart2, Shield, LogOut, ChevronDown, Palette, Clock,
  TrendingUp, Scale, AlarmClock, X, Check, Warehouse, Layers, GitBranch,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme, THEMES, type Theme } from '../lib/ThemeContext';

/* ── Nav structure ── */
interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: 'General',
    items: [
      { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { label: 'Chart of Accounts', to: '/accounts', icon: <BookOpen size={16} /> },
      { label: 'Journal Entries', to: '/journal', icon: <FileText size={16} /> },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', to: '/inventory/products', icon: <Layers size={16} /> },
      { label: 'Stock Levels', to: '/inventory/stock', icon: <Warehouse size={16} /> },
    ],
  },
  {
    label: 'Purchase',
    items: [
      { label: 'Suppliers', to: '/suppliers', icon: <Truck size={16} /> },
      { label: 'Purchase Orders', to: '/purchase-orders', icon: <ShoppingCart size={16} /> },
      { label: 'Supplier Invoices', to: '/supplier-invoices', icon: <Receipt size={16} /> },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', to: '/customers', icon: <Users size={16} /> },
      { label: 'Sales Orders', to: '/sales-orders', icon: <Package size={16} /> },
      { label: 'Sales Invoices', to: '/sales-invoices', icon: <FileText size={16} /> },
    ],
  },
  {
    label: 'HR',
    items: [
      { label: 'Employees', to: '/employees', icon: <UserCheck size={16} /> },
      { label: 'Payroll', to: '/payroll', icon: <DollarSign size={16} /> },
      { label: 'Leave Requests', to: '/leave', icon: <Calendar size={16} /> },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Trial Balance', to: '/reports/trial-balance', icon: <BarChart2 size={16} /> },
      { label: 'Profit & Loss', to: '/reports/profit-loss', icon: <TrendingUp size={16} /> },
      { label: 'Balance Sheet', to: '/reports/balance-sheet', icon: <Scale size={16} /> },
      { label: 'AR Ageing', to: '/reports/ar-ageing', icon: <AlarmClock size={16} /> },
      { label: 'AP Ageing', to: '/reports/ap-ageing', icon: <AlarmClock size={16} /> },
    ],
  },
  {
    label: 'Branches',
    items: [
      { label: 'Branches', to: '/branches', icon: <GitBranch size={16} /> },
      { label: 'Branch Transfers', to: '/branch-transfers', icon: <GitBranch size={16} /> },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { label: 'ZATCA', to: '/zatca', icon: <Shield size={16} /> },
    ],
  },
];

/* ── Clock ── */
function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
      <Clock size={13} />
      {time.toLocaleTimeString('en-SA', { hour12: false })}
    </span>
  );
}

/* ── Theme Picker ── */
function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Change theme"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)',
          padding: '5px 10px', cursor: 'pointer', fontSize: 13,
          transition: 'all 0.15s',
        }}
        onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
        onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <Palette size={14} />
        <span style={{ textTransform: 'capitalize' }}>{theme}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 500,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)',
          padding: 8, minWidth: 200,
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-faint)', padding: '2px 8px 8px', textTransform: 'uppercase', letterSpacing: 1 }}>
            Choose Theme
          </p>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id as Theme); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                background: theme === t.id ? 'var(--primary-subtle)' : 'transparent',
                border: 'none', borderRadius: 'var(--radius-sm)',
                color: theme === t.id ? 'var(--primary-light)' : 'var(--text)',
                padding: '7px 8px', cursor: 'pointer', fontSize: 13, textAlign: 'left',
              }}
              onMouseOver={e => {
                if (theme !== t.id) e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseOut={e => {
                if (theme !== t.id) e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Color swatch */}
              <span style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: t.preview.bg, border: '1px solid rgba(255,255,255,0.1)' }} />
                <span style={{ width: 10, height: 10, borderRadius: 2, background: t.preview.surface, border: '1px solid rgba(255,255,255,0.1)' }} />
                <span style={{ width: 10, height: 10, borderRadius: 2, background: t.preview.accent }} />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 500 }}>{t.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{t.description}</span>
              </span>
              {theme === t.id && <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Sidebar ── */
interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuth(s => s.logout);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const toggleGroup = (label: string) =>
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  const handleNav = (to: string) => {
    navigate(to);
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, zIndex: 39,
            background: 'rgba(0,0,0,0.5)',
          }}
          className="sidebar-overlay"
        />
      )}

      <aside style={{
        width: 240, flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        height: '100%', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--sidebar-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--sidebar-fg-active)', letterSpacing: '-0.3px' }}>
              Sara Trading
            </div>
            <div style={{ fontSize: 11, color: 'var(--sidebar-fg)', marginTop: 2 }}>
              ERP Platform
            </div>
          </div>
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            style={{
              display: 'none', background: 'none', border: 'none',
              color: 'var(--sidebar-fg)', cursor: 'pointer', padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV.map(group => {
            const isCollapsed = collapsed[group.label];
            return (
              <div key={group.label} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '5px 16px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--sidebar-fg)', fontSize: 11, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.8,
                  }}
                >
                  {group.label}
                  <ChevronDown
                    size={12}
                    style={{
                      transition: 'transform 0.2s',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'none',
                    }}
                  />
                </button>
                {!isCollapsed && (
                  <div>
                    {group.items.map(item => {
                      const active = isActive(item.to);
                      return (
                        <button
                          key={item.to}
                          onClick={() => handleNav(item.to)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            width: '100%', padding: '7px 16px 7px 20px',
                            background: active ? 'var(--sidebar-active-bg)' : 'none',
                            border: 'none', borderLeft: active
                              ? `2px solid var(--sidebar-indicator)`
                              : '2px solid transparent',
                            color: active ? 'var(--sidebar-fg-active)' : 'var(--sidebar-fg)',
                            cursor: 'pointer', fontSize: 13,
                            fontWeight: active ? 500 : 400,
                            textAlign: 'left', transition: 'all 0.12s',
                          }}
                          onMouseOver={e => {
                            if (!active) {
                              e.currentTarget.style.background = 'var(--sidebar-active-bg)';
                              e.currentTarget.style.color = 'var(--sidebar-fg-active)';
                            }
                          }}
                          onMouseOut={e => {
                            if (!active) {
                              e.currentTarget.style.background = 'none';
                              e.currentTarget.style.color = 'var(--sidebar-fg)';
                            }
                          }}
                        >
                          <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px 12px', borderTop: '1px solid var(--sidebar-border)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 8px',
              background: 'none', border: 'none', borderRadius: 'var(--radius-sm)',
              color: 'var(--sidebar-fg)', cursor: 'pointer', fontSize: 13,
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'var(--danger-subtle)';
              e.currentTarget.style.color = 'var(--danger)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = 'var(--sidebar-fg)';
            }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ── Main Layout ── */
export default function Layout() {
  const user = useAuth(s => s.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Derive page title from path
  const getTitle = () => {
    const p = location.pathname;
    if (p === '/') return 'Dashboard';
    if (p.startsWith('/accounts')) return 'Chart of Accounts';
    if (p.startsWith('/journal')) return 'Journal Entries';
    if (p.startsWith('/inventory/stock')) return 'Stock Levels';
    if (p.startsWith('/inventory/products')) return 'Products';
    if (p.startsWith('/suppliers')) return 'Suppliers';
    if (p.startsWith('/purchase-orders')) return 'Purchase Orders';
    if (p.startsWith('/supplier-invoices')) return 'Supplier Invoices';
    if (p.startsWith('/customers')) return 'Customers';
    if (p.startsWith('/sales-orders')) return 'Sales Orders';
    if (p.startsWith('/sales-invoices')) return 'Sales Invoices';
    if (p.startsWith('/employees')) return 'Employees';
    if (p.startsWith('/payroll')) return 'Payroll';
    if (p.startsWith('/leave')) return 'Leave Requests';
    if (p.startsWith('/reports/trial-balance')) return 'Trial Balance';
    if (p.startsWith('/reports/profit-loss')) return 'Profit & Loss';
    if (p.startsWith('/reports/balance-sheet')) return 'Balance Sheet';
    if (p.startsWith('/reports/ar-ageing')) return 'AR Ageing';
    if (p.startsWith('/reports/ap-ageing')) return 'AP Ageing';
    if (p.startsWith('/zatca')) return 'ZATCA';
    if (p.startsWith('/branch-transfers')) return 'Branch Transfers';
    if (p.startsWith('/branches')) return 'Branches';
    return 'ERP';
  };

  return (
    <div style={{
      display: 'flex', height: '100%', background: 'var(--bg)',
      fontFamily: 'var(--font)', overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: 56, flexShrink: 0,
          background: 'var(--topbar-bg)',
          borderBottom: '1px solid var(--topbar-border)',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 16,
        }}>
          <h1 style={{
            fontSize: 16, fontWeight: 600, color: 'var(--text)',
            margin: 0, flex: 1,
          }}>
            {getTitle()}
          </h1>

          <LiveClock />

          <div style={{
            height: 20, width: 1,
            background: 'var(--border)', flexShrink: 0,
          }} />

          <ThemePicker />

          <div style={{
            height: 20, width: 1,
            background: 'var(--border)', flexShrink: 0,
          }} />

          {/* User avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--primary)', color: 'var(--primary-fg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {(user?.fullName ?? 'A').charAt(0).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.2 }}>
                {user?.fullName ?? 'Admin User'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.2 }}>
                {user?.role ?? 'admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex: 1, overflow: 'auto', padding: '24px',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
