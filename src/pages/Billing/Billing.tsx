import { useEffect, useState } from 'react';
import { Crown, CreditCard, Shield, ReceiptText, Check, Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, SecondaryButton, GhostButton } from '../../components/ui/buttons';
import { ContentCard } from '../../components/ui/ContentCard';
import { StatusBadge } from '../../components/ui/badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { PricingCard } from '../../components/pricing/PricingCard';
import { Modal } from '../../components/ui/Modal';
import { TextInput } from '../../components/ui/inputs';
import {
  getPlanes,
  getMiPlan,
  simularPago,
  getHistorialPagos,
  ApiError,
  type PlanResponse,
  type PagoResponse,
} from '../../lib/api';
import { getUser, getPendingOnboarding, clearPendingOnboarding, updateSessionPlan } from '../../lib/auth';
import './Billing.css';

interface FeatureItem {
  label: string;
  value: string;
}

const featuresDe = (p: PlanResponse): FeatureItem[] => [
  { label: 'Pacientes incluidos', value: String(p.limitePacientes) },
  { label: 'Cuidadores permitidos', value: String(p.limiteCuidadores) },
  { label: 'Historial de datos', value: `${p.diasHistorial} días` },
  { label: 'GPS Continuo', value: p.gpsContinuo ? 'Incluido' : 'No incluido' },
  { label: 'Consola IA', value: p.aiConsole ? 'Incluida' : 'No incluida' },
];

const precioTexto = (p: PlanResponse) =>
  p.precio <= 0 ? 'Gratis' : `$${p.precio} ${p.precioMoneda}`;

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

const formatearNumero = (v: string) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');

const formatearExpiracion = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
};

const formatearCvc = (v: string) => v.replace(/\D/g, '').slice(0, 4);

export function Billing() {
  const navigate = useNavigate();
  const iconSize = 16;
  const onboarding = getPendingOnboarding();
  const session = getUser();

  const [planes, setPlanes] = useState<PlanResponse[]>([]);
  const [planActual, setPlanActual] = useState<PlanResponse | null>(null);
  const [historial, setHistorial] = useState<PagoResponse[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [pagoOpen, setPagoOpen] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanResponse | null>(null);

  const [cardNumero, setCardNumero] = useState('');
  const [cardExpiracion, setCardExpiracion] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardNombre, setCardNombre] = useState('');
  const [pagoProcesando, setPagoProcesando] = useState(false);
  const [pagoError, setPagoError] = useState('');
  const [pagoExito, setPagoExito] = useState(false);

  const recargarTodo = async () => {
    setError('');
    try {
      const [lista, miPlan, tx] = await Promise.all([
        getPlanes(),
        getMiPlan().catch(() => null),
        getHistorialPagos().catch(() => [] as PagoResponse[]),
      ]);
      setPlanes(lista);
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
    recargarTodo();
  }, []);

  const abrirSelectorDePlanes = () => {
    setPlanSeleccionado(null);
    setPagoError('');
    setPagoExito(false);
    setPagoOpen(true);
  };

  const elegirPlan = (plan: PlanResponse) => {
    setPlanSeleccionado(plan);
    setPagoError('');
    setPagoExito(false);
    setCardNumero('');
    setCardExpiracion('');
    setCardCvc('');
    setCardNombre('');
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
    setPagoProcesando(true);
    setPagoError('');
    try {
      await simularPago({ PlanNombre: planSeleccionado.nombre });
      updateSessionPlan(planSeleccionado.nombre);
      setPagoExito(true);
      setTimeout(() => {
        setPagoOpen(false);
        setPlanSeleccionado(null);
        recargarTodo();
        if (onboarding) {
          clearPendingOnboarding();
          navigate('/dashboard', { state: { crearPaciente: true } });
        }
      }, 1300);
    } catch (err) {
      setPagoError(errMsg(err));
    } finally {
      setPagoProcesando(false);
    }
  };

  if (onboarding) {
    return (
      <DashboardLayout>
        <div className="billing__onboarding">
          <PageHeader
            title="Elige tu nivel de protección"
            subtitle="Facturación mensual · activa tu plan para desbloquear sus funciones"
          />

          {cargando ? (
            <p className="pacientes__loading" style={{ textAlign: 'center' }}>Cargando planes…</p>
          ) : error ? (
            <div className="modal__error" style={{ margin: '0 auto', maxWidth: 420 }} role="alert">
              {error}
            </div>
          ) : (
            <div className="billing__onboarding-cards">
              {planes.map((plan) => (
                <PricingCard
                  key={plan.id}
                  label={plan.precio <= 0 ? 'BÁSICO' : plan.nombre.toUpperCase()}
                  name={plan.nombre}
                  price={precioTexto(plan)}
                  period="/mes"
                  benefits={featuresDe(plan).map((f) => f.label)}
                  recommended={plan.precio > 0}
                  onSelect={() => elegirPlan(plan)}
                />
              ))}
            </div>
          )}
        </div>

        <ModalPago
          open={pagoOpen}
          planes={planes}
          planSeleccionado={planSeleccionado}
          onSelectPlan={elegirPlan}
          onCancelarSeleccion={() => setPlanSeleccionado(null)}
          onClose={() => setPagoOpen(false)}
          cardNombre={cardNombre}
          setCardNombre={setCardNombre}
          cardNumero={cardNumero}
          setCardNumero={setCardNumero}
          cardExpiracion={cardExpiracion}
          setCardExpiracion={setCardExpiracion}
          cardCvc={cardCvc}
          setCardCvc={setCardCvc}
          pagoProcesando={pagoProcesando}
          pagoError={pagoError}
          pagoExito={pagoExito}
          onPagar={procesarPago}
        />
      </DashboardLayout>
    );
  }

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

              <SecondaryButton fullWidth onClick={abrirSelectorDePlanes}>
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
              Simulado
            </div>
          </div>

          <EmptyState
            icon={<CreditCard size={24} strokeWidth={1.6} />}
            title={historial.length > 0 ? 'Pago registrado' : 'Sin métodos de pago'}
            description={
              historial.length > 0
                ? 'Puedes cambiar de plan y simular un nuevo pago cuando quieras'
                : 'Simula tu pago con tarjeta de prueba para activar el plan que elijas'
            }
            action={
              <PrimaryButton onClick={abrirSelectorDePlanes}>
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
            description="Tu historial de pagos aparecerá aquí cuando simules tu primera suscripción"
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

      <ModalPago
        open={pagoOpen}
        planes={planes}
        planSeleccionado={planSeleccionado}
        onSelectPlan={elegirPlan}
        onCancelarSeleccion={() => setPlanSeleccionado(null)}
        onClose={() => setPagoOpen(false)}
        cardNombre={cardNombre}
        setCardNombre={setCardNombre}
        cardNumero={cardNumero}
        setCardNumero={setCardNumero}
        cardExpiracion={cardExpiracion}
        setCardExpiracion={setCardExpiracion}
        cardCvc={cardCvc}
        setCardCvc={setCardCvc}
        pagoProcesando={pagoProcesando}
        pagoError={pagoError}
        pagoExito={pagoExito}
        onPagar={procesarPago}
      />
    </DashboardLayout>
  );
}

interface ModalPagoProps {
  open: boolean;
  planes: PlanResponse[];
  planSeleccionado: PlanResponse | null;
  onSelectPlan: (plan: PlanResponse) => void;
  onCancelarSeleccion: () => void;
  onClose: () => void;
  cardNombre: string;
  setCardNombre: (v: string) => void;
  cardNumero: string;
  setCardNumero: (v: string) => void;
  cardExpiracion: string;
  setCardExpiracion: (v: string) => void;
  cardCvc: string;
  setCardCvc: (v: string) => void;
  pagoProcesando: boolean;
  pagoError: string;
  pagoExito: boolean;
  onPagar: () => void;
}

function ModalPago({
  open,
  planes,
  planSeleccionado,
  onSelectPlan,
  onCancelarSeleccion,
  onClose,
  cardNombre,
  setCardNombre,
  cardNumero,
  setCardNumero,
  cardExpiracion,
  setCardExpiracion,
  cardCvc,
  setCardCvc,
  pagoProcesando,
  pagoError,
  pagoExito,
  onPagar,
}: ModalPagoProps) {
  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={planSeleccionado ? 'Confirmar pago' : 'Elegir plan y pagar'}
      subtitle={
        planSeleccionado
          ? `Plan ${planSeleccionado.nombre} · ${precioTexto(planSeleccionado)}`
          : 'Selecciona el plan que quieres activar (pago simulado)'
      }
    >
      {pagoExito ? (
        <div className="billing__pago-exito">
          <div className="billing__pago-exito-icon">
            <Check size={28} strokeWidth={2.4} />
          </div>
          <p className="billing__pago-exito-title">¡Pago exitoso!</p>
          <p className="billing__pago-exito-sub">Tu plan {planSeleccionado?.nombre} ya está activo.</p>
        </div>
      ) : !planSeleccionado ? (
        <div className="billing__selector">
          {planes.map((plan) => (
            <button key={plan.id} className="billing__selector-item" onClick={() => onSelectPlan(plan)}>
              <div className="billing__selector-name">
                <span className="billing__selector-plan">{plan.nombre}</span>
                <span className="billing__selector-feat">
                  {plan.limitePacientes} paciente{plan.limitePacientes === 1 ? '' : 's'} · {plan.limiteCuidadores} cuidador{plan.limiteCuidadores === 1 ? '' : 'es'} · {plan.diasHistorial} días
                </span>
              </div>
              <span className="billing__selector-price">{precioTexto(plan)}</span>
            </button>
          ))}
          <p className="billing__selector-hint">Este es un pago simulado de prueba, no se realizan cargos reales.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="billing__pago-resumen">
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
          <div className="billing__pago-nota">
            <Lock size={13} strokeWidth={1.8} />
            Modo simulado: ningún cargo real se procesará.
          </div>
          <div className="modal__actions">
            <GhostButton type="button" onClick={onCancelarSeleccion} disabled={pagoProcesando}>
              ← Elegir otro plan
            </GhostButton>
            <PrimaryButton type="button" onClick={onPagar} disabled={pagoProcesando}>
              {pagoProcesando ? <Loader2 size={14} strokeWidth={1.8} className="billing__spin" /> : <CreditCard size={14} strokeWidth={1.8} />}
              {pagoProcesando ? 'Procesando…' : `Pagar ${precioTexto(planSeleccionado)}`}
            </PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
