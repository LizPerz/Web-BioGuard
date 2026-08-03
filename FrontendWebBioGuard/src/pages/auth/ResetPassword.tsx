import { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button, Input, PasswordRequirements } from '../../components/ui';
import { AuthLayout } from '../../components/layout';
import { authService } from '../../services';
import { ROUTES } from '../../constants';
import styles from './Auth.module.css';

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{}|;':",.\/<>?]/;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (v: string): string => {
    if (!v) return 'La contraseña es obligatoria';
    if (v.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(v)) return 'Debe tener al menos una mayúscula';
    if (!/[a-z]/.test(v)) return 'Debe tener al menos una minúscula';
    if (!/[0-9]/.test(v)) return 'Debe tener al menos un número';
    if (!SPECIAL_CHARS.test(v)) return 'Debe tener al menos un carácter especial (!@#$%)';
    return '';
  };

  const passwordError = touched || submitted ? validatePassword(nuevaPassword) : '';
  const confirmError = touched || submitted
    ? (!confirmPassword ? 'Confirma tu contraseña' : confirmPassword !== nuevaPassword ? 'Las contraseñas no coinciden' : '')
    : '';

  if (!token) {
    return (
      <AuthLayout title="Enlace Inválido" subtitle="El enlace no contiene un token válido">
        <div className={styles.errorBox}>Este enlace es inválido. Solicita uno nuevo en "¿Olvidaste tu contraseña?".</div>
        <div className={styles.registerLink}>
          <Link to={ROUTES.OLVIDE_CONTRASENA}>Solicitar nuevo enlace</Link>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (validatePassword(nuevaPassword) || (!confirmPassword || confirmPassword !== nuevaPassword)) return;
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({ token, nuevaPassword });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'No se pudo restablecer la contraseña. El enlace pudo expirar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Restablecer Contraseña" subtitle="Define una nueva contraseña segura">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.errorBox}>{error}</div>}
        {success && (
          <div className={styles.successBox}>
            Contraseña actualizada correctamente. <Link to={ROUTES.LOGIN} style={{ color: 'var(--color-cyan)' }}>Inicia sesión</Link>
          </div>
        )}

        <Input label="Nueva contraseña" type="password" placeholder="Crea una contraseña segura" icon={<Lock size={18} />}
          value={nuevaPassword} onChange={(e) => { setNuevaPassword(e.target.value); setTouched(true); }}
          maxLength={128} error={passwordError}
          success={touched && !passwordError} autoComplete="new-password" />

        <PasswordRequirements password={nuevaPassword} />

        <Input label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña" icon={<Lock size={18} />}
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmError} success={touched && confirmPassword === nuevaPassword}
          autoComplete="new-password" />

        <div className={styles.actions}>
          <Button type="submit" fullWidth size="lg" loading={loading} disabled={success}>
            Restablecer contraseña
          </Button>
        </div>

        <div className={styles.registerLink}>
          ¿Ya tienes cuenta? <Link to={ROUTES.LOGIN}>Inicia sesión</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
