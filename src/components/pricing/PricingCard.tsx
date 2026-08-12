import { Check, Loader2 } from 'lucide-react';
import { PrimaryButton } from '../ui/buttons';
import './pricing-card.css';

interface PricingCardProps {
  label: string;
  name: string;
  price: string;
  period: string;
  benefits: string[];
  recommended: boolean;
  onSelect?: () => void;
  actionLabel?: string;
  loading?: boolean;
}

export function PricingCard({ label, name, price, period, benefits, recommended, onSelect, actionLabel, loading }: PricingCardProps) {
  return (
    <div className={`pricing-card ${recommended ? 'pricing-card--recommended' : ''}`}>
      {recommended && (
        <div className="pricing-card__badge">
          <span>Recomendado</span>
        </div>
      )}
      <div className="pricing-card__header">
        <span className="pricing-card__label">{label}</span>
        <h2 className="pricing-card__name">{name}</h2>
        <div className="pricing-card__price-row">
          <span className="pricing-card__price">{price}</span>
          {price !== 'Gratis' && <span className="pricing-card__period">{period}</span>}
        </div>
      </div>
      <ul className="pricing-card__benefits">
        {benefits.map((benefit, i) => (
          <li key={i}>
            <Check size={18} strokeWidth={2.5} />
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <div className="pricing-card__action">
        <PrimaryButton fullWidth onClick={onSelect} disabled={loading}>
          {loading && <Loader2 size={14} strokeWidth={2} className="pricing-card__spinner" />}
          {actionLabel ?? (price === 'Gratis' ? 'Comenzar gratis' : 'Seleccionar plan')}
        </PrimaryButton>
      </div>
    </div>
  );
}
