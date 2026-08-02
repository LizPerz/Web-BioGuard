import { useState, useEffect, useCallback } from 'react';
import { Heart, Thermometer, Droplets, Brain, UserPlus, Activity, BarChart3 } from 'lucide-react';
import { LoadingSpinner, Button } from '../../components/ui';
import { PacienteModal } from '../../components/ui/PacienteModal';
import { sensorService, pacienteService } from '../../services';
import { useAuth } from '../../context';
import { EstadisticasResponse, TendenciaItem, PacienteResponse } from '../../types';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<EstadisticasResponse | null>(null);
  const [tendencias, setTendencias] = useState<TendenciaItem[]>([]);
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const pac = await pacienteService.miPaciente();
      setPaciente(pac);
      const [s, t] = await Promise.all([
        sensorService.getEstadisticas(pac.id),
        sensorService.getTendencia(pac.id, 'diario'),
      ]);
      setStats(s);
      setTendencias(t);
    } catch {
      // mantener datos anteriores, no limpiar
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingSpinner />;

  const tieneDatos = stats && typeof stats.ultimoPulso === 'number';

  const riesgoIA = !stats || !tieneDatos
    ? null
    : stats.estadoActual === 'Critico' ? 'Crítico' : stats.estadoActual === 'Pre-Pico' ? 'Pre-Pico' : 'Normal';
  const riesgoAccent = !riesgoIA ? 'green' : riesgoIA === 'Crítico' ? 'yellow' : riesgoIA === 'Pre-Pico' ? 'yellow' : 'green';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Panel Principal</h1>
      <p className={styles.subtitle}>
        {paciente
          ? <>Monitoreo en tiempo real de <span style={{ color: '#2D9CFF', fontWeight: 600 }}>{paciente.nombre}</span> · Plan {user?.plan || 'Gratis'}</>
          : <>Bienvenido, <span style={{ color: '#2D9CFF', fontWeight: 600 }}>{user?.nombre || 'Usuario'}</span> · Plan {user?.plan || 'Gratis'}</>
        }
      </p>

      {paciente && stats && tieneDatos && (
        <div className={styles.summaryBar}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryDot} />
            <span className={styles.summaryText}>Sistema</span>
            <span className={styles.summaryValue} style={{ color: stats.estadoActual === 'Critico' ? '#ff5252' : '#00e676' }}>
              {stats.estadoActual === 'Critico' ? 'Crítico' : 'Normal'}
            </span>
          </div>
          <div className={styles.summaryItem}>
            <Activity size={14} style={{ color: '#8E9CB8' }} />
            <span className={styles.summaryText}>Lecturas totales</span>
            <span className={styles.summaryValue}>{stats.totalLecturas}</span>
          </div>
          <div className={styles.summaryItem}>
            <BarChart3 size={14} style={{ color: '#8E9CB8' }} />
            <span className={styles.summaryText}>Promedio pulso</span>
            <span className={styles.summaryValue}>{stats.promedioPulso ? Math.round(stats.promedioPulso) : '--'} BPM</span>
          </div>
        </div>
      )}

      <div className={styles.topBar}>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <UserPlus size={15} style={{ marginRight: 6 }} />
          {paciente ? 'Nuevo Paciente' : 'Crear Paciente'}
        </Button>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={`${styles.metricIcon} ${styles.metricIconRed}`}><Heart size={18} /></div>
            <span className={`${styles.metricBadge} ${tieneDatos && stats.ultimoPulso ? styles.metricBadgeActive : styles.metricBadgeIdle}`}>
              {tieneDatos && stats.ultimoPulso ? 'Activo' : 'Sin datos'}
            </span>
          </div>
          <div className={styles.metricValue}>
            {tieneDatos && stats.ultimoPulso ? stats.ultimoPulso : '--'}<span className={styles.metricUnit}>BPM</span>
          </div>
          <div className={styles.metricLabel}>Pulso cardíaco</div>
          {stats?.promedioPulso && <div className={styles.metricFooter}>Promedio {Math.round(stats.promedioPulso)} BPM</div>}
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={`${styles.metricIcon} ${styles.metricIconCyan}`}><Thermometer size={18} /></div>
            <span className={`${styles.metricBadge} ${tieneDatos && stats.ultimaTemperatura ? styles.metricBadgeActive : styles.metricBadgeIdle}`}>{tieneDatos ? 'Normal' : 'Sin datos'}</span>
          </div>
          <div className={styles.metricValue}>
            {tieneDatos && stats.ultimaTemperatura ? stats.ultimaTemperatura.toFixed(1) : '--'}<span className={styles.metricUnit}>°C</span>
          </div>
          <div className={styles.metricLabel}>Temperatura</div>
          {stats?.promedioTemperatura && <div className={styles.metricFooter}>Promedio {stats.promedioTemperatura.toFixed(1)}°C</div>}
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={`${styles.metricIcon} ${styles.metricIconPurple}`}><Droplets size={18} /></div>
            <span className={`${styles.metricBadge} ${tieneDatos && stats.ultimaSudoracion ? (stats.ultimaSudoracion > 50 ? styles.metricBadgeWarn : styles.metricBadgeActive) : styles.metricBadgeIdle}`}>
              {tieneDatos && stats.ultimaSudoracion ? (stats.ultimaSudoracion > 50 ? 'Elevado' : 'Normal') : 'Sin datos'}
            </span>
          </div>
          <div className={styles.metricValue}>
            {tieneDatos && stats.ultimaSudoracion ? stats.ultimaSudoracion.toFixed(1) : '--'}<span className={styles.metricUnit}>GSR</span>
          </div>
          <div className={styles.metricLabel}>Sudoración</div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div className={`${styles.metricIcon} ${!riesgoIA ? styles.metricIconGreen : riesgoAccent === 'yellow' ? styles.metricIconYellow : styles.metricIconGreen}`}><Brain size={18} /></div>
            <span className={`${styles.metricBadge} ${!riesgoIA ? styles.metricBadgeIdle : riesgoIA === 'Crítico' ? styles.metricBadgeWarn : styles.metricBadgeActive}`}>
              {riesgoIA || 'Sin datos'}
            </span>
          </div>
          <div className={styles.metricValue}>
            {riesgoIA || '--'}
          </div>
          <div className={styles.metricLabel}>Riesgo IA</div>
          {stats?.totalLecturas !== undefined && <div className={styles.metricFooter}>{stats.totalLecturas} lecturas analizadas</div>}
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Monitoreo 24 Horas</div>
              <div className={styles.chartSubtitle}>Pulso · Temperatura</div>
            </div>
            <div className={styles.legend}>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ff5252' }} />Pulso</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#00e5ff' }} />Temp</span>
            </div>
          </div>
          {tendencias.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><Activity size={22} style={{ color: '#8E9CB8', opacity: 0.5 }} /></div>
              <div className={styles.emptyTitle}>Sin datos de monitoreo</div>
              <div className={styles.emptyText}>Vincula un dispositivo para comenzar</div>
            </div>
          ) : (
            <div style={{ height: 250 }}>
              <svg viewBox="0 0 800 250" style={{ width: '100%', height: '100%' }}>
                {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                  <line key={p} x1={0} y1={p * 250} x2={800} y2={p * 250} stroke="rgba(45,156,255,0.06)" strokeWidth={0.5} />
                ))}
                <polyline fill="none" stroke="#ff5252" strokeWidth={2} opacity={0.8}
                  points={tendencias.map((t, i) => `${(i / Math.max(tendencias.length - 1, 1)) * 800},${250 - Math.min((t.pulsoBpm / 200) * 250, 230)}`).join(' ')} />
                <polyline fill="none" stroke="#00e5ff" strokeWidth={2} opacity={0.8}
                  points={tendencias.map((t, i) => `${(i / Math.max(tendencias.length - 1, 1)) * 800},${250 - ((t.temperaturaC - 30) / 15) * 250}`).join(' ')} />
              </svg>
            </div>
          )}
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartTitle} style={{ marginBottom: 4 }}>Matriz Predictiva</div>
          <div className={styles.chartSubtitle} style={{ marginBottom: 20 }}>Análisis por hora</div>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Brain size={22} style={{ color: '#8E9CB8', opacity: 0.5 }} /></div>
            <div className={styles.emptyTitle}>Sin predicciones aún</div>
            <div className={styles.emptyText}>Disponible con Plan Pro</div>
          </div>
        </div>
      </div>

      <PacienteModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={loadData} />
    </div>
  );
}
