import styles from './Feedback.module.css';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className={`${styles.spinner} ${size === 'sm' ? styles.spinnerSm : ''}`} role="status">
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className={styles.overlay} role="status">
      <div className={styles.spinner}>
        <span className="sr-only">Cargando...</span>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <span className={styles.emptyTitle}>{title}</span>
      {description && <span className={styles.emptyText}>{description}</span>}
      {action}
    </div>
  );
}
