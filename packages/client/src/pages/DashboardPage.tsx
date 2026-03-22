import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Clock, BarChart2 } from 'lucide-react';
import { api } from '../lib/api';

interface DashboardData {
  revenueThisMonth: number;
  totalAROutstanding: number;
  totalAPOutstanding: number;
  cashBalance: number;
  overdueAR: number;
  asOf: string;
}

function formatSAR(halalas: number): string {
  return (halalas / 100).toLocaleString('en-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: 'up' | 'down' | 'neutral';
  sub?: string;
}

function KpiCard({ label, value, icon, iconBg, iconColor, trend, sub }: KpiCardProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
          SAR {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            {trend === 'up' && <TrendingUp size={12} style={{ color: 'var(--success)' }} />}
            {trend === 'down' && <TrendingDown size={12} style={{ color: 'var(--danger)' }} />}
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ height: 14, width: 100, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ height: 36, width: 36, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
      <div style={{ height: 28, width: 140, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite' }} />
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<{ data: DashboardData }>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/reports/dashboard').then(r => r.data),
  });

  const d = data?.data;
  const asOf = d?.asOf ? new Date(d.asOf).toLocaleDateString('en-SA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const kpis: KpiCardProps[] = d ? [
    {
      label: 'Revenue This Month',
      value: formatSAR(d.revenueThisMonth),
      icon: <TrendingUp size={18} />,
      iconBg: 'var(--success-subtle)',
      iconColor: 'var(--success)',
      trend: 'up',
      sub: 'Current month',
    },
    {
      label: 'Cash Balance',
      value: formatSAR(d.cashBalance),
      icon: <DollarSign size={18} />,
      iconBg: 'var(--primary-subtle)',
      iconColor: 'var(--primary-light)',
    },
    {
      label: 'AR Outstanding',
      value: formatSAR(d.totalAROutstanding),
      icon: <BarChart2 size={18} />,
      iconBg: 'var(--info-subtle)',
      iconColor: 'var(--info)',
      sub: 'Accounts receivable',
    },
    {
      label: 'AP Outstanding',
      value: formatSAR(d.totalAPOutstanding),
      icon: <BarChart2 size={18} />,
      iconBg: 'var(--warning-subtle)',
      iconColor: 'var(--warning)',
      sub: 'Accounts payable',
    },
    {
      label: 'Overdue AR',
      value: formatSAR(d.overdueAR),
      icon: <AlertCircle size={18} />,
      iconBg: 'var(--danger-subtle)',
      iconColor: 'var(--danger)',
      trend: d.overdueAR > 0 ? 'down' : 'neutral',
      sub: d.overdueAR > 0 ? 'Requires attention' : 'All clear',
    },
  ] : [];

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ maxWidth: 1200 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Overview
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            As of {asOf}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-subtle)', border: '1px solid var(--danger)',
            borderRadius: 'var(--radius)', padding: '12px 16px',
            color: 'var(--danger)', fontSize: 13, marginBottom: 20,
          }}>
            Failed to load dashboard data.
          </div>
        )}

        {/* KPI Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
            : kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)
          }
        </div>

        {/* Quick links */}
        {!isLoading && (
          <div style={{ marginTop: 32 }}>
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '20px 24px',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: 'New Journal Entry', href: '/journal/new' },
                  { label: 'New Purchase Order', href: '/purchase-orders/new' },
                  { label: 'New Sales Invoice', href: '/sales-invoices/new' },
                  { label: 'New Customer', href: '/customers/new' },
                  { label: 'New Supplier', href: '/suppliers/new' },
                ].map(a => (
                  <a
                    key={a.label}
                    href={a.href}
                    style={{
                      padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text)', fontSize: 13, textDecoration: 'none',
                      transition: 'all 0.12s', display: 'inline-block',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'var(--primary-subtle)';
                      e.currentTarget.style.color = 'var(--primary-light)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'var(--bg-elevated)';
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    + {a.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
