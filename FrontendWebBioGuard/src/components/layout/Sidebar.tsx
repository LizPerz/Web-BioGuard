import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Heart,
  Lock,
  CreditCard,
  Settings,
  LogOut,
  Crown,
} from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context';
import { ROUTES } from '../../constants';
import styles from './Sidebar.module.css';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Panel' },
  { to: ROUTES.SALUD, icon: Heart, label: 'Salud' },
  { to: ROUTES.SEGURIDAD, icon: Lock, label: 'Seguridad' },
  { to: ROUTES.FACTURACION, icon: CreditCard, label: 'Facturación' },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth();

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Logo size={30} />
        </div>

        <nav className={styles.sidebarNav}>
          <span className={styles.sidebarSection}>Enterprise Health</span>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.DASHBOARD}
              onClick={onClose}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
              }
            >
              <item.icon className={styles.navIcon} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {user?.plan && (
            <div className={styles.planBadge}>
              <Crown size={16} />
              Plan {user.plan}
            </div>
          )}
          <NavLink
            to={ROUTES.AJUSTES}
            onClick={onClose}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            style={{ marginBottom: 4 }}
          >
            <Settings className={styles.navIcon} />
            Ajustes
          </NavLink>
          <button className={styles.logoutBtn} onClick={logout}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
