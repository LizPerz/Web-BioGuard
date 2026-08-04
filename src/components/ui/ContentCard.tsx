import { type ReactNode } from 'react';
import './content-card.css';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dashed' | 'danger';
  style?: React.CSSProperties;
}

export function ContentCard({ children, className = '', variant = 'default', style }: ContentCardProps) {
  return (
    <div className={`content-card content-card--${variant} ${className}`} style={style}>
      {children}
    </div>
  );
}
