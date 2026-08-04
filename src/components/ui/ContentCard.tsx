import { ReactNode } from 'react';
import './content-card.css';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dashed' | 'danger';
}

export function ContentCard({ children, className = '', variant = 'default' }: ContentCardProps) {
  return (
    <div className={`content-card content-card--${variant} ${className}`}>
      {children}
    </div>
  );
}
