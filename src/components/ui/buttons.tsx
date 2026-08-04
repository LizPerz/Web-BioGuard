import { ButtonHTMLAttributes } from 'react';
import './buttons.css';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function PrimaryButton({ children, fullWidth, className = '', ...props }: PrimaryButtonProps) {
  return (
    <button
      className={`btn btn-primary ${fullWidth ? 'btn--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function SecondaryButton({ children, fullWidth, className = '', ...props }: SecondaryButtonProps) {
  return (
    <button
      className={`btn btn-secondary ${fullWidth ? 'btn--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface DangerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function DangerButton({ children, fullWidth, className = '', ...props }: DangerButtonProps) {
  return (
    <button
      className={`btn btn-danger ${fullWidth ? 'btn--full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface GhostButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function GhostButton({ children, className = '', ...props }: GhostButtonProps) {
  return (
    <button
      className={`btn btn-ghost ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
