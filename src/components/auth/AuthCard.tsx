import { ReactNode } from 'react';
import './auth-card.css';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
}

export function AuthCard({ title, subtitle, children, footer, maxWidth = 480 }: AuthCardProps) {
  return (
    <div className="auth-card" style={{ maxWidth }}>
      <div className="auth-card__header">
        <div className="auth-card__logo-badge">
          <img src="/bioguard.png" alt="BioGuard" className="auth-card__logo-img" />
        </div>
        <h1 className="auth-card__title">{title}</h1>
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
      </div>
      <div className="auth-card__body">
        {children}
      </div>
      {footer && (
        <div className="auth-card__footer">
          {footer}
        </div>
      )}
    </div>
  );
}
