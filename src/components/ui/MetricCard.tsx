import { type ReactNode } from 'react';
import { HeartPulse, Thermometer, Droplets, Brain, Activity, Footprints } from 'lucide-react';
import { StatusBadge } from './badges';
import './metric-card.css';

const iconMap: Record<string, ReactNode> = {
  HeartPulse: <HeartPulse size={20} strokeWidth={1.8} />,
  Thermometer: <Thermometer size={20} strokeWidth={1.8} />,
  Droplets: <Droplets size={20} strokeWidth={1.8} />,
  Brain: <Brain size={20} strokeWidth={1.8} />,
  Activity: <Activity size={20} strokeWidth={1.8} />,
  Footprints: <Footprints size={20} strokeWidth={1.8} />,
};

interface MetricCardProps {
  icon: keyof typeof iconMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
  hasData: boolean;
  onClick?: () => void;
}

export function MetricCard({ icon, iconBg, iconColor, label, value, unit, hasData, onClick }: MetricCardProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      className={`metric-card ${interactive ? 'metric-card--interactive' : ''}`}
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
      <div className="metric-card__header">
        <div
          className="metric-card__icon-box"
          style={{ background: iconBg, color: iconColor }}
        >
          {iconMap[icon]}
        </div>
        {!hasData && <StatusBadge label="Sin datos" variant="neutral" />}
      </div>
      <div className="metric-card__body">
        <span className="metric-card__value">{value}</span>
        <span className="metric-card__unit">{unit}</span>
      </div>
      <span className="metric-card__label">{label}</span>
    </div>
  );
}
