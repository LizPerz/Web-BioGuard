import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { PasswordInput } from '../../components/ui/inputs';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { resetPassword, ApiError } from '../../lib/api';

interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  noSpaces: boolean;
}

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [passError, setPassError] = useState('');
  const [loading, setLoading] = useState(false);

  const checks: PasswordChecks = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
    noSpaces: password.length > 0 && !/\s/.test(password),
  };

  const allChecksPass = Object.values(checks).every(Boolean);
  const confirmMatch = confirmPassword.length > 0 && confirmPassword === password;
  const canSubmit = allChecksPass && confirmMatch && !!token;

  const checkItems: { key: keyof PasswordChecks; label: string }[] = [
    { key: 'minLength', label: 'Mínimo 8 caracteres' },
    { key: 'hasUpper', label: 'Al menos una mayúscula' },
    { key: 'hasLower', label: 'Al menos una minúscula' },
    { key: 'hasNumber', label: 'Al menos un número' },
    { key: 'hasSymbol', label: 'Al menos un símbolo' },
    { key: 'noSpaces', label: 'Sin espacios' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setFormError('');
    try {
      await resetPassword({ Token: token, NuevaPassword: password });
      navigate('/login', { state: { resetSuccess: true } });
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

  if (!token) {
    return (
      <AuthLayout>
        <AuthCard title="Enlace Inválido" subtitle="El enlace de recuperación es inválido o está incompleto" maxWidth={440}>
          <div style={{ textAlign: 'center' }}>
            <Link to="/forgot-password" style={{ fontWeight: 600 }}>Solicitar un nuevo enlace</Link>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Restablecer Contraseña"
        subtitle="Ingresa tu nueva contraseña"
        maxWidth={440}
        footer={
          <p>
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login">Inicia sesión</Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit}>
          <PasswordInput
            label="Nueva contraseña" name="password" placeholder="Mínimo 8 caracteres"
            showPassword={showPass}
            onToggleVisibility={() => setShowPass(!showPass)}
            eyeIcon={<Eye size={17} strokeWidth={1.8} />}
            eyeOffIcon={<EyeOff size={17} strokeWidth={1.8} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
                setPassError('No se permiten espacios');
                setTimeout(() => setPassError(''), 2000);
              }
            }}
            error={passError}
          />
          {password.length > 0 && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {checkItems.map((item) => (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: checks[item.key] ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)' }}>
                  {checks[item.key] ? <Check size={13} /> : <X size={13} />}
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
          />
          <div style={{ height: 20 }} />
          {formError && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', color: 'var(--danger, #dc2626)', fontSize: 13 }}>
              {formError}
            </div>
          )}
          <PrimaryButton type="submit" fullWidth disabled={!canSubmit || loading}>
            {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
          </PrimaryButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
