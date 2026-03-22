type Status =
  | 'draft' | 'posted' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  | 'pending' | 'cleared' | 'error' | 'rejected' | 'reported' | 'submitted'
  | 'approved' | 'active' | 'inactive' | 'confirmed' | 'open' | 'processing'
  | string;

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft:      { bg: 'var(--bg-elevated)',    color: 'var(--text-muted)' },
  posted:     { bg: 'var(--info-subtle)',     color: 'var(--info)' },
  paid:       { bg: 'var(--success-subtle)', color: 'var(--success)' },
  partial:    { bg: 'var(--warning-subtle)', color: 'var(--warning)' },
  overdue:    { bg: 'var(--danger-subtle)',  color: 'var(--danger)' },
  cancelled:  { bg: 'var(--bg-elevated)',    color: 'var(--text-faint)' },
  pending:    { bg: 'var(--warning-subtle)', color: 'var(--warning)' },
  cleared:    { bg: 'var(--success-subtle)', color: 'var(--success)' },
  error:      { bg: 'var(--danger-subtle)',  color: 'var(--danger)' },
  rejected:   { bg: 'var(--danger-subtle)',  color: 'var(--danger)' },
  reported:   { bg: 'var(--info-subtle)',    color: 'var(--info)' },
  submitted:  { bg: 'var(--info-subtle)',    color: 'var(--info)' },
  approved:   { bg: 'var(--success-subtle)', color: 'var(--success)' },
  active:     { bg: 'var(--success-subtle)', color: 'var(--success)' },
  inactive:   { bg: 'var(--bg-elevated)',    color: 'var(--text-faint)' },
  confirmed:  { bg: 'var(--primary-subtle)', color: 'var(--primary-light)' },
  open:       { bg: 'var(--info-subtle)',    color: 'var(--info)' },
  processing: { bg: 'var(--primary-subtle)', color: 'var(--primary-light)' },
};

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = status?.toLowerCase() ?? '';
  const styles = STATUS_STYLES[key] ?? { bg: 'var(--bg-elevated)', color: 'var(--text-muted)' };
  const displayLabel = (label ?? status ?? '').toString();

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      background: styles.bg,
      color: styles.color,
      padding: '2px 8px',
      borderRadius: 100,
      whiteSpace: 'nowrap',
    }}>
      {displayLabel}
    </span>
  );
}
