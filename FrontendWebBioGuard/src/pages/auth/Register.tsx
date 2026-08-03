import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import { Button, Input, LoadingSpinner } from '../../components/ui';
import { AuthLayout } from '../../components/layout';
import { useAuth } from '../../context';
import { ROUTES } from '../../constants';
import { RegisterWebRequest } from '../../types';
import styles from './Auth.module.css';

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const [form, setForm] = useState<RegisterWebRequest>({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', password: '', planNombre: 'Gratis',
  });
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated) {
    window.location.replace(ROUTES.DASHBOARD);
    return null;
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!nombreCompleto.trim()) e.nombreCompleto = 'El nombre es obligatorio';
    else if (nombreCompleto.trim().split(' ').length < 2) e.nombreCompleto = 'Ingresa nombre y apellido';
    if (!form.correo) e.correo = 'El correo es obligatorio';
    else if (!/\S+@\S+\.\S+/.test(form.correo)) e.correo = 'Correo inválido';
    if (!form.password) e.password = 'La contraseña es obligatoria';
    else if (form.password.length < 8) e.password = 'Mínimo 8 caracteres';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Debe tener al menos una mayúscula';
    else if (!/[a-z]/.test(form.password)) e.password = 'Debe tener al menos una minúscula';
    else if (!/[0-9]/.test(form.password)) e.password = 'Debe tener al menos un número';
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) e.password = 'Debe tener un carácter especial (!@#$%)';
    if (form.password !== confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const partes = nombreCompleto.trim().split(' ');
      const data = {
        ...form,
        nombre: partes[0],
        apellidoPaterno: partes.slice(1).join(' '),
        apellidoMaterno: '',
      };
      const res: any = await register(data);
      if (res.requiresVerification || res.token === 'pending_verification') {
        window.location.replace(`${ROUTES.CONFIRMAR_CORREO}?correo=${encodeURIComponent(data.correo)}`);
      } else {
        window.location.replace(ROUTES.DASHBOARD);
      }
    } catch (err: any) {
      setErrors({});
      setApiError(err.message || 'Error al registrarte. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Crear Cuenta" subtitle="Únete a la plataforma de bioseguridad más avanzada">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {apiError && <div className={styles.errorBox}>{apiError}</div>}

        <Input label="Nombre completo" placeholder="Nombre y apellidos" icon={<User size={18} />}
          value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)}
          error={errors.nombreCompleto} autoComplete="name" />

        <Input label="Correo electrónico" type="email" placeholder="tu@correo.com" icon={<Mail size={18} />}
          value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })}
          error={errors.correo} autoComplete="email" />

        <Input label="Contraseña" type="password" placeholder="Mayúscula, número y símbolo" icon={<Lock size={18} />}
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password} autoComplete="new-password" />

        <Input label="Confirmar Contraseña" type="password" placeholder="Repite tu contraseña" icon={<Lock size={18} />}
          value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword} autoComplete="new-password" />

        <div className={styles.actions}>
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Registrarse
          </Button>
        </div>

        <div className={styles.registerLink}>
          ¿Ya tienes cuenta? <Link to={ROUTES.LOGIN}>Inicia sesión</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
