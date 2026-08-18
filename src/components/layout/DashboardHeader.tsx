import { useEffect, useState } from 'react';
import { User, ChevronDown, Menu, UserRound, Mail, LockKeyhole, TriangleAlert, LogOut, ReceiptText, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { pageTitles } from '../../data/mockData';
import { getUser, performLogout, updateSessionUser } from '../../lib/auth';
import { getMiPerfil } from '../../lib/api';
import { useTheme } from '../../lib/use-theme';
import { fotoSrc } from '../../lib/security';
import { NotificationsDropdown } from '../notifications/NotificationsDropdown';
import './dashboard-header.css';

interface DashboardHeaderProps {
  onToggleMenu: () => void;
}

export function DashboardHeader({ onToggleMenu }: DashboardHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentTitle = pageTitles[location.pathname] || 'Panel Principal';
  const session = getUser();
  const [foto, setFoto] = useState<string | null>(session?.fotoPerfil ?? null);
  const [planNombre, setPlanNombre] = useState<string | null>(null);
  const [displayNombre, setDisplayNombre] = useState<string | null>(null);
  const displayName = displayNombre ?? session?.nombre ?? '';
  const planName = planNombre ?? session?.plan ?? '';

  useEffect(() => {
    let active = true;
    getMiPerfil()
      .then((perfil) => {
        if (!active) return;
        const completo = perfil.nombre ? `${perfil.nombre} ${perfil.apellidoPaterno ?? ''}`.trim() : perfil.nombre;
        updateSessionUser({
          nombre: completo,
          correo: perfil.correo,
          fotoPerfil: perfil.fotoPerfil ?? null,
          plan: perfil.plan ?? '',
        });
        setFoto(perfil.fotoPerfil ?? null);
        setDisplayNombre(completo);
        setPlanNombre(perfil.plan ?? '');
      })
      .catch(() => { /* se conservan los valores actuales de la sesión */ });
    return () => { active = false; };
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    performLogout(navigate);
  };

  const goTo = (hash: string) => {
    setMenuOpen(false);
    navigate(`/settings${hash}`);
  };

  const goToBilling = () => {
    setMenuOpen(false);
    navigate('/billing');
  };

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__left">
        <button
          className="dashboard-header__menu-btn"
          onClick={onToggleMenu}
          aria-label="Abrir menú"
        >
          <Menu size={20} strokeWidth={1.8} />
        </button>
        <h1 className="dashboard-header__title">{currentTitle}</h1>
      </div>

      <div className="dashboard-header__center">
        <img src="/bioguard.png" alt="BioGuard" className="dashboard-header__logo-img" />
        <span className="dashboard-header__logo-text">BioGuard</span>
      </div>

      <div className="dashboard-header__right">
        <NotificationsDropdown />

        <div className="dashboard-header__user-wrap">
          <button
            className="dashboard-header__user"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="dashboard-header__avatar">
              {fotoSrc(foto)
                ? <img src={fotoSrc(foto)} alt="Foto de perfil" className="dashboard-header__avatar-img" />
                : <User size={17} strokeWidth={1.8} />}
            </div>
            <span className="dashboard-header__name">{displayName}</span>
            <ChevronDown size={14} strokeWidth={1.8} className="dashboard-header__chevron" />
          </button>

          {menuOpen && (
            <>
              <div className="dashboard-header__dropdown-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="dashboard-header__dropdown" role="menu">
                <div className="dashboard-header__dropdown-label">
                  {displayName} · Plan {planName}
                </div>
                <button className="dashboard-header__dropdown-item" role="menuitem" onClick={() => goTo('#perfil')}>
                  <UserRound size={16} strokeWidth={1.8} />
                  Editar perfil
                </button>
                <button className="dashboard-header__dropdown-item" role="menuitem" onClick={() => goTo('#correo')}>
                  <Mail size={16} strokeWidth={1.8} />
                  Cambiar correo
                </button>
                <button className="dashboard-header__dropdown-item" role="menuitem" onClick={() => goTo('#password')}>
                  <LockKeyhole size={16} strokeWidth={1.8} />
                  Cambiar contraseña
                </button>
                <button className="dashboard-header__dropdown-item dashboard-header__dropdown-item--danger" role="menuitem" onClick={() => goTo('#peligro')}>
                  <TriangleAlert size={16} strokeWidth={1.8} />
                  Eliminar cuenta
                </button>
                <div className="dashboard-header__dropdown-divider" />
                <button className="dashboard-header__dropdown-item" role="menuitem" onClick={goToBilling}>
                  <ReceiptText size={16} strokeWidth={1.8} />
                  Facturación
                </button>
                <button className="dashboard-header__dropdown-item" role="menuitem" onClick={toggleTheme}>
                  {theme === 'light' ? <Moon size={16} strokeWidth={1.8} /> : <Sun size={16} strokeWidth={1.8} />}
                  {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                </button>
                <div className="dashboard-header__dropdown-divider" />
                <button className="dashboard-header__dropdown-item" role="menuitem" onClick={handleLogout}>
                  <LogOut size={16} strokeWidth={1.8} />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
