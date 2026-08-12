import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { CodeInput, TextInput } from '../../components/ui/inputs';
import { verificar2FA, enviar2FA, ApiError } from '../../lib/api';
import {
  saveSession,
  setPendingOnboarding,
  setPendingVerifyEmail,
  getPendingVerifyEmail,
  clearPendingVerifyEmail,
} from '../../lib/auth';

function leerCorreoInicial(locationState: unknown, search: string): string {
  const fromState = (locationState as { correo?: string } | null)?.correo ?? '';
  if (fromState) return fromState;
  const fromStorage = getPendingVerifyEmail();
  if (fromStorage) return fromStorage;
  return new URLSearchParams(search).get('correo') ?? '';
}

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [correo, setCorreo] = useState<string>(() => leerCorreoInicial(location.state, location.search));
  const [emailInput, setEmailInput] = useState('');
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [formError, setFormError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const autoSentRef = useRef(false);

  useEffect(() => {
    if (correo) setPendingVerifyEmail(correo);
  }, [correo]);

  const handleChange = (index: number, val: string) => {
    setCode((prev) => prev.map((c, i) => (i === index ? val : c)));
  };

  const enviarCodigo = async (email: string) => {
    setSending(true);
    setResendMsg('');
    setFormError('');
    try {
      await enviar2FA({ Correo: email });
      setResendMsg('Código enviado a tu correo');
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError('No se pudo enviar el código. Intenta de nuevo.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleResend = useCallback(() => {
    if (!correo || sending) return;
    void enviarCodigo(correo);
  }, [correo, sending]);

  useEffect(() => {
    if (!autoSentRef.current && correo) {
      autoSentRef.current = true;
      handleResend();
    }
  }, [correo, handleResend]);

  const handleBuscarCorreo = (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    setPendingVerifyEmail(email);
    setCorreo(email);
    void enviarCodigo(email);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = code.join('');
    if (codigo.length !== 6 || !correo) return;
    setLoading(true);
    setFormError('');
    try {
      const result = await verificar2FA({ Correo: correo, Codigo: codigo });
      if (result.token) {
        clearPendingVerifyEmail();
        saveSession(
          result.token,
          result.refreshToken,
          {
            id: result.userId,
            nombre: result.nombre,
            rol: result.rol,
            plan: result.plan,
          },
        );
        setPendingOnboarding(true);
        navigate('/planes');
      }
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

  return (
    <AuthLayout>
      <AuthCard
        title="Confirmación de Correo"
        subtitle={correo ? `Hemos enviado un código de verificación a ${correo}` : 'Ingresa tu correo para recibir el código de verificación'}
        maxWidth={480}
      >
        {formError && (
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', color: 'var(--danger, #dc2626)', fontSize: 13 }}>
            {formError}
          </div>
        )}
        {correo ? (
          <form onSubmit={handleVerify}>
            <CodeInput value={code} onChange={handleChange} />
            <div style={{ height: 32 }} />
            <PrimaryButton type="submit" fullWidth disabled={code.join('').length !== 6 || loading}>
              {loading ? 'Verificando…' : 'Verificar Código'}
            </PrimaryButton>
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
              {sending && <div style={{ marginBottom: 8, color: 'var(--text-secondary, #64748b)' }}>Enviando código a tu correo…</div>}
              {resendMsg && <div style={{ marginBottom: 8, color: 'var(--success, #16a34a)' }}>{resendMsg}</div>}
              <Link to="#" onClick={(e) => { e.preventDefault(); handleResend(); }} style={{ fontWeight: 500 }}>
                Reenviar código
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBuscarCorreo}>
            <TextInput
              label="Correo electrónico"
              type="email"
              name="email"
              placeholder="tu@correo.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <div style={{ height: 24 }} />
            <PrimaryButton type="submit" fullWidth disabled={!emailInput.trim() || sending}>
              {sending ? 'Enviando…' : 'Enviar código de verificación'}
            </PrimaryButton>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary, #64748b)' }}>
              El código expira en 10 minutos. Revisa tu bandeja de entrada (y la carpeta de spam).
            </div>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
