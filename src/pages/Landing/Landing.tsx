import { useNavigate } from 'react-router-dom';
import { PublicHeader } from '../../components/layout/PublicHeader';
import { PricingCard } from '../../components/pricing/PricingCard';
import { plans } from '../../data/mockData';
import './Landing.css';

export function Landing() {
  const navigate = useNavigate();

  const handleSelectPlan = (planName: string) => {
    navigate('/register', { state: { plan: planName } });
  };

  return (
    <div className="landing">
      <PublicHeader />

      <section className="landing__hero">
        <div className="landing__hero-logo">
          <img src="/bioguard.png" alt="BioGuard" />
        </div>
        <h1 className="landing__hero-title">
          Bienvenido a la Élite de la Bioseguridad
        </h1>
        <p className="landing__hero-desc">
          Plataforma integral de monitoreo biométrico con inteligencia artificial, 
          diseñada para proteger lo más valioso con tecnología de grado militar.
        </p>
      </section>

      <section className="landing__pricing" id="pricing">
        <h2 className="landing__pricing-title">Elige tu nivel de protección</h2>
        <p className="landing__pricing-period">Facturación mensual</p>

        <div className="landing__cards">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              label={plan.label}
              name={plan.name}
              price={plan.monthlyPrice}
              period="/mes"
              benefits={plan.benefits}
              recommended={plan.recommended}
              onSelect={() => handleSelectPlan(plan.name)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
