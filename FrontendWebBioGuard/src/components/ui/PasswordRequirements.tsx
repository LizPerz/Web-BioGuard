import { CheckCircle2, Circle } from 'lucide-react';
import styles from './PasswordRequirements.module.css';

interface PasswordRequirementsProps {
  password: string;
}

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{}|;':",.\/<>?]/;

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const requirements = [
    { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
    { label: 'Una letra mayúscula (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'Una letra minúscula (a-z)', valid: /[a-z]/.test(password) },
    { label: 'Un número (0-9)', valid: /[0-9]/.test(password) },
    { label: 'Un carácter especial (!@#$%...)', valid: SPECIAL_CHARS.test(password) },
  ];
  const allValid = password.length > 0 && requirements.every((r) => r.valid);

  if (password.length === 0) return null;

  return (
    <div className={styles.container} role="group" aria-label="Requisitos de la contraseña">
      <span className={allValid ? styles.titleOk : styles.title}>Requisitos de la contraseña</span>
      <ul className={styles.list}>
        {requirements.map((req) => (
          <li key={req.label} className={req.valid ? styles.itemOk : styles.item}>
            {req.valid ? <CheckCircle2 size={14} className={styles.check} /> : <Circle size={14} className={styles.circle} />}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
