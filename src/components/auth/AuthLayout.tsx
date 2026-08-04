import { type ReactNode } from 'react';
import { Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import './auth-layout.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <header className="auth-layout__top">
        <Link to="/" className="auth-layout__logo" aria-label="BioGuard">
          BioGuard
        </Link>
        <button className="btn-theme" aria-label="Cambiar tema">
          <Sun size={18} strokeWidth={1.8} />
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
