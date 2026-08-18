import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  TriangleAlert,
  Activity,
  Check,
  Trash2,
  Loader2,
  CheckCheck,
} from 'lucide-react';
import {
  getNotificaciones,
  getMiPaciente,
  getHistorialAlertas,
  marcarNotificacionLeida,
  eliminarNotificacion,
  ApiError,
  type NotificacionResponse,
  type AlertaResponse,
} from '../../lib/api';
import './notifications-dropdown.css';

function normalizarNotificacion(raw: unknown): NotificacionResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const pick = (...keys: string[]) => {
    for (const k of keys) if (o[k] != null) return o[k];
    return undefined;
  };

  const id = pick('id', 'Id', 'notificacionId');
  if (id == null) return null;

  const leidaRaw = pick('leida', 'Leida', 'leidaLeida', 'LeidaLeida', 'isRead', 'read', 'esLeida');
  const leida =
    leidaRaw == null
      ? false
      : typeof leidaRaw === 'boolean'
        ? leidaRaw
        : leidaRaw === 1 || String(leidaRaw).toLowerCase() === 'true';

  const tsRaw = pick(
    'fechaCreacion',
    'FechaCreacion',
    'fecha',
    'Fecha',
    'timestamp',
    'Timestamp',
    'createdAt',
    'created_at',
    'fechaEnvio',
  );
  const ts = tsRaw != null ? new Date(String(tsRaw)).toISOString() : new Date().toISOString();

  return {
    id: String(id),
    titulo: String(pick('titulo', 'Titulo', 'Título', 'title', 'asunto') ?? 'Notificación'),
    mensaje: String(pick('mensaje', 'Mensaje', 'message', 'body', 'descripcion', 'Descripcion') ?? ''),
    tipo: pick('tipo', 'Tipo', 'type', 'tipoNotificacion') != null ? String(pick('tipo', 'Tipo', 'type', 'tipoNotificacion')) : undefined,
    nivel: pick('nivel', 'Nivel', 'level', 'prioridad') != null ? String(pick('nivel', 'Nivel', 'level', 'prioridad')) : undefined,
    ...(pick('pacienteId', 'PacienteId') != null ? { pacienteId: String(pick('pacienteId', 'PacienteId')) } : {}),
    leida,
    fechaCreacion: ts,
  };
}

function alertaANotificacion(a: AlertaResponse): NotificacionResponse {
  return {
    id: `alerta-${a.id}`,
    titulo: a.titulo || 'Alerta del paciente',
    mensaje: a.mensaje || '',
    tipo: a.tipo,
    nivel: a.nivel,
    leida: a.atendida,
    fechaCreacion: a.fechaCreacion,
  };
}

function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  return err instanceof ApiError ? err.message : fallback;
}

function tiempoDesde(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (!Number.isFinite(min) || min < 0) return 'ahora mismo';
  if (min < 1) return 'hace unos segundos';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  } catch {
    return `hace ${d} d`;
  }
}

function tono(n: NotificacionResponse): { Icon: typeof Bell; color: string; bg: string } {
  const t = `${n.tipo ?? ''} ${n.nivel ?? ''}`.toLowerCase();
  if (t.includes('emergencia') || t.includes('danger') || t.includes('alta') || t.includes('critic')) {
    return { Icon: TriangleAlert, color: 'var(--danger)', bg: 'var(--icon-bg-pulse)' };
  }
  if (t.includes('alerta') || t.includes('warning') || t.includes('media') || t.includes('alarma')) {
    return { Icon: BellRing, color: 'var(--warning)', bg: 'rgba(255, 212, 59, 0.14)' };
  }
  if (t.includes('evento') || t.includes('info') || t.includes('baja')) {
    return { Icon: Activity, color: 'var(--blue)', bg: 'var(--icon-bg-ai)' };
  }
  return { Icon: Bell, color: 'var(--cyan)', bg: 'var(--icon-bg-temp)' };
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionResponse[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [notifsRaw, paciente] = await Promise.all([
        getNotificaciones().catch(() => [] as NotificacionResponse[]),
        getMiPaciente().catch(() => null),
      ]);

      const notifs = (notifsRaw ?? [])
        .map(normalizarNotificacion)
        .filter((n): n is NotificacionResponse => n != null);

      let alertas: NotificacionResponse[] = [];
      if (paciente?.id) {
        const alertasRaw = await getHistorialAlertas(paciente.id, 50).catch(() => [] as AlertaResponse[]);
        alertas = (alertasRaw ?? []).map(alertaANotificacion);
      }

      const merged = [...notifs, ...alertas].sort(
        (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
      );

      setNotificaciones(merged);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 60000);
    return () => clearInterval(t);
  }, [cargar]);

  useEffect(() => {
    if (!open) return;
    const onClickFuera = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const marcarLeida = async (id: string) => {
    const prev = notificaciones;
    setNotificaciones((lista) => lista.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    if (!id.startsWith('alerta-')) {
      try {
        await marcarNotificacionLeida(id);
      } catch {
        setNotificaciones(prev);
      }
    }
  };

  const eliminar = async (id: string) => {
    const prev = notificaciones;
    setNotificaciones((lista) => lista.filter((n) => n.id !== id));
    if (!id.startsWith('alerta-')) {
      try {
        await eliminarNotificacion(id);
      } catch {
        setNotificaciones(prev);
      }
    }
  };

  const marcarTodasLeidas = async () => {
    const pendientes = notificaciones.filter((n) => !n.leida);
    if (pendientes.length === 0) return;
    setMarcandoTodas(true);
    try {
      const apiPendientes = pendientes.filter((n) => !n.id.startsWith('alerta-'));
      await Promise.allSettled(apiPendientes.map((n) => marcarNotificacionLeida(n.id)));
      setNotificaciones((lista) => lista.map((n) => ({ ...n, leida: true })));
    } finally {
      setMarcandoTodas(false);
    }
  };

  return (
    <div className="notifications" ref={wrapRef}>
      <button
        className={`notifications__bell ${open ? 'notifications__bell--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Bell size={20} strokeWidth={1.8} />
        {noLeidas > 0 && <span className="notifications__badge">{noLeidas > 99 ? '99+' : noLeidas}</span>}
      </button>

      {open && (
        <div className="notifications__panel" role="menu">
          <div className="notifications__header">
            <div className="notifications__header-title">
              <Bell size={16} strokeWidth={1.8} />
              <span>Notificaciones</span>
              {noLeidas > 0 && <span className="notifications__count">{noLeidas} nuevas</span>}
            </div>
            {noLeidas > 0 && (
              <button
                className="notifications__mark-all"
                onClick={marcarTodasLeidas}
                disabled={marcandoTodas}
              >
                {marcandoTodas ? (
                  <Loader2 size={12} strokeWidth={2} className="notifications__spin" />
                ) : (
                  <CheckCheck size={12} strokeWidth={2} />
                )}
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="notifications__body">
            {cargando && notificaciones.length === 0 ? (
              <div className="notifications__state">
                <Loader2 size={20} strokeWidth={1.8} className="notifications__spin" />
                Cargando notificaciones…
              </div>
            ) : error && notificaciones.length === 0 ? (
              <div className="notifications__state">
                <TriangleAlert size={20} strokeWidth={1.8} style={{ color: 'var(--danger)' }} />
                <p>{error}</p>
                <button className="notifications__retry" onClick={cargar}>
                  Reintentar
                </button>
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="notifications__state">
                <Bell size={22} strokeWidth={1.6} style={{ color: 'var(--text-tertiary)' }} />
                <p className="notifications__state-title">Sin notificaciones</p>
                <p className="notifications__state-desc">
                  Aquí verás las alertas y avisos importantes de tu paciente
                </p>
              </div>
            ) : (
              <ul className="notifications__list">
                {notificaciones.map((n) => {
                  const { Icon, color, bg } = tono(n);
                  return (
                    <li
                      key={n.id}
                      className={`notifications__item ${n.leida ? '' : 'notifications__item--unread'}`}
                    >
                      <span className="notifications__icon" style={{ background: bg, color }}>
                        <Icon size={16} strokeWidth={1.8} />
                      </span>
                      <div className="notifications__content">
                        <div className="notifications__title-row">
                          <span className="notifications__title">{n.titulo}</span>
                          {!n.leida && <span className="notifications__unread-dot" />}
                        </div>
                        {n.mensaje && <p className="notifications__msg">{n.mensaje}</p>}
                        <span className="notifications__time">{tiempoDesde(n.fechaCreacion)}</span>
                      </div>
                      <div className="notifications__actions">
                        {!n.leida && (
                          <button
                            className="notifications__action"
                            onClick={() => marcarLeida(n.id)}
                            aria-label="Marcar como leída"
                            title="Marcar como leída"
                          >
                            <Check size={14} strokeWidth={2} />
                          </button>
                        )}
                        <button
                          className="notifications__action notifications__action--danger"
                          onClick={() => eliminar(n.id)}
                          aria-label="Eliminar notificación"
                          title="Eliminar"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {notificaciones.length > 0 && error && (
            <div className="notifications__footer-error">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
