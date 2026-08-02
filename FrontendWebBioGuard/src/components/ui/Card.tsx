import { HTMLAttributes } from 'react';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glow?: boolean;
  selected?: boolean;
}

export function Card({
  hoverable = false,
  glow = false,
  selected = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const classes = [
    styles.card,
    hoverable ? styles.cardHoverable : '',
    glow ? styles.cardGlow : '',
    selected ? styles.cardSelected : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
