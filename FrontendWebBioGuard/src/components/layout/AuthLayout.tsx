import { Link } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useTheme } from '../../context';
import { ROUTES } from '../../constants';
import styles from './AuthLayout.module.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={styles.authLayout}>
      <header className={styles.header}>
        <Link to={ROUTES.HOME} className={styles.logo}>
          BioGuard
        </Link>
        <button className={styles.themeToggle} onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
            <Logo size={100} showText={false} />
          </div>
          <h1 className={styles.cardTitle}>{title}</h1>
          {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
          {children}
        </div>
      </main>

      <footer className={styles.footer}>
        Protegido con cifrado de extremo a extremo. BioGuard &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
