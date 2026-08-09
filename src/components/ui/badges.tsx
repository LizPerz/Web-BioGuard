import './badges.css';

interface StatusBadgeProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

export function StatusBadge({ label, variant = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>
      {label}
    </span>
  );
}
