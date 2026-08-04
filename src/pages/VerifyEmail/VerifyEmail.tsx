import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { AuthCard } from '../../components/auth/AuthCard';
import { PrimaryButton } from '../../components/ui/buttons';
import { CodeInput } from '../../components/ui/inputs';
import { mockUser } from '../../data/mockData';

export function VerifyEmail() {
  const navigate = useNavigate();
  const [code, setCode] = useState<string[]>(Array(6).fill(''));

  const handleChange = (index: number, val: string) => {
    const newCode = [...code];
    newCode[index] = val;
    setCode(newCode);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Confirmación de Correo"
        subtitle={`Hemos enviado un código de verificación a ${mockUser.email}`}
        maxWidth={480}
      >
        <form onSubmit={handleVerify}>
          <CodeInput value={code} onChange={handleChange} />
          <div style={{ height: 32 }} />
          <PrimaryButton type="submit" fullWidth>
            Verificar Código
          </PrimaryButton>
          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>
            <Link to="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 500 }}>
              Reenviar código
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
