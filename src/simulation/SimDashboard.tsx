import { UserPlus, Activity, Brain } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { PrimaryButton } from '../components/ui/buttons';
import { MetricCard } from '../components/ui/MetricCard';
import { ContentCard } from '../components/ui/ContentCard';
import { EmptyState } from '../components/ui/EmptyState';
import { useBiometricData } from '../simulation/BiometricDataContext';
import { SimulationControls } from '../simulation/SimulationControls';
import { mockUser } from '../data/mockData';
import '../pages/Dashboard/Dashboard.css';

export function SimDashboard() {
  const { summary, isRunning } = useBiometricData();
  const hasData = isRunning && summary.totalLecturas > 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Panel Principal"
        subtitle={
          <>
            Bienvenido, <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{mockUser.firstName}</span> · Plan {mockUser.plan}
          </>
        }
        action={
          <PrimaryButton>
            <UserPlus size={16} strokeWidth={2} />
            Crear Paciente
          </PrimaryButton>
        }
      />

      <SimulationControls />

      <div className="dashboard__metrics">
        <MetricCard
          icon="HeartPulse"
          iconBg="var(--icon-bg-pulse)"
          iconColor="var(--danger)"
          label="PULSO CARDÍACO"
          value={hasData && summary.pulso.current !== null ? summary.pulso.current.toFixed(0) : '--'}
          unit="BPM"
          hasData={hasData}
        />
        <MetricCard
          icon="Thermometer"
          iconBg="var(--icon-bg-temp)"
          iconColor="var(--cyan)"
          label="TEMPERATURA"
          value={hasData && summary.temperatura.current !== null ? summary.temperatura.current.toFixed(1) : '--'}
          unit="°C"
          hasData={hasData}
        />
        <MetricCard
          icon="Droplets"
          iconBg="var(--icon-bg-sweat)"
          iconColor="var(--purple)"
          label="ESTRÉS (HRV)"
          value={hasData && summary.estres.current !== null ? summary.estres.current.toFixed(0) : '--'}
          unit="%"
          hasData={hasData}
        />
        <MetricCard
          icon="Brain"
          iconBg="var(--icon-bg-ai)"
          iconColor="var(--success)"
          label="RIESGO IA"
          value={hasData && summary.riesgoIA.current !== null ? summary.riesgoIA.current.toFixed(1) : '--'}
          unit="%"
          hasData={hasData}
        />
      </div>

      <div className="dashboard__row">
        <ContentCard className="dashboard__monitoring">
          <div className="dashboard__card-header">
            <div>
              <h3 className="dashboard__card-title">Monitoreo 24 Horas</h3>
              <p className="dashboard__card-subtitle">Pulso · Temperatura</p>
            </div>
            <span className="dashboard__legend">{hasData ? `${summary.totalLecturas} lect.` : '24h'}</span>
          </div>
          {hasData ? (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Pulso (BPM)</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>Actual: <b style={{ color: 'var(--danger)' }}>{summary.pulso.current?.toFixed(0)}</b></span>
                  <span>Prom: <b>{summary.pulso.avg?.toFixed(0)}</b></span>
                  <span>Min: <b>{summary.pulso.min?.toFixed(0)}</b></span>
                  <span>Max: <b>{summary.pulso.max?.toFixed(0)}</b></span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Temperatura (°C)</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>Actual: <b style={{ color: 'var(--cyan)' }}>{summary.temperatura.current?.toFixed(1)}</b></span>
                  <span>Prom: <b>{summary.temperatura.avg?.toFixed(1)}</b></span>
                  <span>Min: <b>{summary.temperatura.min?.toFixed(1)}</b></span>
                  <span>Max: <b>{summary.temperatura.max?.toFixed(1)}</b></span>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Activity size={24} strokeWidth={1.6} />}
              title="Sin datos de monitoreo"
              description="Inicia la simulación para ver datos en tiempo real"
            />
          )}
        </ContentCard>

        <ContentCard>
          <div className="dashboard__card-header">
            <div>
              <h3 className="dashboard__card-title">Matriz Predictiva</h3>
              <p className="dashboard__card-subtitle">Análisis IA en tiempo real</p>
            </div>
          </div>
          {hasData && summary.riesgoIA.current !== null ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, fontWeight: 800, color: summary.riesgoIA.current > 50 ? 'var(--danger)' : 'var(--success)', lineHeight: 1 }}>
                {summary.riesgoIA.current.toFixed(1)}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                {summary.riesgoIA.current > 70 ? 'Riesgo alto detectado' :
                 summary.riesgoIA.current > 30 ? 'Riesgo moderado' : 'Niveles óptimos'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                Basado en {summary.totalLecturas} lecturas
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Brain size={24} strokeWidth={1.6} />}
              title="Sin predicciones aún"
              description="Inicia la simulación para generar análisis"
            />
          )}
        </ContentCard>
      </div>
    </DashboardLayout>
  );
}
