import { InputHTMLAttributes, forwardRef } from 'react';
import './inputs.css';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className={`field ${error ? 'field--error' : ''} ${className}`}>
        <label className="field__label" htmlFor={props.id || props.name}>
          {label}
        </label>
        <div className="field__wrapper">
          {icon && <span className="field__icon" aria-hidden="true">{icon}</span>}
          <input
            ref={ref}
            className={`field__input ${icon ? 'field__input--has-icon' : ''}`}
            {...props}
          />
        </div>
        {error && <span className="field__error" role="alert">{error}</span>}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  showPassword: boolean;
  onToggleVisibility: () => void;
  eyeIcon: React.ReactNode;
  eyeOffIcon: React.ReactNode;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showPassword, onToggleVisibility, eyeIcon, eyeOffIcon, className = '', ...props }, ref) => {
    return (
      <div className={`field ${error ? 'field--error' : ''} ${className}`}>
        <label className="field__label" htmlFor={props.id || props.name}>
          {label}
        </label>
        <div className="field__wrapper">
          <span className="field__icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
          <input
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className="field__input field__input--has-icon"
            {...props}
          />
          <button
            type="button"
            className="field__visibility"
            onClick={onToggleVisibility}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? eyeOffIcon : eyeIcon}
          </button>
        </div>
        {error && <span className="field__error" role="alert">{error}</span>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

interface CodeInputProps {
  length?: number;
  value: string[];
  onChange: (index: number, val: string) => void;
}

export function CodeInput({ length = 6, value, onChange }: CodeInputProps) {
  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
    onChange(index, val);
    if (val && index < length - 1) {
      const next = e.target.parentElement?.parentElement?.children[index + 1]?.querySelector('input');
      next?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prev = e.currentTarget.parentElement?.parentElement?.children[index - 1]?.querySelector('input');
      prev?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    pasted.split('').forEach((char, i) => {
      onChange(i, char);
    });
  };

  return (
    <div className="code-input" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          className="code-input__field"
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          aria-label={`Dígito ${i + 1}`}
        />
      ))}
    </div>
  );
}
