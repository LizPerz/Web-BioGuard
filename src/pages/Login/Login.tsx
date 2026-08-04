import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { TextInput, PasswordInput } from '../../components/ui/inputs';
import { Eye, EyeOff } from 'lucide-react';
import { loginWeb, ApiError } from '../../lib/api';
import { saveSession, clearPendingOnboarding } from '../../lib/auth';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [resetSuccess] = useState<boolean>((location.state as { resetSuccess?: boolean } | null)?.resetSuccess ?? false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailAlert, setEmailAlert] = useState('');
  const [passAlert, setPassAlert] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setFormError('');
    try {
      const result = await loginWeb({ Correo: email.trim(), Password: password });
      if (result.requires2FA && result.userId) {
        navigate('/verify-2fa', { state: { correo: email.trim(), userId: result.userId } });
        return;
      }
      if (result.token) {
        clearPendingOnboarding();
        saveSession(
          result.token,
          result.refreshToken,
          {
            id: result.userId ?? '',
            nombre: result.nombre ?? '',
            rol: result.rol ?? '',
            plan: result.plan ?? '',
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

  return (
    <AuthLayout>
      <AuthCard
        title="Iniciar sesión"
        subtitle="Accede a tu consola de monitoreo biométrico"
        maxWidth={440}
        footer={
          <p>¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link></p>
        }
      >
        <form onSubmit={handleLogin}>
          <TextInput
            label="Correo electrónico" type="email" name="email" placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); setEmailAlert('No se permiten espacios'); setTimeout(() => setEmailAlert(''), 2000); } }}
            error={emailAlert}
          />
          <div style={{ height: 16 }} />
          <PasswordInput
            label="Contraseña" name="password" placeholder="••••••••"
            showPassword={showPassword}
            onToggleVisibility={() => setShowPassword(!showPassword)}
            eyeIcon={<Eye size={17} strokeWidth={1.8} />}
            eyeOffIcon={<EyeOff size={17} strokeWidth={1.8} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); setPassAlert('No se permiten espacios'); setTimeout(() => setPassAlert(''), 2000); } }}
            error={passAlert}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, marginBottom: 20 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, fontWeight: 500 }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          {formError && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', color: 'var(--danger, #dc2626)', fontSize: 13 }}>
              {formError}
            </div>
          )}
          {resetSuccess && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(22, 163, 74, 0.12)', border: '1px solid rgba(22, 163, 74, 0.35)', color: 'var(--success, #16a34a)', fontSize: 13 }}>
              Contraseña actualizada correctamente. Inicia sesión.
            </div>
          )}
          <PrimaryButton type="submit" fullWidth disabled={!email || !password || loading}>
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </PrimaryButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
