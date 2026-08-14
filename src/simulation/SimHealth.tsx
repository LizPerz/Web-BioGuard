import { useState } from 'react';
import {
  HeartPulse, Thermometer, Droplets, Brain, FileText,
  Activity, Pill
} from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { PageHeader } from '../components/ui/PageHeader';
import { SecondaryButton } from '../components/ui/buttons';
import { StatusBadge } from '../components/ui/badges';
import { EmptyState } from '../components/ui/EmptyState';
import { ContentCard } from '../components/ui/ContentCard';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useBiometricData } from '../simulation/BiometricDataContext';
import { SimulationControls } from '../simulation/SimulationControls';
import '../pages/Health/Health.css';

export function SimHealth() {
  const { summary, isRunning } = useBiometricData();
  const [period, setPeriod] = useState('7d');
  const hasData = isRunning && summary.totalLecturas > 0;
  const iconSize = 16;

  const ultimaLectura = summary.ultimaLectura;

  return (
    <DashboardLayout>
      <PageHeader
        title="Análisis Clínico Avanzado y Reportes de Salud"
        subtitle="Simulación de datos biométricos en tiempo real desde Wear OS"
      />

      <SimulationControls />

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
            <StatusBadge label={hasData ? 'En vivo' : 'Sin datos'} variant={hasData ? 'success' : 'neutral'} />
          </div>
          <div className="health__metric-value">
            <span className="health__big-value">
              {hasData ? summary.pulso.current?.toFixed(0) : '--'}
            </span>
            <span className="health__big-unit">BPM</span>
          </div>
          <p className="health__avg">
            Promedio {hasData ? summary.pulso.avg?.toFixed(0) : '--'} BPM
          </p>
        </ContentCard>

        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <Thermometer size={iconSize} strokeWidth={1.8} style={{ color: 'var(--cyan)' }} />
              <h3>Temperatura</h3>
            </div>
            <StatusBadge label={hasData ? 'En vivo' : 'Sin datos'} variant={hasData ? 'success' : 'neutral'} />
          </div>
          <div className="health__metric-value">
            <span className="health__big-value">
              {hasData ? summary.temperatura.current?.toFixed(1) : '--'}
            </span>
            <span className="health__big-unit">°C</span>
          </div>
          <p className="health__avg">
            Promedio {hasData ? summary.temperatura.avg?.toFixed(1) : '--'} °C
          </p>
        </ContentCard>
      </div>

      <div className="health__row health__row--uneven">
        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <Droplets size={iconSize} strokeWidth={1.8} style={{ color: 'var(--purple)' }} />
              <h3>Estrés (HRV)</h3>
            </div>
            <StatusBadge label={hasData ? 'En vivo' : 'Sin datos'} variant={hasData ? 'success' : 'neutral'} />
          </div>
          <div className="health__gsr-row">
            <div className="health__gsr-circle">
              <span className="health__gsr-value">
                {hasData ? summary.estres.current?.toFixed(0) : '--'}
              </span>
              <span className="health__gsr-label">Estrés %</span>
            </div>
            <div className="health__gsr-info">
              <div>
                <span className="health__gsr-info-label">Nivel</span>
                <span className="health__gsr-info-val">
                  {ultimaLectura?.nivelRiesgo || 'Sin datos'}
                </span>
              </div>
              <div>
                <span className="health__gsr-info-label">Promedio</span>
                <span className="health__gsr-info-val">
                  {hasData ? summary.estres.avg?.toFixed(1) + ' %' : 'Sin datos'}
                </span>
              </div>
              <div>
                <span className="health__gsr-info-label">Lecturas</span>
                <span className="health__gsr-info-val">{summary.totalLecturas} totales</span>
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
            {hasData && summary.riesgoIA.current !== null ? (
              <p>
                {summary.riesgoIA.current > 70
                  ? `⚠️ Riesgo elevado (${summary.riesgoIA.current.toFixed(1)}%). Se recomienda monitoreo continuo.`
                  : summary.riesgoIA.current > 30
                  ? `Riesgo moderado (${summary.riesgoIA.current.toFixed(1)}%). Parámetros dentro de rangos aceptables.`
                  : `✅ Signos vitales óptimos (${summary.riesgoIA.current.toFixed(1)}%). No se detectan anomalías.`}
              </p>
            ) : (
              <p>Sin recomendaciones de IA disponibles. Inicia la simulación para obtener análisis.</p>
            )}
          </div>
        </ContentCard>
      </div>

      <div className="health__row">
        <ContentCard>
          <div className="health__card-title-row" style={{ marginBottom: 14 }}>
            <Activity size={iconSize} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
            <h3>Eventos Metabólicos Recientes</h3>
          </div>
          {hasData && summary.historial.filter(l => l.nivelRiesgo === 'Estres Alto').length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {summary.historial.filter(l => l.nivelRiesgo === 'Estres Alto').slice(-3).map((l, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--danger)', padding: '6px 10px', background: 'rgba(255,79,95,0.08)', borderRadius: 8 }}>
                  Pico detectado: BPM {l.bpm}, Estrés {l.estresPct} % — {new Date(l.timestamp).toLocaleTimeString()}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity size={24} strokeWidth={1.6} />}
              title="Sin eventos recientes"
              description="No se han detectado picos de riesgo"
            />
          )}
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
