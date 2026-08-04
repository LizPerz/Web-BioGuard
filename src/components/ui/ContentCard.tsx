import { type ReactNode } from 'react';
import './content-card.css';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dashed' | 'danger';
  style?: React.CSSProperties;
  id?: string;
}

export function ContentCard({ children, className = '', variant = 'default', style, id }: ContentCardProps) {
  return (
    <div id={id} className={`content-card content-card--${variant} ${className}`} style={style}>
      {children}
    </div>
  );
}
