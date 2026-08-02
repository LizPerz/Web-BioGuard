import { useState, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Check, Crown, User, Shield, ArrowRight } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui';
import { usuarioService } from '../../services';
import { useAuth } from '../../context';
import { ROUTES } from '../../constants';
import { PlanResponse, UsuarioPerfilResponse } from '../../types';

export default function SetupCompletePage() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const state = location.state as any;
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfilResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      usuarioService.miPlan().catch(() => null),
      usuarioService.miPerfil().catch(() => null),
    ]).then(([p, pf]) => {
      setPlan(p);
      setPerfil(pf);
    }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (loading) return <LoadingSpinner />;

  const planName = state?.plan?.nombre || plan?.nombre || user?.plan || 'Gratis';
  const planPrice = state?.plan?.precio || plan?.precio || 0;
  const planMoneda = plan?.precioMoneda || 'MXN';
  const planPacientes = plan?.limitePacientes || 1;
  const planCuidadores = plan?.limiteCuidadores || 0;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#07111D', padding: 24,
    }}>
      <div style={{
        maxWidth: 480, width: '100%', background: '#111C2E',
        border: '1px solid rgba(45,156,255,0.1)', borderRadius: 20, padding: 40,
        textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%',
          background: 'rgba(0,230,118,0.1)', border: '2px solid rgba(0,230,118,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Check size={36} style={{ color: '#00e676' }} />
        </div>

        <span style={{
          fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: '#00e676', display: 'block', marginBottom: 8,
        }}>
          Sistema activado
        </span>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#F5F7FA', marginBottom: 4 }}>
          Configuración{' '}
          <span style={{ color: '#2D9CFF' }}>Completada</span>
        </h1>

        <p style={{ color: '#8E9CB8', fontSize: '0.88rem', marginBottom: 24, lineHeight: 1.5, maxWidth: 360, margin: '0 auto 24px' }}>
          Tu cuenta ha sido activada exitosamente con el plan{' '}
          <strong style={{ color: '#2D9CFF' }}>{planName}</strong>.
        </p>

        <div style={{
          background: 'rgba(45,156,255,0.04)', borderRadius: 14, padding: 20,
          marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8E9CB8', fontSize: '0.85rem' }}>
              <Crown size={15} style={{ color: '#ffd740' }} /> Plan
            </span>
            <span style={{ fontWeight: 600, color: '#F5F7FA', fontSize: '0.9rem' }}>
              {planName}
              {planPrice > 0 && <span style={{ color: '#8E9CB8', fontSize: '0.8rem', marginLeft: 4 }}>· ${planPrice} {planMoneda}/mes</span>}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8E9CB8', fontSize: '0.85rem' }}>
              <User size={15} /> Usuario
            </span>
            <span style={{ fontWeight: 500, color: '#F5F7FA', fontSize: '0.9rem' }}>
              {perfil?.nombre || user?.nombre || 'Usuario'} {perfil?.apellidoPaterno || ''}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8E9CB8', fontSize: '0.85rem' }}>
              <Shield size={15} /> Límites
            </span>
            <span style={{ fontWeight: 500, color: '#F5F7FA', fontSize: '0.9rem' }}>
              {planPacientes} paciente{planPacientes !== 1 ? 's' : ''} · {planCuidadores} cuidadores
            </span>
          </div>
        </div>

        <Link to={ROUTES.DASHBOARD} style={{ textDecoration: 'none' }}>
          <button style={{
            width: '100%', padding: '14px 24px',
            background: 'linear-gradient(135deg, #2D9CFF, #8FD7FF)',
            border: 'none', borderRadius: 12, color: '#07111D',
            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.95rem',
            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
          }}>
            Ir al Dashboard <ArrowRight size={18} />
          </button>
        </Link>

        <p style={{ fontSize: '0.8rem', color: '#5a6d8a', marginTop: 16 }}>
          Puedes cambiar tu plan en <Link to={ROUTES.FACTURACION} style={{ color: '#2D9CFF' }}>Facturación</Link>
        </p>
      </div>
    </div>
  );
}
