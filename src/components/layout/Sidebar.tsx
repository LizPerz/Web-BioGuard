import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Heart, Users, Settings, LogOut, Crown, X
} from 'lucide-react';
import { mockUser } from '../../data/mockData';
import { getUser, getAccessToken, clearSession } from '../../lib/auth';
import { logout } from '../../lib/api';
import './sidebar.css';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser() ?? mockUser;

  const navItems = [
    { path: '/dashboard', label: 'Panel', icon: LayoutGrid },
    { path: '/health', label: 'Salud', icon: Heart },
    { path: '/pacientes', label: 'Pacientes y Cuidadores', icon: Users },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNav = () => {
    if (window.innerWidth < 1024) onClose();
  };

  const handleLogout = async () => {
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

  return (
    <>
      {open && <div className="sidebar__overlay" onClick={onClose} />}

      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__inner">
          <div className="sidebar__close">
            <button
              className="sidebar__close-btn"
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              <X size={18} strokeWidth={1.8} />
            </button>
          </div>

          <div className="sidebar__divider" />

          <div className="sidebar__section-label">ENTERPRISE HEALTH</div>

          <nav className="sidebar__nav" role="navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar__item ${active ? 'sidebar__item--active' : ''}`}
                  onClick={handleNav}
                >
                  <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar__spacer" />

          <div className="sidebar__bottom">
            <div className="sidebar__plan-badge">
              <Crown size={14} strokeWidth={1.8} />
              <span>Plan {user.plan}</span>
            </div>

            <Link
              to="/settings"
              className={`sidebar__item ${isActive('/settings') ? 'sidebar__item--active' : ''}`}
              onClick={handleNav}
            >
              <Settings size={19} strokeWidth={1.8} />
              <span>Ajustes</span>
            </Link>

            <button
              className="sidebar__item sidebar__logout"
              onClick={handleLogout}
            >
              <LogOut size={19} strokeWidth={1.8} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
