import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { TextInput } from '../../components/ui/inputs';
import { forgotPassword, ApiError } from '../../lib/api';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setFormError('');
    setSuccessMsg('');
    try {
      const result = await forgotPassword({ Correo: email.trim() });
      setSuccessMsg(result.message);
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div style={{ height: 28 }} />
          {successMsg && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(22, 163, 74, 0.12)', border: '1px solid rgba(22, 163, 74, 0.35)', color: 'var(--success, #16a34a)', fontSize: 13 }}>
              {successMsg}
            </div>
          )}
          {formError && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(220, 38, 38, 0.12)', border: '1px solid rgba(220, 38, 38, 0.35)', color: 'var(--danger, #dc2626)', fontSize: 13 }}>
              {formError}
            </div>
          )}
          <PrimaryButton type="submit" fullWidth disabled={!email || loading}>
            {loading ? 'Enviando…' : 'Enviar enlace'}
          </PrimaryButton>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
