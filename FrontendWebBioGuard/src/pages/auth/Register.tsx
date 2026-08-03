import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import { Button, Input, LoadingSpinner, PasswordRequirements } from '../../components/ui';
import { AuthLayout } from '../../components/layout';
import { useAuth } from '../../context';
import { ROUTES } from '../../constants';
import { RegisterWebRequest } from '../../types';
import styles from './Auth.module.css';

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{}|;':",.\/<>?]/;
const NAME_REGEX = /^[\p{L}]+(?:\s+[\p{L}]+)*$/u;

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth();
  const [form, setForm] = useState<RegisterWebRequest>({
    nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    correo: '', password: '', planNombre: 'Gratis',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated) {
    window.location.replace(ROUTES.DASHBOARD);
    return null;
  }

  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');

  const validatePassword = (v: string): string => {
    if (!v) return 'La contraseña es obligatoria';
    if (v.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(v)) return 'Debe tener al menos una mayúscula';
    if (!/[a-z]/.test(v)) return 'Debe tener al menos una minúscula';
    if (!/[0-9]/.test(v)) return 'Debe tener al menos un número';
    if (!SPECIAL_CHARS.test(v)) return 'Debe tener al menos un carácter especial (!@#$%)';
    return '';
  };

  const getFieldError = (field: string): string => {
    const show = touched[field] || submitted;
    if (!show) return '';
    switch (field) {
      case 'nombre': {
        const v = normalize(form.nombre);
        if (!v) return 'El nombre es obligatorio';
        if (!NAME_REGEX.test(v)) return 'El nombre solo puede contener letras y espacios';
        return '';
      }
      case 'apellidoPaterno': {
        const v = normalize(form.apellidoPaterno);
        if (!v) return 'El apellido es obligatorio';
        if (!NAME_REGEX.test(v)) return 'El apellido solo puede contener letras y espacios';
        return '';
      }
      case 'correo': {
        const v = form.correo.trim();
        if (!v) return 'El correo es obligatorio';
        if (!/^\S+@\S+\.\S+$/.test(v)) return 'Correo inválido';
        return '';
      }
      case 'password':
        return validatePassword(form.password);
      case 'confirmPassword':
        if (!confirmPassword) return 'Confirma tu contraseña';
        if (confirmPassword !== form.password) return 'Las contraseñas no coinciden';
        return '';
      default:
        return '';
    }
  };

  const handleChange = (field: string, value: string) => {
    if (field === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setForm((f) => ({ ...f, [field]: value }));
    }
    setTouched((t) => ({ ...t, [field]: true }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const hasErrors = ['nombre', 'apellidoPaterno', 'correo', 'password', 'confirmPassword'].some(
      (f) => getFieldError(f) !== '',
    );
    if (hasErrors) return;
    setLoading(true);
    setApiError('');
    try {
      const data = {
        ...form,
        nombre: normalize(form.nombre),
        apellidoPaterno: normalize(form.apellidoPaterno),
        apellidoMaterno: form.apellidoMaterno ? normalize(form.apellidoMaterno) : '',
        correo: form.correo.trim().toLowerCase(),
      };
      const res: any = await register(data);
      if (res.requiresVerification || res.token === 'pending_verification') {
        window.location.replace(`${ROUTES.CONFIRMAR_CORREO}?correo=${encodeURIComponent(data.correo)}`);
      } else {
        window.location.replace(ROUTES.DASHBOARD);
      }
    } catch (err: any) {
      setApiError(err?.message || 'Error al registrarte. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const passwordValid = validatePassword(form.password) === '';

  return (
    <AuthLayout title="Crear Cuenta" subtitle="Únete a la plataforma de bioseguridad más avanzada">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {apiError && <div className={styles.errorBox}>{apiError}</div>}

        <Input label="Nombre" placeholder="Ej. María" icon={<User size={18} />}
          value={form.nombre} onChange={(e) => handleChange('nombre', e.target.value)}
          maxLength={100} error={getFieldError('nombre')}
          success={touched.nombre && !getFieldError('nombre')}
          autoComplete="given-name" />

        <Input label="Apellido paterno" placeholder="Ej. Pérez" icon={<User size={18} />}
          value={form.apellidoPaterno} onChange={(e) => handleChange('apellidoPaterno', e.target.value)}
          maxLength={100} error={getFieldError('apellidoPaterno')}
          success={touched.apellidoPaterno && !getFieldError('apellidoPaterno')}
          autoComplete="family-name" />

        <Input label="Apellido materno (opcional)" placeholder="Ej. Gómez" icon={<User size={18} />}
          value={form.apellidoMaterno} onChange={(e) => handleChange('apellidoMaterno', e.target.value)}
          maxLength={100} autoComplete="additional-name" />

        <Input label="Correo electrónico" type="email" placeholder="tu@correo.com" icon={<Mail size={18} />}
          value={form.correo} onChange={(e) => handleChange('correo', e.target.value)}
          maxLength={254} error={getFieldError('correo')}
          success={touched.correo && !getFieldError('correo')}
          autoComplete="email" />

        <Input label="Contraseña" type="password" placeholder="Crea una contraseña segura" icon={<Lock size={18} />}
          value={form.password} onChange={(e) => handleChange('password', e.target.value)}
          maxLength={128} error={getFieldError('password')}
          success={touched.password && passwordValid}
          autoComplete="new-password" />

        <PasswordRequirements password={form.password} />

        <Input label="Confirmar Contraseña" type="password" placeholder="Repite tu contraseña" icon={<Lock size={18} />}
          value={confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)}
          error={getFieldError('confirmPassword')}
          success={touched.confirmPassword && confirmPassword === form.password}
          autoComplete="new-password" />

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
