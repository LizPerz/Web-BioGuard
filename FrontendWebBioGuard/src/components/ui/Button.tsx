import { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    styles.btn,
    styles[`btn-${variant}`],
    size !== 'md' ? styles[`btn-${size}`] : '',
    fullWidth ? styles['btn-full'] : '',
    loading ? styles['btn-loading'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {children}
    </button>
  );
}
