import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, FileBarChart2, Users, MapPin, Settings, LogOut, Crown, X
} from 'lucide-react';
import { getUser, performLogout } from '../../lib/auth';
import './sidebar.css';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  const navItems = [
    { path: '/dashboard', label: 'Panel', icon: LayoutGrid },
    { path: '/health', label: 'Reportes', icon: FileBarChart2 },
    { path: '/pacientes', label: 'Pacientes y Cuidadores', icon: Users },
    { path: '/ubicacion', label: 'Ubicación', icon: MapPin },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNav = () => {
    if (window.innerWidth < 1024) onClose();
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
            {user && (
              <div className="sidebar__plan-badge">
                <Crown size={14} strokeWidth={1.8} />
                <span>Plan {user.plan}</span>
              </div>
            )}

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
              onClick={() => performLogout(navigate)}
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
