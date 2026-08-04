import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { TextInput, PasswordInput } from '../../components/ui/inputs';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { registerWeb, ApiError } from '../../lib/api';
import { saveSession } from '../../lib/auth';
import './Register.css';

interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  noSpaces: boolean;
}

export function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPlan = (location.state as { plan?: string } | null)?.plan ?? 'Gratis';
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [maternalLastName, setMaternalLastName] = useState('');
  const [email, setEmail] = useState('');

  const [nameErrors, setNameErrors] = useState<Record<string, string>>({});
  const [emailAlert, setEmailAlert] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const flashError = useCallback((key: string, msg: string) => {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    setNameErrors(prev => ({ ...prev, [key]: msg }));
    timers.current[key] = setTimeout(() => {
      setNameErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2000);
  }, []);

  const blockInvalidKey = (e: React.KeyboardEvent, field: string) => {
    if (e.key === ' ') {
      e.preventDefault();
      flashError(field, 'No se permiten espacios');
    }
    if (field !== 'email' && field !== 'password' && field !== 'confirm' && /[0-9]/.test(e.key)) {
      e.preventDefault();
      flashError(field, 'No se permiten números');
    }
  };

  const checks: PasswordChecks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    noSpaces: password.length > 0 && !/\s/.test(password),
  };

  const allChecksPass = Object.values(checks).every(Boolean);
  const confirmMatch = confirmPassword.length > 0 && confirmPassword === password;
  const canSubmit = allChecksPass && confirmMatch && firstName && lastName && email;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setFormError('');
    try {
      const result = await registerWeb({
        Nombre: firstName.trim(),
        ApellidoPaterno: lastName.trim(),
        ApellidoMaterno: maternalLastName.trim() || undefined,
        Correo: email.trim(),
        Password: password,
        PlanNombre: selectedPlan,
      });
      if (result.requiresVerification) {
        navigate('/verify-email', { state: { correo: email.trim(), userId: result.userId } });
        return;
      }
      if (result.token) {
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
      }
      navigate('/dashboard');
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

  const checkItems: { key: keyof PasswordChecks; label: string }[] = [
    { key: 'minLength', label: 'Mínimo 8 caracteres' },
    { key: 'hasUpper', label: 'Al menos una mayúscula' },
    { key: 'hasNumber', label: 'Al menos un número' },
    { key: 'hasSymbol', label: 'Al menos un símbolo' },
    { key: 'noSpaces', label: 'Sin espacios' },
  ];

  return (
    <AuthLayout>
      <AuthCard
        title="Crear cuenta"
        subtitle="Únete a la plataforma de bioseguridad más avanzada"
        maxWidth={500}
        footer={
          <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        }
      >
        <form onSubmit={handleRegister}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'min(3.5vw, 14px)', marginBottom: 12 }}>
            <TextInput
              label="Nombre" name="firstName" placeholder="Tu nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => blockInvalidKey(e, 'firstName')}
              error={nameErrors.firstName}
            />
            <TextInput
              label="Apellido paterno" name="lastName" placeholder="Apellido paterno"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => blockInvalidKey(e, 'lastName')}
              error={nameErrors.lastName}
            />
          </div>
          <TextInput
            label="Apellido materno (opcional)" name="maternalLastName" placeholder="Apellido materno"
            value={maternalLastName}
            onChange={(e) => setMaternalLastName(e.target.value)}
            onKeyDown={(e) => blockInvalidKey(e, 'maternalLastName')}
            error={nameErrors.maternalLastName}
          />
          <div style={{ height: 12 }} />
          <TextInput
            label="Correo electrónico" type="email" name="email" placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); setEmailAlert('No se permiten espacios'); setTimeout(() => setEmailAlert(''), 2000); } }}
            error={emailAlert}
          />
          <div style={{ height: 12 }} />
          <PasswordInput
            label="Contraseña" name="password" placeholder="Mínimo 8 caracteres"
            showPassword={showPass}
            onToggleVisibility={() => setShowPass(!showPass)}
            eyeIcon={<Eye size={17} strokeWidth={1.8} />}
            eyeOffIcon={<EyeOff size={17} strokeWidth={1.8} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); flashError('password', 'No se permiten espacios'); } }}
            error={nameErrors.password}
          />
          {password.length > 0 && (
            <div className="register__checks">
              {checkItems.map((item) => (
                <div key={item.key} className={`register__check ${checks[item.key] ? 'register__check--pass' : 'register__check--fail'}`}>
                  {checks[item.key] ? <Check size={14} /> : <X size={14} />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ height: 12 }} />
          <PasswordInput
            label="Confirmar contraseña" name="confirmPassword" placeholder="Repite tu contraseña"
            showPassword={showConfirm}
            onToggleVisibility={() => setShowConfirm(!showConfirm)}
            eyeIcon={<Eye size={17} strokeWidth={1.8} />}
            eyeOffIcon={<EyeOff size={17} strokeWidth={1.8} />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); flashError('confirm', 'No se permiten espacios'); } }}
            error={nameErrors.confirm}
          />
          {confirmPassword.length > 0 && (
            <div className={`register__check ${confirmMatch ? 'register__check--pass' : 'register__check--fail'}`} style={{ marginTop: 8 }}>
              {confirmMatch ? <Check size={14} /> : <X size={14} />}
              <span>Las contraseñas coinciden</span>
            </div>
          )}
          <div style={{ height: 20 }} />
          {formError && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', color: 'var(--danger, #dc2626)', fontSize: 13 }}>
              {formError}
            </div>
          )}
          <PrimaryButton type="submit" fullWidth disabled={!canSubmit || loading}>
            {loading ? 'Creando cuenta…' : 'Registrarse'}
          </PrimaryButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
