import { useState } from 'react';
import { Bell, User, ChevronDown, Menu, UserRound, Mail, LockKeyhole, TriangleAlert, LogOut, ReceiptText, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { mockUser, pageTitles } from '../../data/mockData';
import { getUser, getAccessToken, clearSession } from '../../lib/auth';
import { logout } from '../../lib/api';
import { useTheme } from '../../lib/use-theme';
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
  const displayName = session ? session.nombre : `${mockUser.firstName} ${mockUser.lastName}`.trim();
  const planName = session ? session.plan : mockUser.plan;

  const handleLogout = async () => {
    setMenuOpen(false);
    const token = getAccessToken();
    if (token) {
      try {
        await logout(token);
      } catch {
        // el logout remoto falló; la sesión local se limpia igual
      }
    }
    clearSession();
    navigate('/login');
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
        <button className="dashboard-header__bell" aria-label="Notificaciones">
          <Bell size={20} strokeWidth={1.8} />
        </button>

        <div className="dashboard-header__user-wrap">
          <button
            className="dashboard-header__user"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="dashboard-header__avatar">
              {session?.fotoPerfil
                ? <img src={session.fotoPerfil} alt="Foto de perfil" className="dashboard-header__avatar-img" />
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
