import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, Lock } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/ui/buttons';
import { PricingCard } from '../../components/pricing/PricingCard';
import { Modal } from '../../components/ui/Modal';
import { getPlanes, simularPago, ApiError, type PlanResponse } from '../../lib/api';
import { getPendingOnboarding, clearPendingOnboarding, updateSessionPlan } from '../../lib/auth';
import { beneficiosCompletos, precioTexto } from '../../lib/plans';
import './SelectPlan.css';

function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  return err instanceof ApiError ? err.message : fallback;
}

export function SelectPlan() {
  const navigate = useNavigate();
  const onboarding = getPendingOnboarding();

  const [planes, setPlanes] = useState<PlanResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [pagoOpen, setPagoOpen] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanResponse | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [pagoError, setPagoError] = useState('');
  const [pagoExito, setPagoExito] = useState(false);
  const [gratisId, setGratisId] = useState<string | null>(null);

  const cargarPlanes = async () => {
    setError('');
    try {
      const lista = await getPlanes();
      setPlanes(lista);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPlanes();
  }, []);

  const terminarActivacion = () => {
    clearPendingOnboarding();
    navigate('/dashboard', { state: onboarding ? { crearPaciente: true } : undefined });
  };

  const activarPlan = async (plan: PlanResponse) => {
    setPagoError('');
    try {
      await simularPago({ PlanNombre: plan.nombre });
      updateSessionPlan(plan.nombre);
      terminarActivacion();
    } catch (err) {
      setPagoError(errMsg(err));
    }
  };

  const comenzarGratis = async () => {
    const gratis = planes.find((p) => p.precio <= 0);
    if (!gratis) return;
    setGratisId(gratis.id);
    await activarPlan(gratis);
    setGratisId(null);
  };

  const seleccionarPlan = (plan: PlanResponse) => {
    setPlanSeleccionado(plan);
    setPagoError('');
    setPagoExito(false);
    setPagoOpen(true);
  };

  const procesarPago = async () => {
    if (!planSeleccionado) return;
    setProcesando(true);
    setPagoError('');
    try {
      await simularPago({ PlanNombre: planSeleccionado.nombre });
      updateSessionPlan(planSeleccionado.nombre);
      setPagoExito(true);
      setTimeout(() => {
        setPagoOpen(false);
        setPlanSeleccionado(null);
        terminarActivacion();
      }, 1300);
    } catch (err) {
      setPagoError(errMsg(err));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="select-plan">
        <PageHeader
          title="Elige tu nivel de protección"
          subtitle={
            onboarding
              ? 'Facturación mensual · activa tu plan para desbloquear sus funciones'
              : 'Selecciona el plan que quieres activar en tu suscripción'
          }
        />

        {cargando ? (
          <p className="pacientes__loading" style={{ textAlign: 'center' }}>Cargando planes…</p>
        ) : error ? (
          <div className="modal__error" style={{ margin: '0 auto', maxWidth: 420 }} role="alert">
            {error}
          </div>
        ) : (
          <>
            <div className="select-plan__grid">
              {planes.map((plan) => {
                const gratis = plan.precio <= 0;
                return (
                  <PricingCard
                    key={plan.id}
                    label={gratis ? 'BÁSICO' : plan.nombre.toUpperCase()}
                    name={plan.nombre}
                    price={precioTexto(plan)}
                    period="/mes"
                    benefits={beneficiosCompletos(plan)}
                    recommended={!gratis}
                    actionLabel={gratis ? 'Comenzar Gratis' : undefined}
                    loading={gratis && gratisId === plan.id}
                    onSelect={gratis ? comenzarGratis : () => seleccionarPlan(plan)}
                  />
                );
              })}
            </div>
          </>
        )}
        {pagoError && !pagoOpen && (
          <div className="modal__error" role="alert" style={{ margin: '16px auto', maxWidth: 420 }}>
            {pagoError}
          </div>
        )}
      </div>

      <Modal
        open={pagoOpen}
        onClose={() => setPagoOpen(false)}
        title="Confirmar pago"
        subtitle={planSeleccionado ? `Plan ${planSeleccionado.nombre} · ${precioTexto(planSeleccionado)}` : 'Procesa el pago de tu plan'}
      >
        {pagoExito ? (
          <div className="select-plan__pago-exito">
            <div className="select-plan__pago-exito-icon">
              <Check size={28} strokeWidth={2.4} />
            </div>
            <p className="select-plan__pago-exito-title">¡Pago exitoso!</p>
            <p className="select-plan__pago-exito-sub">
              Tu plan {planSeleccionado?.nombre} ya está activo y sus funciones fueron desbloqueadas.
            </p>
          </div>
        ) : planSeleccionado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="select-plan__pago-resumen">
              <span>Plan {planSeleccionado.nombre}</span>
              <span>{precioTexto(planSeleccionado)}</span>
            </div>
            {pagoError && (
              <div className="modal__error" role="alert">
                {pagoError}
              </div>
            )}
            <div className="select-plan__pago-nota">
              <Lock size={13} strokeWidth={1.8} />
              Pago simulado: no se solicitan datos de tarjeta. Al confirmar, el
              plan se activa y desbloquea sus funciones.
            </div>
            <div className="modal__actions">
              <GhostButton type="button" onClick={() => setPagoOpen(false)} disabled={procesando}>
                ← Elegir otro plan
              </GhostButton>
              <PrimaryButton type="button" onClick={procesarPago} disabled={procesando}>
                {procesando ? <Loader2 size={14} strokeWidth={1.8} className="select-plan__spin" /> : <Check size={14} strokeWidth={1.8} />}
                {procesando ? 'Procesando…' : `Activar plan ${precioTexto(planSeleccionado)}`}
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}
