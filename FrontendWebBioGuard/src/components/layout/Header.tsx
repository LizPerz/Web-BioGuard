import { useState, useEffect, useRef } from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../context';
import httpClient from '../../utils/httpClient';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  onMenuToggle: () => void;
}

interface NotifItem {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fechaEnvio: string;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { user, photoUrl } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const initials = user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await httpClient.get('/api/Notificaciones');
        const data = (res.data || []) as NotifItem[];
        setNotifs(data.slice(0, 10));
        setUnread(data.filter((n: NotifItem) => !n.leida).length);
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Abrir menu">
          <Menu size={22} />
        </button>
        <span className={styles.breadcrumb}>{title}</span>
      </div>

      <div className={styles.right}>
        <div ref={ref} style={{ position: 'relative' }}>
          <button className={styles.iconBtn} aria-label="Notificaciones" onClick={() => setNotifOpen(!notifOpen)}>
            <Bell size={20} />
            {unread > 0 && <span className={styles.notifDot} />}
          </button>
          {notifOpen && (
            <div style={{
              position: 'absolute', top: 42, right: 0, width: 360, maxHeight: 420, overflowY: 'auto',
              background: '#111C2E', border: '1px solid rgba(45,156,255,0.15)', borderRadius: 14,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 200, padding: 8,
            }}>
              <div style={{ padding: '10px 14px', fontSize: '0.85rem', fontWeight: 600, color: '#F5F7FA', borderBottom: '1px solid rgba(45,156,255,0.08)', marginBottom: 4 }}>
                Notificaciones
                {unread > 0 && <span style={{ marginLeft: 8, fontSize: '0.7rem', color: '#2D9CFF' }}>{unread} sin leer</span>}
              </div>
              {notifs.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#8E9CB8', fontSize: '0.85rem' }}>
                  Sin notificaciones
                </div>
              ) : (
                notifs.map(n => (
                  <div key={n.id} style={{
                    padding: '10px 14px', borderRadius: 8, marginBottom: 2,
                    background: n.leida ? 'transparent' : 'rgba(45,156,255,0.04)',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      {!n.leida && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2D9CFF', flexShrink: 0 }} />}
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F5F7FA' }}>{n.titulo}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#8E9CB8', lineHeight: 1.4 }}>{n.mensaje}</div>
                    <div style={{ fontSize: '0.7rem', color: '#5a6d8a', marginTop: 4 }}>
                      {new Date(n.fechaEnvio).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <button className={styles.userBtn}>
          <div className={styles.avatar}>
            {photoUrl ? (
              <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              initials
            )}
          </div>
          <span>{user?.nombre || 'Usuario'}</span>
        </button>
      </div>
    </header>
  );
}
