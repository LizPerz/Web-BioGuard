import { useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Logo } from '../../components/ui/Logo';
import { Button, Card } from '../../components/ui';
import { useAuth } from '../../context';
import { ROUTES } from '../../constants';
import { PlanResponse, BillingPeriod } from '../../types';

export default function CheckoutPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { plan?: PlanResponse; period?: BillingPeriod } | null;
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const plan = state?.plan;
  const period = state?.period || 'mensual';
  const [error, setError] = useState('');

  if (!plan) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}>
        <Card>
          <p style={{ marginBottom: 16 }}>No se ha seleccionado un plan.</p>
          <Link to={ROUTES.LICENCIAMIENTOS}>
            <Button>Ver planes disponibles</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const price = period === 'anual' ? Math.round(plan.precio * 12 * 0.85) : plan.precio;
  const periodLabel = period === 'mensual' ? '/mes' : '/año';

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const { pagoService } = await import('../../services');
      const res = await pagoService.crearSesion({ planNombre: plan.nombre });
      if (res?.checkoutUrl) {
        // Redirigir a la página de Stripe tal cual la devuelve el backend
        window.location.href = res.checkoutUrl;
        return;
      }
      // Gratis o plan activado sin Stripe
      navigate(ROUTES.CONFIGURACION_COMPLETADA, { state: { plan, period } });
    } catch (err: any) {
      setError(err?.message || 'Error al crear la sesión de pago. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-primary)',
        padding: 24,
      }}
    >
      <Card style={{ maxWidth: 480, width: '100%', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ marginBottom: 16 }}>
          <Logo size={48} showText={false} />
        </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            BioGuard
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Pasarela de Pago Segura
          </p>
        </div>

        <div
          style={{
            background: 'var(--color-bg-tertiary)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontWeight: 600, marginBottom: 4 }}>Plan {plan.nombre}</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
            {plan.descripcion}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Suscripción</span>
            <span>{period === 'mensual' ? 'Mensual' : 'Anual'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal</span>
            <span>${price} {plan.precioMoneda}</span>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-cyan)' }}>
              ${price} {plan.precioMoneda}
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{periodLabel}</span>
            </span>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,77,79,0.1)',
            border: '1px solid rgba(255,77,79,0.3)',
            color: '#ff4d4f',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button fullWidth size="lg" loading={loading} onClick={handlePay}>
            {plan.nombre === 'Gratis' ? 'Activar Plan Gratis' : 'Pagar y Activar Plan'}
          </Button>
          <Link to={ROUTES.LICENCIAMIENTOS}>
            <Button variant="ghost" fullWidth>
              Cancelar y volver
            </Button>
          </Link>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 16 }}>
          Pago seguro con cifrado de extremo a extremo
        </p>
      </Card>
    </div>
  );
}
