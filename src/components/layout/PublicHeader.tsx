import { Link } from 'react-router-dom';
import { Sun } from 'lucide-react';
import './public-header.css';

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header__inner">
        <Link to="/" className="public-header__logo" aria-label="BioGuard inicio">
          <span className="public-header__logo-text">BioGuard</span>
        </Link>
        <nav className="public-header__nav">
          <Link to="/login" className="public-header__link">
            Iniciar sesión
          </Link>
          <button className="btn-theme" aria-label="Cambiar tema">
            <Sun size={16} strokeWidth={1.8} />
          </button>
        </nav>
      </div>
    </header>
  );
}
