import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CreditCard, Loader2, Lock } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/ui/buttons';
import { PricingCard } from '../../components/pricing/PricingCard';
import { Modal } from '../../components/ui/Modal';
import { TextInput } from '../../components/ui/inputs';
import { getPlanes, simularPago, ApiError, type PlanResponse } from '../../lib/api';
import { getPendingOnboarding, clearPendingOnboarding, updateSessionPlan } from '../../lib/auth';
import { beneficiosCompletos, precioTexto } from '../../lib/plans';
import './SelectPlan.css';

function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  return err instanceof ApiError ? err.message : fallback;
}

const formatearNumero = (v: string) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

const formatearExpiracion = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

const formatearCvc = (v: string) => v.replace(/\D/g, '').slice(0, 4);

export function SelectPlan() {
  const navigate = useNavigate();
  const onboarding = getPendingOnboarding();

  const [planes, setPlanes] = useState<PlanResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [pagoOpen, setPagoOpen] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanResponse | null>(null);
  const [cardNombre, setCardNombre] = useState('');
  const [cardNumero, setCardNumero] = useState('');
  const [cardExpiracion, setCardExpiracion] = useState('');
  const [cardCvc, setCardCvc] = useState('');
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
    setCardNombre('');
    setCardNumero('');
    setCardExpiracion('');
    setCardCvc('');
    setPagoError('');
    setPagoExito(false);
    setPagoOpen(true);
  };

  const procesarPago = async () => {
    if (!planSeleccionado) return;
    const digitos = cardNumero.replace(/\D/g, '');
    const [mm] = cardExpiracion.split('/');
    const mes = Number(mm);
    if (digitos.length < 12) {
      setPagoError('El número de tarjeta debe tener al menos 12 dígitos');
      return;
    }
    if (cardExpiracion.length !== 5 || mes < 1 || mes > 12) {
      setPagoError('La fecha de expiración no es válida (MM/AA)');
      return;
    }
    if (cardCvc.length < 3) {
      setPagoError('El código de seguridad (CVC) debe tener 3 o 4 dígitos');
      return;
    }
    if (!cardNombre.trim()) {
      setPagoError('El nombre del titular es obligatorio');
      return;
    }
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
            <TextInput
              label="Nombre del titular"
              name="cardNombre"
              placeholder="Como aparece en la tarjeta"
              value={cardNombre}
              onChange={(e) => setCardNombre(e.target.value)}
            />
            <TextInput
              label="Número de tarjeta"
              name="cardNumero"
              placeholder="4242 4242 4242 4242"
              inputMode="numeric"
              value={cardNumero}
              onChange={(e) => setCardNumero(formatearNumero(e.target.value))}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <TextInput
                label="Expiración"
                name="cardExpiracion"
                placeholder="MM/AA"
                inputMode="numeric"
                value={cardExpiracion}
                onChange={(e) => setCardExpiracion(formatearExpiracion(e.target.value))}
              />
              <TextInput
                label="CVC"
                name="cardCvc"
                placeholder="123"
                inputMode="numeric"
                value={cardCvc}
                onChange={(e) => setCardCvc(formatearCvc(e.target.value))}
              />
            </div>
            {pagoError && (
              <div className="modal__error" role="alert">
                {pagoError}
              </div>
            )}
            <div className="select-plan__pago-nota">
              <Lock size={13} strokeWidth={1.8} />
              Simulación de pago: al confirmar, el plan se activa y desbloquea sus funciones.
            </div>
            <div className="modal__actions">
              <GhostButton type="button" onClick={() => setPagoOpen(false)} disabled={procesando}>
                ← Elegir otro plan
              </GhostButton>
              <PrimaryButton type="button" onClick={procesarPago} disabled={procesando}>
                {procesando ? <Loader2 size={14} strokeWidth={1.8} className="select-plan__spin" /> : <CreditCard size={14} strokeWidth={1.8} />}
                {procesando ? 'Procesando…' : `Pagar ${precioTexto(planSeleccionado)}`}
              </PrimaryButton>
            </div>
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}
