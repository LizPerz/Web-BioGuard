import { UserPlus, Activity, Brain } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton } from '../../components/ui/buttons';
import { MetricCard } from '../../components/ui/MetricCard';
import { ContentCard } from '../../components/ui/ContentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { mockUser, dashboardMetrics } from '../../data/mockData';
import './Dashboard.css';

export function Dashboard() {
  const iconKeys = ['HeartPulse', 'Thermometer', 'Droplets', 'Brain'] as const;

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
          />
        ))}
      </div>

      <div className="dashboard__row">
        <ContentCard className="dashboard__monitoring">
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

        <ContentCard>
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
    </DashboardLayout>
  );
}
