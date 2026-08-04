import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutGrid, Heart, Lock, CreditCard, Settings, LogOut, Crown,
  Menu, X
} from 'lucide-react';
import { mockUser } from '../../data/mockData';
import './sidebar.css';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: '/dashboard', label: 'Panel', icon: LayoutGrid },
    { path: '/health', label: 'Salud', icon: Heart },
    { path: '/security', label: 'Seguridad', icon: Lock },
    { path: '/billing', label: 'Facturación', icon: CreditCard },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  const sidebarContent = (
    <div className="sidebar__inner">
      <div className="sidebar__brand">
        <Link to="/dashboard" className="sidebar__logo">
          <img src="/bioguard.png" alt="BioGuard" className="sidebar__logo-img" />
          <span className="sidebar__logo-text">BioGuard</span>
        </Link>
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
              onClick={() => setMobileOpen(false)}
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
          <span>Plan {mockUser.plan}</span>
        </div>

        <Link
          to="/settings"
          className={`sidebar__item ${isActive('/settings') ? 'sidebar__item--active' : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <Settings size={19} strokeWidth={1.8} />
          <span>Ajustes</span>
        </Link>

        <button
          className="sidebar__item sidebar__logout"
          onClick={() => navigate('/login')}
        >
          <LogOut size={19} strokeWidth={1.8} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sidebar sidebar--desktop">
        {sidebarContent}
      </aside>

      <button
        className="sidebar__mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>

      {mobileOpen && (
        <div className="sidebar__overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar sidebar--mobile ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar__mobile-header">
          <span className="sidebar__logo-text">BioGuard</span>
          <button
            className="sidebar__mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
