import { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  success?: boolean;
}

export function Input({ label, icon, error, success, className = '', ...props }: InputProps) {
  const isPassword = props.type === 'password';
  const [show, setShow] = useState(false);
  const inputType = isPassword ? (show ? 'text' : 'password') : props.type;

  return (
    <div className={styles.inputGroup}>
      {label && <label className={styles.label}>{label}</label>}
      <div className={styles.inputWrapper}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <input
          {...props}
          type={inputType}
          className={`${styles.input} ${error ? styles.error : ''} ${success && !error ? styles.success : ''} ${className}`}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.togglePassword}
            onClick={() => setShow(!show)}
            tabIndex={-1}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      <span className={styles.errorText}>{error || '\u00A0'}</span>
    </div>
  );
}
