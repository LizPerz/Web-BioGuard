import { ReactNode } from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[`badge${capitalize(variant)}`]}`}>{children}</span>;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
