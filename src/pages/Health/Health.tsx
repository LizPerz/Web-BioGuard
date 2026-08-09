import { useState } from 'react';
import {
  HeartPulse, Thermometer, Droplets, Brain, FileText,
  Activity, Pill
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { SecondaryButton } from '../../components/ui/buttons';
import { StatusBadge } from '../../components/ui/badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { ContentCard } from '../../components/ui/ContentCard';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import './Health.css';

export function Health() {
  const [period, setPeriod] = useState('7d');

  const iconSize = 16;

  return (
    <DashboardLayout>
      <PageHeader
        title="Análisis Clínico Avanzado y Reportes de Salud"
        subtitle="Vincula un paciente para ver datos de salud"
      />

      <div className="health__controls">
        <SegmentedControl
          options={[
            { label: '7 días', value: '7d' },
            { label: '30 días', value: '30d' },
            { label: 'Historial', value: 'history' },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <SecondaryButton disabled>
          <FileText size={14} strokeWidth={1.8} />
          Generar reporte completo
        </SecondaryButton>
      </div>

      <div className="health__row">
        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <HeartPulse size={iconSize} strokeWidth={1.8} style={{ color: 'var(--danger)' }} />
              <h3>Pulso Cardíaco</h3>
            </div>
            <StatusBadge label="Sin datos" variant="neutral" />
          </div>
          <div className="health__metric-value">
            <span className="health__big-value">--</span>
            <span className="health__big-unit">BPM</span>
          </div>
          <p className="health__avg">Promedio -- BPM</p>
        </ContentCard>

        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <Thermometer size={iconSize} strokeWidth={1.8} style={{ color: 'var(--cyan)' }} />
              <h3>Temperatura</h3>
            </div>
            <StatusBadge label="Sin datos" variant="neutral" />
          </div>
          <div className="health__metric-value">
            <span className="health__big-value">--</span>
            <span className="health__big-unit">°C</span>
          </div>
          <p className="health__avg">Promedio -- °C</p>
        </ContentCard>
      </div>

      <div className="health__row health__row--uneven">
        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <Droplets size={iconSize} strokeWidth={1.8} style={{ color: 'var(--purple)' }} />
              <h3>Sudoración</h3>
            </div>
            <StatusBadge label="Sin datos" variant="neutral" />
          </div>
          <div className="health__gsr-row">
            <div className="health__gsr-circle">
              <span className="health__gsr-value">--</span>
              <span className="health__gsr-label">GSR</span>
            </div>
            <div className="health__gsr-info">
              <div>
                <span className="health__gsr-info-label">Nivel</span>
                <span className="health__gsr-info-val">Sin datos</span>
              </div>
              <div>
                <span className="health__gsr-info-label">Electrolitos</span>
                <span className="health__gsr-info-val">Sin datos</span>
              </div>
              <div>
                <span className="health__gsr-info-label">Lecturas</span>
                <span className="health__gsr-info-val">0 totales</span>
              </div>
            </div>
          </div>
        </ContentCard>

        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <Brain size={iconSize} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
              <h3>Notas IA</h3>
            </div>
          </div>
          <div className="health__ai-box">
            <p>Sin recomendaciones de IA disponibles. Conecta más datos para obtener análisis.</p>
          </div>
        </ContentCard>
      </div>

      <div className="health__row">
        <ContentCard>
          <div className="health__card-title-row" style={{ marginBottom: 16 }}>
            <Activity size={iconSize} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
            <h3>Eventos Metabólicos Recientes</h3>
          </div>
          <EmptyState
            icon={<Activity size={24} strokeWidth={1.6} />}
            title="Sin eventos recientes"
            description="Los eventos aparecerán al vincular un paciente"
          />
        </ContentCard>

        <ContentCard>
          <div className="health__card-title-row" style={{ marginBottom: 14 }}>
            <Pill size={iconSize} strokeWidth={1.8} style={{ color: 'var(--success)' }} />
            <h3>Medicamentos</h3>
          </div>
          <EmptyState
            icon={<Pill size={24} strokeWidth={1.6} />}
            title="Sin medicamentos registrados"
            description="Agrega medicamentos desde el perfil del paciente"
          />
        </ContentCard>
      </div>
    </DashboardLayout>
  );
}
