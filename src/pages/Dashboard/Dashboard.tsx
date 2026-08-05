import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Activity, Brain, UserRound } from 'lucide-react';
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
import './Dashboard.css';

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
        {dashboardMetrics.map((metric, i) => (
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
            <span className="dashboard__legend">24h</span>
          </div>
          <EmptyState
            icon={<Activity size={24} strokeWidth={1.6} />}
            title="Sin datos de monitoreo"
            description="Vincula un dispositivo para comenzar"
          />
        </ContentCard>

        <ContentCard onClick={() => navigate('/health')}>
          <div className="dashboard__card-header">
            <div>
              <h3 className="dashboard__card-title">Matriz Predictiva</h3>
              <p className="dashboard__card-subtitle">Análisis por hora</p>
            </div>
          </div>
          <EmptyState
            icon={<Brain size={24} strokeWidth={1.6} />}
            title="Sin predicciones aún"
            description="Disponible con Plan Pro"
          />
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
