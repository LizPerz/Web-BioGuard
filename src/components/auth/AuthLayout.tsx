import { type ReactNode } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../lib/use-theme';
import './auth-layout.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="auth-layout">
      <header className="auth-layout__top">
        <Link to="/" className="auth-layout__logo" aria-label="BioGuard">
          <img src="/bioguard.png" alt="" className="auth-layout__logo-img" />
          <span className="auth-layout__logo-text">BioGuard</span>
        </Link>
        <button className="btn-theme" onClick={toggleTheme} aria-label="Cambiar tema">
          {theme === 'light' ? <Moon size={18} strokeWidth={1.8} /> : <Sun size={18} strokeWidth={1.8} />}
        </button>
      </header>
      <main className="auth-layout__main">
        {children}
      </main>
      <footer className="auth-layout__footer">
        <p>Protegido con cifrado de extremo a extremo. BioGuard &copy; 2026</p>
      </footer>
    </div>
  );
}
