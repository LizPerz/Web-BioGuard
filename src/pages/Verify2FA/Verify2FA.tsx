import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { CodeInput } from '../../components/ui/inputs';
import { verificar2FA, enviar2FA, ApiError } from '../../lib/api';
import { saveSession } from '../../lib/auth';

export function Verify2FA() {
  const navigate = useNavigate();
  const location = useLocation();
  const correo = (location.state as { correo?: string } | null)?.correo ?? '';
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [formError, setFormError] = useState('');
  const [resendMsg, setResendMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const codigo = code.join('');
    if (codigo.length !== 6 || !correo) return;
    setLoading(true);
    setFormError('');
    try {
      const result = await verificar2FA({ Correo: correo, Codigo: codigo });
      if (result.token) {
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
        navigate('/dashboard');
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

  const handleResend = async () => {
    if (!correo) return;
    setResendMsg('');
    try {
      await enviar2FA({ Correo: correo });
      setResendMsg('Código reenviado a tu correo');
    } catch (err) {
      if (err instanceof ApiError) {
        setResendMsg(err.message);
      }
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Verificación de Seguridad"
        subtitle={correo ? `Hemos enviado un código 2FA a ${correo}` : 'Ingresa el código 2FA enviado a tu correo'}
        maxWidth={480}
        footer={
          <p>
            ¿Cambiar de cuenta?{' '}
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        }
      >
        <form onSubmit={handleVerify}>
          <CodeInput value={code} onChange={(index, val) => setCode((prev) => prev.map((c, i) => (i === index ? val : c)))} />
          <div style={{ height: 32 }} />
          {formError && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', color: 'var(--danger, #dc2626)', fontSize: 13 }}>
              {formError}
            </div>
          )}
          <PrimaryButton type="submit" fullWidth disabled={code.join('').length !== 6 || !correo || loading}>
            {loading ? 'Verificando…' : 'Verificar Código'}
          </PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
            {resendMsg && <div style={{ marginBottom: 8, color: 'var(--success, #16a34a)' }}>{resendMsg}</div>}
            <Link to="#" onClick={(e) => { e.preventDefault(); handleResend(); }} style={{ fontWeight: 500 }}>
              Reenviar código
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
