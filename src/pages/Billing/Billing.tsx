import { useEffect, useState } from 'react';
import { Crown, CreditCard, Shield, ReceiptText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/ui/buttons';
import { ContentCard } from '../../components/ui/ContentCard';
import { StatusBadge } from '../../components/ui/badges';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  getMiPlan,
  getHistorialPagos,
  ApiError,
  type PlanResponse,
  type PagoResponse,
} from '../../lib/api';
import { getUser, getPendingOnboarding, updateSessionPlan } from '../../lib/auth';
import { featuresDe, precioTexto } from '../../lib/plans';
import './Billing.css';

const formatoFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  return err instanceof ApiError ? err.message : fallback;
}

export function Billing() {
  const navigate = useNavigate();
  const iconSize = 16;
  const onboarding = getPendingOnboarding();
  const session = getUser();

  const [planActual, setPlanActual] = useState<PlanResponse | null>(null);
  const [historial, setHistorial] = useState<PagoResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargarTodo = async () => {
    setError('');
    try {
      const [miPlan, tx] = await Promise.all([
        getMiPlan().catch(() => null),
        getHistorialPagos().catch(() => [] as PagoResponse[]),
      ]);
      setPlanActual(miPlan);
      setHistorial(tx);
      if (miPlan) updateSessionPlan(miPlan.nombre);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (onboarding) {
      navigate('/planes', { replace: true });
      return;
    }
    recargarTodo();
  }, [onboarding, navigate]);

  const irAPlanes = () => navigate('/planes');

  const planParaMostrar = planActual;
  const planNombre = planParaMostrar?.nombre ?? session?.plan ?? 'Gratis';
  const features = planParaMostrar ? featuresDe(planParaMostrar) : [];

  return (
    <DashboardLayout>
      <PageHeader
        title="Centro de Facturación y Suscripción"
        subtitle="Gestiona tu plan, métodos de pago e historial de transacciones"
        onBack={() => navigate('/dashboard')}
      />

      {error && (
        <div className="modal__error" style={{ marginBottom: 20 }} role="alert">
          {error}
        </div>
      )}

      <div className="billing__row">
        <ContentCard className="billing__subscription">
          <div className="billing__card-header">
            <div className="billing__card-title-row">
              <Crown size={iconSize} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
              <h3>Suscripción Activa</h3>
            </div>
            <StatusBadge label="Activa" variant="success" />
          </div>

          {cargando ? (
            <p className="pacientes__loading">Cargando plan…</p>
          ) : (
            <>
              <div className="billing__plan-name">Plan {planNombre}</div>
              <div className="billing__plan-price">
                {planParaMostrar ? precioTexto(planParaMostrar) : session?.plan === 'Gratis' || !session?.plan ? 'Gratis' : '—'}
              </div>
              <p className="billing__plan-desc">{planParaMostrar?.descripcion ?? 'Administra tu suscripción y funciones disponibles'}</p>

              <ul className="billing__features">
                {features.map((feat, i) => (
                  <li key={i} className="billing__feature-item">
                    <span>{feat.label}</span>
                    <span className={feat.value.startsWith('No') ? 'billing__feature-no' : ''}>
                      {feat.value}
                    </span>
                  </li>
                ))}
              </ul>

              <SecondaryButton fullWidth onClick={irAPlanes}>
                Cambiar plan
              </SecondaryButton>
            </>
          )}
        </ContentCard>

        <ContentCard className="billing__payment">
          <div className="billing__card-header">
            <div className="billing__card-title-row">
              <CreditCard size={iconSize} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
              <h3>Métodos de Pago</h3>
            </div>
            <div className="billing__ssl-badge">
              <Shield size={11} strokeWidth={2} />
              Seguro
            </div>
          </div>

          <EmptyState
            icon={<CreditCard size={24} strokeWidth={1.6} />}
            title={historial.length > 0 ? 'Pago registrado' : 'Sin métodos de pago'}
            description={
              historial.length > 0
                ? 'Puedes cambiar de plan y realizar un nuevo pago cuando quieras'
                : 'Ingresa los datos de tu tarjeta para activar el plan que elijas'
            }
            action={
              <PrimaryButton onClick={irAPlanes}>
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
          <span className="billing__tx-count">{historial.length} transacción{historial.length === 1 ? '' : 'es'}</span>
        </div>

        {cargando ? (
          <p className="pacientes__loading">Cargando historial…</p>
        ) : historial.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={24} strokeWidth={1.6} />}
            title="Aún no hay transacciones"
            description="Tu historial de pagos aparecerá aquí cuando realices tu primera suscripción"
          />
        ) : (
          <ul className="billing__tx-list">
            {historial.map((tx) => (
              <li key={tx.id} className="billing__tx-item">
                <div className="billing__tx-info">
                  <span className="billing__tx-monto">
                    {tx.monto > 0 ? `$${tx.monto} ${tx.moneda}` : 'Gratis'}
                  </span>
                  <span className="billing__tx-fecha">{formatoFecha(tx.fechaPago)}</span>
                  <span className="billing__tx-metodo">Pago {tx.metodoPago}</span>
                </div>
                <StatusBadge
                  label={tx.estado === 'completado' ? 'Pagado' : tx.estado}
                  variant={tx.estado === 'completado' ? 'success' : 'neutral'}
                />
              </li>
            ))}
          </ul>
        )}
      </ContentCard>
    </DashboardLayout>
  );
}
