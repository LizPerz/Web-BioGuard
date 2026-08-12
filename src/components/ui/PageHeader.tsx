import { type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import './page-header.css';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, subtitle, action, onBack }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        {onBack && (
          <button className="page-header__back" onClick={onBack} aria-label="Volver al inicio">
            <ArrowLeft size={18} strokeWidth={1.8} />
          </button>
        )}
        <div>
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </div>
  );
}
