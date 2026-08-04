import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { TextInput } from '../../components/ui/inputs';

export function ForgotPassword() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Recuperar Contraseña"
        subtitle="Te enviaremos un enlace para restablecerla"
        maxWidth={440}
        footer={
          <p>
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login">Inicia sesión</Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Correo electrónico"
            type="email"
            name="email"
            placeholder="tu@correo.com"
          />
          <div style={{ height: 28 }} />
          <PrimaryButton type="submit" fullWidth>
            Enviar enlace
          </PrimaryButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
