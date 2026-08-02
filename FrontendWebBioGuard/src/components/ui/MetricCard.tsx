import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './MetricCard.module.css';

type AccentColor = 'red' | 'cyan' | 'purple' | 'yellow' | 'green' | 'blue';
type Trend = 'up' | 'down' | 'stable';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  accent: AccentColor;
  status?: string;
  trend?: Trend;
  trendLabel?: string;
}

export function MetricCard({
  icon,
  label,
  value,
  unit,
  accent,
  status,
  trend,
  trendLabel,
}: MetricCardProps) {
  return (
    <div className={`${styles.metricCard} ${styles[`metricCard${capitalize(accent)}`]}`}>
      <div className={styles.metricHeader}>
        <div className={`${styles.metricIcon} ${styles[`metricIcon${capitalize(accent)}`]}`}>
          {icon}
        </div>
        {status && (
          <span className={styles.metricStatus}>{status}</span>
        )}
      </div>
      <div>
        <span className={styles.metricLabel}>{label}</span>
        <div>
          <span className={styles.metricValue}>{value}</span>
          {unit && <span className={styles.metricUnit}>{unit}</span>}
        </div>
      </div>
      {trend && (
        <div className={`${styles.metricTrend} ${styles[`trend${capitalize(trend)}`]}`}>
          {trend === 'up' && <TrendingUp size={16} />}
          {trend === 'down' && <TrendingDown size={16} />}
          {trend === 'stable' && <Minus size={16} />}
          {trendLabel && <span>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
