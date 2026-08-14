import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserPlus, Activity, Brain, UserRound } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, GhostButton } from '../../components/ui/buttons';
import { MetricCard } from '../../components/ui/MetricCard';
import { ContentCard } from '../../components/ui/ContentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { LineChart } from '../../components/charts/LineChart';
import { CrearPacienteModal } from '../../components/pacientes/CrearPacienteModal';
import { mockUser } from '../../data/mockData';
import { getUser } from '../../lib/auth';
import {
  getMiPaciente,
  getLecturasRango,
  fotoSrc,
  type PacienteResponse,
  type LecturaResponse,
} from '../../lib/api';
import './Dashboard.css';

const MS_HORA = 60 * 60 * 1000;

const formatearNumero = (v: number, digitos = 1) =>
  Number.isFinite(v) ? v.toLocaleString('es-MX', { maximumFractionDigits: digitos }) : '—';

function agruparPorHora(lecturas: LecturaResponse[], select: (l: LecturaResponse) => number) {
  const porHora = new Map<string, number[]>();
  lecturas.forEach((l) => {
    const key = new Date(l.timestamp).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
    if (!porHora.has(key)) porHora.set(key, []);
    porHora.get(key)!.push(select(l));
  });
  return Array.from(porHora.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, values]) => ({
      label,
      value: values.reduce((s, v) => s + v, 0) / values.length,
    }));
}

export function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const iconKeys = ['HeartPulse', 'Thermometer', 'Droplets', 'Brain', 'Activity', 'Footprints'] as const;

  const session = getUser();
  const firstName = session?.nombre?.split(' ')[0] ?? mockUser.firstName;
  const planName = session?.plan ?? mockUser.plan;

  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [loadingPaciente, setLoadingPaciente] = useState(true);
  const [crearOpen, setCrearOpen] = useState(false);

  const [lecturas, setLecturas] = useState<LecturaResponse[]>([]);
  const [cargandoLecturas, setCargandoLecturas] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

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

  const cargarLecturas = useCallback(async (pacienteId: string) => {
    setCargandoLecturas(true);
    try {
      const hasta = new Date();
      const desde = new Date(hasta.getTime() - 24 * MS_HORA);
      const data = await getLecturasRango(pacienteId, desde.toISOString(), hasta.toISOString());
      setLecturas(data);
      setUltimaActualizacion(new Date());
    } catch {
      setLecturas([]);
    } finally {
      setCargandoLecturas(false);
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

  useEffect(() => {
    if (paciente) cargarLecturas(paciente.id);
  }, [paciente, cargarLecturas]);

  useEffect(() => {
    if (!paciente) return;
    const id = window.setInterval(() => {
      cargarLecturas(paciente.id);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [paciente, cargarLecturas]);

  const metricas = useMemo(() => {
    if (lecturas.length === 0) return { pulso: null, temp: null, estres: null, riesgo: null, glucosa: null, pasos: null };
    const conGlucosa = lecturas.filter((l) => l.glucosaEstimadaMgDl && l.glucosaEstimadaMgDl > 0);
    const conPasos = lecturas.filter((l) => l.pasos && l.pasos > 0);
    return {
      pulso: lecturas.reduce((s, l) => s + l.pulsoBpm, 0) / lecturas.length,
      temp: lecturas.reduce((s, l) => s + l.temperaturaC, 0) / lecturas.length,
      estres: lecturas.reduce((s, l) => s + l.estresPct, 0) / lecturas.length,
      riesgo: Math.max(...lecturas.map((l) => l.probabilidadPico)),
      glucosa: conGlucosa.length > 0 ? conGlucosa[0].glucosaEstimadaMgDl! : null,
      pasos: conPasos.length > 0 ? Math.max(...conPasos.map((l) => l.pasos!)) : null,
    };
  }, [lecturas]);

  const seriesPulso = useMemo(() => agruparPorHora(lecturas, (l) => l.pulsoBpm), [lecturas]);
  const seriesTemp = useMemo(() => agruparPorHora(lecturas, (l) => l.temperaturaC), [lecturas]);
  const seriesRiesgo = useMemo(() => agruparPorHora(lecturas, (l) => l.probabilidadPico * 100), [lecturas]);

  const metrics = [
    {
      label: 'PULSO CARDÍACO',
      value: metricas.pulso != null ? formatearNumero(metricas.pulso) : '--',
      unit: 'BPM',
      iconBg: 'var(--icon-bg-pulse)',
      iconColor: 'var(--danger)',
      hasData: metricas.pulso != null,
    },
    {
      label: 'TEMPERATURA',
      value: metricas.temp != null ? formatearNumero(metricas.temp, 2) : '--',
      unit: '°C',
      iconBg: 'var(--icon-bg-temp)',
      iconColor: 'var(--cyan)',
      hasData: metricas.temp != null,
    },
    {
      label: 'ESTRÉS (HRV)',
      value: metricas.estres != null ? formatearNumero(metricas.estres, 0) : '--',
      unit: '%',
      iconBg: 'var(--icon-bg-sweat)',
      iconColor: 'var(--purple)',
      hasData: metricas.estres != null,
    },
    {
      label: 'RIESGO IA',
      value: metricas.riesgo != null ? formatearNumero(metricas.riesgo * 100) : '--',
      unit: '%',
      iconBg: 'var(--icon-bg-ai)',
      iconColor: 'var(--success)',
      hasData: metricas.riesgo != null,
    },
    {
      label: 'GLUCOSA ESTIMADA',
      value: metricas.glucosa != null ? formatearNumero(metricas.glucosa) : '--',
      unit: 'mg/dL',
      iconBg: 'var(--icon-bg-ai)',
      iconColor: 'var(--danger)',
      hasData: metricas.glucosa != null,
    },
    {
      label: 'PASOS',
      value: metricas.pasos != null ? formatearNumero(metricas.pasos, 0) : '--',
      unit: 'pasos',
      iconBg: 'var(--icon-bg-sweat)',
      iconColor: 'var(--purple)',
      hasData: metricas.pasos != null,
    },
  ];

  const sinLecturas = lecturas.length === 0 && !cargandoLecturas;

  return (
    <DashboardLayout>
      <PageHeader
        title="Panel Principal"
        subtitle={
          <>
            Bienvenido, <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{firstName}</span> · Plan {planName}
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
            {paciente.foto ? (
              <img
                className="dashboard__patient-photo"
                src={fotoSrc(paciente.foto)}
                alt={`Foto de ${paciente.nombre}`}
              />
            ) : (
              <div className="dashboard__patient-icon">
                <UserRound size={22} strokeWidth={1.8} />
              </div>
            )}
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
        {metrics.map((metric, i) => (
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
        <ContentCard className="dashboard__monitoring" onClick={() => navigate('/health')}>
          <div className="dashboard__card-header">
            <div>
              <h3 className="dashboard__card-title">Monitoreo 24 Horas</h3>
              <p className="dashboard__card-subtitle">Pulso · Temperatura</p>
            </div>
            <span className="dashboard__legend">
              {ultimaActualizacion
                ? `Act. ${ultimaActualizacion.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                : '24h'}
            </span>
          </div>
          {cargandoLecturas ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando lecturas…</p>
          ) : sinLecturas ? (
            <EmptyState
              icon={<Activity size={24} strokeWidth={1.6} />}
              title="Sin datos de monitoreo"
              description="Vincula un dispositivo para comenzar"
            />
          ) : (
            <div className="dashboard__charts">
              <div className="dashboard__chart-block">
                <span className="dashboard__chart-label">Pulso (BPM)</span>
                <LineChart points={seriesPulso} color="var(--danger)" precision={1} />
              </div>
              <div className="dashboard__chart-block">
                <span className="dashboard__chart-label">Temperatura (°C)</span>
                <LineChart points={seriesTemp} color="var(--cyan)" precision={2} />
              </div>
            </div>
          )}
        </ContentCard>

        <ContentCard onClick={() => navigate('/health')}>
          <div className="dashboard__card-header">
            <div>
              <h3 className="dashboard__card-title">Matriz Predictiva</h3>
              <p className="dashboard__card-subtitle">Probabilidad de pico por hora</p>
            </div>
          </div>
          {cargandoLecturas ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cargando lecturas…</p>
          ) : sinLecturas ? (
            <EmptyState
              icon={<Brain size={24} strokeWidth={1.6} />}
              title="Sin predicciones aún"
              description="Disponible con Plan Pro"
            />
          ) : (
            <div className="dashboard__chart-block">
              <span className="dashboard__chart-label">Probabilidad de pico (%)</span>
              <LineChart points={seriesRiesgo} color="var(--success)" precision={1} />
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
