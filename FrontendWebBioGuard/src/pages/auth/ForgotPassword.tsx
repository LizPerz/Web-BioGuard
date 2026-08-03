import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { AuthLayout } from '../../components/layout';
import { authService } from '../../services';
import { ROUTES } from '../../constants';
import styles from './Auth.module.css';

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = correo.trim();
    if (!v) { setError('Ingresa tu correo electrónico'); return; }
    if (!/^\S+@\S+\.\S+$/.test(v)) { setError('Correo inválido'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await authService.forgotPassword({ correo: v });
      setSuccess('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y spam.');
      setCorreo('');
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el enlace. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Recuperar Contraseña" subtitle="Te enviaremos un enlace para restablecerla">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error && <div className={styles.errorBox}>{error}</div>}
        {success && <div className={styles.successBox}>{success}</div>}

        <Input label="Correo electrónico" type="email" placeholder="tu@correo.com" icon={<Mail size={18} />}
          value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={254}
          autoComplete="email" />

        <div className={styles.actions}>
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Enviar enlace
          </Button>
        </div>

        <div className={styles.registerLink}>
          ¿Recordaste tu contraseña? <Link to={ROUTES.LOGIN}>Inicia sesión</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
