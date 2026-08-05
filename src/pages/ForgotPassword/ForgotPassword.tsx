import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton, SecondaryButton } from '../../components/ui/buttons';
import { TextInput } from '../../components/ui/inputs';
import { forgotPassword, getResetAbierto, ApiError } from '../../lib/api';
import './ForgotPassword.css';

const STORAGE_KEY = 'bioguard_reset_request';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [esperando, setEsperando] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const reanudarPendiente = useCallback(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { requestId?: string; token?: string; correo?: string };
      if (parsed?.requestId) {
        setRequestId(parsed.requestId);
        setToken(parsed.token ?? null);
        setEsperando(true);
        setSuccessMsg(`Revisa tu correo de ${parsed.correo ?? ''}. Abre el enlace desde tu teléfono para confirmar.`);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    reanudarPendiente();
  }, [reanudarPendiente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setFormError('');
    setSuccessMsg('');
    try {
      const result = await forgotPassword({ Correo: email.trim() });
      if (result.requestId) {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ requestId: result.requestId, token: result.token ?? '', correo: email.trim() }),
        );
        setRequestId(result.requestId);
        setToken(result.token ?? null);
        setEsperando(true);
      }
      setSuccessMsg(result.message);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('Ocurrió un error inesperado. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!esperando || !requestId) return;
    const poll = async () => {
      try {
        const res = await getResetAbierto(requestId);
        if (res.abierto) {
          sessionStorage.removeItem(STORAGE_KEY);
          setEsperando(false);
          navigate(`/reset-password?token=${encodeURIComponent(token ?? '')}&requestId=${requestId}`);
        }
      } catch {
        // Sin conexión: se reintenta en el siguiente tick
      }
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => clearInterval(interval);
  }, [esperando, requestId, token, navigate]);

  return (
    <AuthLayout>
      <AuthCard
        title={esperando ? 'Confirmando el enlace' : 'Recuperar Contraseña'}
        subtitle={
          esperando
            ? 'Detectaremos automáticamente cuando abras el enlace'
            : 'Te enviaremos un enlace para restablecerla'
        }
        maxWidth={440}
        footer={
          <p>
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login">Inicia sesión</Link>
          </p>
        }
      >
        {esperando ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
            <Loader2 size={32} strokeWidth={1.8} className="forgot-spin" />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {successMsg} Mantén esta pestaña abierta. Cuando el enlace se abra desde tu teléfono,
              verás el formulario para restablecer la contraseña aquí.
            </p>
            <div style={{ height: 16 }} />
            <SecondaryButton type="button" onClick={() => setEsperando(false)}>
              Volver
            </SecondaryButton>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextInput
              label="Correo electrónico"
              type="email"
              name="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div style={{ height: 28 }} />
            {successMsg && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(22, 163, 74, 0.12)', border: '1px solid rgba(22, 163, 74, 0.35)', color: 'var(--success, #16a34a)', fontSize: 13 }}>
                {successMsg}
              </div>
            )}
            {formError && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', color: 'var(--danger, #dc2626)', fontSize: 13 }}>
                {formError}
              </div>
            )}
            <PrimaryButton type="submit" fullWidth disabled={!email || loading}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </PrimaryButton>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
