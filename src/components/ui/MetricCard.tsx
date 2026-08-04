import { ReactNode } from 'react';
import { HeartPulse, Thermometer, Droplets, Brain } from 'lucide-react';
import { StatusBadge } from './badges';
import './metric-card.css';

const iconMap: Record<string, ReactNode> = {
  HeartPulse: <HeartPulse size={20} strokeWidth={1.8} />,
  Thermometer: <Thermometer size={20} strokeWidth={1.8} />,
  Droplets: <Droplets size={20} strokeWidth={1.8} />,
  Brain: <Brain size={20} strokeWidth={1.8} />,
};

interface MetricCardProps {
  icon: keyof typeof iconMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
  hasData: boolean;
}

export function MetricCard({ icon, iconBg, iconColor, label, value, unit, hasData }: MetricCardProps) {
  return (
    <div className="metric-card">
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
