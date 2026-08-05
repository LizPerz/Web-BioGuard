import { type ReactNode } from 'react';
import './content-card.css';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dashed' | 'danger';
  style?: React.CSSProperties;
  id?: string;
  onClick?: () => void;
}

export function ContentCard({ children, className = '', variant = 'default', style, id, onClick }: ContentCardProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      id={id}
      className={`content-card content-card--${variant} ${className} ${interactive ? 'content-card--interactive' : ''}`}
      style={style}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
