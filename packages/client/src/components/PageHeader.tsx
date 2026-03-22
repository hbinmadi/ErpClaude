interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      marginBottom: 20, gap: 16,
    }}>
      <div>
        <h2 style={{
          fontSize: 20, fontWeight: 700, color: 'var(--text)',
          margin: 0, lineHeight: 1.3,
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            fontSize: 13, color: 'var(--text-muted)',
            marginTop: 2, margin: 0,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}
