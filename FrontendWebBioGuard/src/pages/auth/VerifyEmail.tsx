import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, LoadingSpinner } from '../../components/ui';
import { AuthLayout } from '../../components/layout';
import { authService } from '../../services';
import { ROUTES } from '../../constants';
import styles from './Auth.module.css';

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const correo = searchParams.get('correo') || '';
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!correo) navigate(ROUTES.REGISTRO);
  }, [correo, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleChange = useCallback((index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  }, [code]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputsRef.current[index - 1]?.focus();
  }, [code]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      setCode([...Array(6)].map((_, i) => pasted[i] || ''));
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  }, []);

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) { setError('Ingresa el codigo completo'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await authService.verificar2FA({ correo, codigo: fullCode });
      localStorage.setItem('bioguard_token', res.token);
      localStorage.setItem('bioguard_user', JSON.stringify(res));
      setSuccess(true);
      setTimeout(() => window.location.replace(ROUTES.DASHBOARD), 1500);
    } catch {
      setError('Codigo invalido o expirado');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      await authService.enviar2FA({ correo });
      setResendTimer(60);
      setError('');
    } catch {
      setError('Error al reenviar codigo');
    }
  };

  if (!correo) return <LoadingSpinner />;

  return (
    <AuthLayout title="Confirmacion de Correo" subtitle={`Codigo enviado a ${correo}`}>
      <div className={styles.form}>
        {error && <div className={styles.errorBox}>{error}</div>}
        {success && (
          <div className={styles.errorBox} style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'rgba(0,230,118,0.2)' }}>
            Verificado. Redirigiendo al dashboard...
          </div>
        )}

        <div onPaste={handlePaste} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {code.map((digit, idx) => (
            <input key={idx} ref={(el) => { inputsRef.current[idx] = el; }} type="text" inputMode="numeric" maxLength={1}
              value={digit} onChange={(e) => handleChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)}
              aria-label={`Digito ${idx + 1}`}
              style={{ width: 48, height: 56, textAlign: 'center', fontSize: '1.3rem', background: 'var(--color-bg-input)',
                border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`, borderRadius: 10, color: 'var(--color-text-primary)' }} />
          ))}
        </div>

        <div className={styles.actions}>
          <Button onClick={handleVerify} fullWidth size="lg" loading={loading} disabled={success}>
            Verificar Codigo
          </Button>
        </div>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={handleResend} disabled={resendTimer > 0 || loading || success}
            style={{ background: 'none', border: 'none', color: resendTimer > 0 ? 'var(--color-text-muted)' : 'var(--color-cyan)', cursor: resendTimer > 0 ? 'default' : 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)' }}>
            {resendTimer > 0 ? `Reenviar en ${resendTimer}s` : 'Reenviar codigo'}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
