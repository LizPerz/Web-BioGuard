import { Crown, CreditCard, Shield, ReceiptText } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/ui/buttons';
import { ContentCard } from '../../components/ui/ContentCard';
import { StatusBadge } from '../../components/ui/badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { subscriptionFeatures } from '../../data/mockData';
import './Billing.css';

export function Billing() {
  const iconSize = 16;

  return (
    <DashboardLayout>
      <PageHeader
        title="Centro de Facturación y Suscripción"
        subtitle="Gestiona tu plan, métodos de pago e historial de transacciones"
      />

      <div className="billing__row">
        <ContentCard className="billing__subscription">
          <div className="billing__card-header">
            <div className="billing__card-title-row">
              <Crown size={iconSize} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
              <h3>Suscripción Activa</h3>
            </div>
            <StatusBadge label="Activa" variant="success" />
          </div>

          <div className="billing__plan-name">Plan Gratis</div>
          <div className="billing__plan-price">Gratis</div>
          <p className="billing__plan-desc">Acceso gratuito ilimitado</p>

          <ul className="billing__features">
            {subscriptionFeatures.map((feat, i) => (
              <li key={i} className="billing__feature-item">
                <span>{feat.label}</span>
                <span className={feat.value === 'No incluido' || feat.value === 'No incluida' ? 'billing__feature-no' : ''}>
                  {feat.value}
                </span>
              </li>
            ))}
          </ul>

          <SecondaryButton fullWidth>
            Cambiar plan
          </SecondaryButton>
        </ContentCard>

        <ContentCard className="billing__payment">
          <div className="billing__card-header">
            <div className="billing__card-title-row">
              <CreditCard size={iconSize} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
              <h3>Métodos de Pago</h3>
            </div>
            <div className="billing__ssl-badge">
              <Shield size={11} strokeWidth={2} />
              Cifrado SSL
            </div>
          </div>

          <EmptyState
            icon={<CreditCard size={24} strokeWidth={1.6} />}
            title="Sin métodos de pago"
            description="Los métodos de pago se registran al realizar tu primer pago con Stripe"
            action={
              <PrimaryButton>
                Elegir plan y pagar
              </PrimaryButton>
            }
          />
        </ContentCard>
      </div>

      <ContentCard style={{ marginTop: 0 }}>
        <div className="billing__card-header">
          <div className="billing__card-title-row">
            <ReceiptText size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3>Historial de Transacciones</h3>
          </div>
          <span className="billing__tx-count">0 transacciones</span>
        </div>

        <EmptyState
          icon={<ReceiptText size={24} strokeWidth={1.6} />}
          title="Aún no hay transacciones"
          description="Tu historial de pagos aparecerá aquí cuando realices tu primera suscripción"
        />
      </ContentCard>
    </DashboardLayout>
  );
}
