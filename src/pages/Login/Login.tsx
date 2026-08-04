import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { TextInput, PasswordInput } from '../../components/ui/inputs';
import { Eye, EyeOff } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailAlert, setEmailAlert] = useState('');
  const [passAlert, setPassAlert] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) navigate('/dashboard');
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
          <PrimaryButton type="submit" fullWidth disabled={!email || !password}>
            Iniciar sesión
          </PrimaryButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
