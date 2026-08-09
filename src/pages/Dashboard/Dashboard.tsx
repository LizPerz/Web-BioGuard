import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Activity, Brain, UserRound, AlertTriangle, TrendingUp } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/ui/buttons';
import { MetricCard } from '../../components/ui/MetricCard';
import { ContentCard } from '../../components/ui/ContentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { CrearPacienteModal } from '../../components/pacientes/CrearPacienteModal';
import { mockUser, dashboardMetrics } from '../../data/mockData';
import { getUser } from '../../lib/auth';
import { getMiPaciente, type PacienteResponse } from '../../lib/api';
import { useSimulation, type BiometricReading } from '../../simulation';
import './Dashboard.css';

const SPARKLINE_WIDTH = 600;
const SPARKLINE_HEIGHT = 100;
const MAX_SPARKLINE_POINTS = 120;

function drawSparkline(readings: BiometricReading[], field: 'pulsoBpm' | 'temperaturaC'): string {
  const subset = readings.slice(-MAX_SPARKLINE_POINTS);
  if (subset.length < 2) return '';

  const values = subset.map((r) => r[field]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const padX = 0;
  const padY = 4;
  const w = SPARKLINE_WIDTH - padX * 2;
  const h = SPARKLINE_HEIGHT - padY * 2;

  const points = subset.map((_, i) => {
    const x = padX + (i / (subset.length - 1)) * w;
    const y = padY + h - ((values[i] - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return points.join(' ');
}

function getRiskColor(nivel: string): string {
  switch (nivel) {
    case 'CRITICO': return 'var(--danger, #dc2626)';
    case 'MODERADO': return 'var(--warning, #f59e0b)';
    default: return 'var(--success, #16a34a)';
  }
}

function getRiskLabel(nivel: string): string {
  switch (nivel) {
    case 'CRITICO': return 'Crítico';
    case 'MODERADO': return 'Moderado';
    default: return 'Óptimo';
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const iconKeys = ['HeartPulse', 'Thermometer', 'Droplets', 'Brain'] as const;

  const session = getUser();
  const firstName = session?.nombre?.split(' ')[0] ?? mockUser.firstName;
  const planName = session?.plan ?? mockUser.plan;

  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [loadingPaciente, setLoadingPaciente] = useState(true);
  const [crearOpen, setCrearOpen] = useState(false);

  const { latest, readings, events, isRunning } = useSimulation();

  const metricValues = useMemo(() => {
    if (!latest) return null;
    return {
      pulso: { value: String(latest.pulsoBpm), hasData: true },
      temperatura: { value: String(latest.temperaturaC), hasData: true },
      sudoracion: { value: String(latest.sudoracionGsr), hasData: true },
      riesgo: { value: `${Math.round(latest.probabilidadPico * 100)}`, hasData: true },
    };
  }, [latest]);

  const metricOverrides = useMemo(() => {
    if (!metricValues) return dashboardMetrics;
    return dashboardMetrics.map((m, i) => {
      const keys = ['pulso', 'temperatura', 'sudoracion', 'riesgo'] as const;
      const mv = metricValues[keys[i]];
      return { ...m, value: mv.value, hasData: mv.hasData };
    });
  }, [metricValues]);

  const latestEvents = useMemo(() => events.slice(-5).reverse(), [events]);

  const bpmSparkline = useMemo(() => drawSparkline(readings, 'pulsoBpm'), [readings]);
  const tempSparkline = useMemo(() => drawSparkline(readings, 'temperaturaC'), [readings]);

  const cargarPaciente = useCallback(async () => {
    try {
      const p = await getMiPaciente();
      setPaciente(p);
    } catch {
      // si la API no responde, la pantalla sigue siendo usable
    } finally {
      setLoadingPaciente(false);
    }
  }, []);

  useEffect(() => {
    cargarPaciente();
    const state = location.state as { crearPaciente?: boolean } | null;
    if (state?.crearPaciente) {
      setCrearOpen(true);
      window.history.replaceState({}, '');
    }
  }, [cargarPaciente, location.state]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Panel Principal"
        subtitle={
          <>
            Bienvenido, <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{firstName}</span> · Plan {planName}
            {isRunning && (
              <span style={{
                marginLeft: 12,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--success, #16a34a)',
                background: 'rgba(22,163,74,0.1)',
                padding: '2px 10px',
                borderRadius: 'var(--radius-pill)',
              }}>
                Wearable conectado
              </span>
            )}
          </>
        }
        action={
          !loadingPaciente && !paciente ? (
            <PrimaryButton onClick={() => setCrearOpen(true)}>
              <UserPlus size={16} strokeWidth={2} />
              Crear Paciente
            </PrimaryButton>
          ) : paciente ? (
            <GhostButton onClick={() => navigate('/pacientes')}>Ver paciente</GhostButton>
          ) : undefined
        }
      />

      {paciente && (
        <ContentCard className="dashboard__patient" onClick={() => navigate('/pacientes')}>
          <div className="dashboard__patient-info">
            <div className="dashboard__patient-icon">
              <UserRound size={22} strokeWidth={1.8} />
            </div>
            <div>
              <span className="dashboard__patient-label">Paciente vinculado</span>
              <h3 className="dashboard__patient-name">{paciente.nombre}</h3>
            </div>
          </div>
          <div className="dashboard__patient-stats">
            {paciente.edad != null && paciente.edad > 0 && (
              <span className="dashboard__patient-stat">
                <b>{paciente.edad}</b> años
              </span>
            )}
            {paciente.pesoKg != null && paciente.pesoKg > 0 && (
              <span className="dashboard__patient-stat">
                <b>{paciente.pesoKg}</b> kg
              </span>
            )}
            {paciente.estaturaCm != null && paciente.estaturaCm > 0 && (
              <span className="dashboard__patient-stat">
                <b>{paciente.estaturaCm}</b> cm
              </span>
            )}
          </div>
        </ContentCard>
      )}

      <div className="dashboard__metrics">
        {metricOverrides.map((metric, i) => (
          <MetricCard
            key={metric.label}
            icon={iconKeys[i]}
            iconBg={metric.iconBg}
            iconColor={metric.iconColor}
            label={metric.label}
            value={metric.value}
            unit={metric.unit}
            hasData={metric.hasData}
            onClick={() => navigate('/health')}
          />
        ))}
      </div>

      <div className="dashboard__row">
        <ContentCard className="dashboard__monitoring">
          <div className="dashboard__card-header">
            <div>
              <h3 className="dashboard__card-title">Monitoreo en Vivo</h3>
              <p className="dashboard__card-subtitle">Pulso · Temperatura</p>
            </div>
            <span className="dashboard__legend">Simulación</span>
          </div>
          {readings.length < 2 ? (
            <EmptyState
              icon={<Activity size={24} strokeWidth={1.6} />}
              title="Iniciando simulación…"
              description="Recolectando primeras lecturas"
            />
          ) : (
            <div className="dashboard__sparklines">
              <div className="dashboard__sparkline-row">
                <div className="dashboard__sparkline-label">
                  <span className="dashboard__sparkline-dot" style={{ background: 'var(--danger, #dc2626)' }} />
                  Pulso
                  <strong>{latest?.pulsoBpm ?? '--'} BPM</strong>
                </div>
                <svg viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`} className="dashboard__sparkline-svg">
                  <polyline
                    fill="none"
                    stroke="var(--danger, #dc2626)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={bpmSparkline}
                  />
                </svg>
              </div>
              <div className="dashboard__sparkline-row">
                <div className="dashboard__sparkline-label">
                  <span className="dashboard__sparkline-dot" style={{ background: 'var(--cyan, #06b6d4)' }} />
                  Temperatura
                  <strong>{latest?.temperaturaC ?? '--'} °C</strong>
                </div>
                <svg viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`} className="dashboard__sparkline-svg">
                  <polyline
                    fill="none"
                    stroke="var(--cyan, #06b6d4)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={tempSparkline}
                  />
                </svg>
              </div>
            </div>
          )}
        </ContentCard>

        <ContentCard>
          <div className="dashboard__card-header">
            <div>
              <h3 className="dashboard__card-title">Matriz Predictiva</h3>
              <p className="dashboard__card-subtitle">Análisis en tiempo real</p>
            </div>
          </div>
          {!latest ? (
            <EmptyState
              icon={<Brain size={24} strokeWidth={1.6} />}
              title="Esperando datos…"
              description="Iniciando motor de riesgo"
            />
          ) : (
            <div className="dashboard__risk-panel">
              <div className="dashboard__risk-gauge" style={{ borderColor: getRiskColor(latest.nivelRiesgo) }}>
                <span className="dashboard__risk-value" style={{ color: getRiskColor(latest.nivelRiesgo) }}>
                  {Math.round(latest.probabilidadPico * 100)}%
                </span>
                <span className="dashboard__risk-label" style={{ color: getRiskColor(latest.nivelRiesgo) }}>
                  {getRiskLabel(latest.nivelRiesgo)}
                </span>
              </div>
              <div className="dashboard__risk-details">
                <div className="dashboard__risk-item">
                  <TrendingUp size={14} />
                  <span>GSR: {latest.sudoracionGsr} µS</span>
                </div>
                <div className="dashboard__risk-item">
                  <span style={{ color: getRiskColor(latest.nivelRiesgo), fontWeight: 700 }}>Nivel: {latest.stressLevel}</span>
                </div>
              </div>
            </div>
          )}

          {latestEvents.length > 0 && (
            <div className="dashboard__events">
              <div className="dashboard__events-title">
                <AlertTriangle size={14} />
                Eventos recientes
              </div>
              <ul className="dashboard__events-list">
                {latestEvents.map((ev) => (
                  <li key={ev.id} className={`dashboard__event-item dashboard__event--${ev.nivelRiesgo.toLowerCase()}`}>
                    <span className="dashboard__event-badge">{getRiskLabel(ev.nivelRiesgo)}</span>
                    <span className="dashboard__event-desc">{ev.descripcion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ContentCard>
      </div>

      <CrearPacienteModal
        open={crearOpen}
        onClose={() => setCrearOpen(false)}
        onCreated={cargarPaciente}
      />
    </DashboardLayout>
  );
}
