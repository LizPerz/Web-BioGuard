import { useState, FormEvent, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { AuthLayout } from '../../components/layout';
import { useAuth } from '../../context';
import { authService } from '../../services';
import { ROUTES } from '../../constants';
import { LoginWebRequest } from '../../types';
import styles from './Auth.module.css';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const [form, setForm] = useState<LoginWebRequest>({ correo: '', password: '' });
  const [errors, setErrors] = useState<Partial<LoginWebRequest>>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeLogging, setCodeLogging] = useState(!!code);

  useEffect(() => {
    if (!code || isAuthenticated) return;
    (async () => {
      try {
        const res = await authService.loginCodigo(code);
        localStorage.setItem('bioguard_token', res.token);
        localStorage.setItem('bioguard_user', JSON.stringify(res));
        window.location.replace(ROUTES.DASHBOARD);
      } catch {
        setCodeLogging(false);
        setApiError('Código QR inválido o expirado');
      }
    })();
  }, [code, isAuthenticated]);

  if (isLoading || codeLogging) return <LoadingSpinner />;
  if (isAuthenticated) {
    window.location.replace(ROUTES.DASHBOARD);
    return null;
  }

  const validate = () => {
    const e: Partial<LoginWebRequest> = {};
    if (!form.correo) e.correo = 'El correo es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(form.correo)) e.correo = 'Correo inválido';
    if (!form.password) e.password = 'La contraseña es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    setUnverified(false);
    try {
      await login(form);
      window.location.replace(ROUTES.DASHBOARD);
    } catch (err: any) {
      const message = err?.message || 'Credenciales incorrectas';
      setApiError(message);
      setUnverified(/verificad/i.test(message));
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (sendingCode || !form.correo) return;
    setSendingCode(true);
    try {
      await authService.enviar2FA({ correo: form.correo });
      window.location.replace(`${ROUTES.CONFIRMAR_CORREO}?correo=${encodeURIComponent(form.correo)}`);
    } catch {
      setApiError('Error al reenviar el código. Inténtalo de nuevo.');
      setSendingCode(false);
    }
  };

  return (
    <AuthLayout title="Bienvenido" subtitle="Ingresa tus credenciales para acceder al panel">
      <form className={styles.form} onSubmit={handleSubmit} noValidate autoComplete="off">
        {apiError && <div className={styles.errorBox}>{apiError}</div>}

        {unverified && (
          <button type="button" onClick={handleResendCode} disabled={sendingCode}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-cyan)', cursor: sendingCode ? 'default' : 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', textAlign: 'center', display: 'block', margin: '0 auto 12px' }}>
            {sendingCode ? 'Enviando código...' : '¿No recibiste el código? Reenviar y verificar mi correo'}
          </button>
        )}

        <Input
          label="Correo electrónico" type="email" placeholder="tu@correo.com"
          icon={<Mail size={18} />} value={form.correo}
          onChange={(e) => setForm({ ...form, correo: e.target.value })}
          error={errors.correo} autoComplete="username" name="email-field"
        />

        <Input
          label="Contraseña" type="password" placeholder="........"
          icon={<Lock size={18} />} value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password} autoComplete="new-password" name="pass-field"
        />

        <div className={styles.actions}>
          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Iniciar Sesión
          </Button>
        </div>

        <div className={styles.registerLink}>
          ¿No tienes cuenta? <Link to={ROUTES.REGISTRO}>Regístrate aquí</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
