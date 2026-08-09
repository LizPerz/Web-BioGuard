import { useMemo, useState } from 'react';
import {
  HeartPulse, Thermometer, Droplets, Brain, FileText,
  Activity, Pill, TrendingUp, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { SecondaryButton } from '../../components/ui/buttons';
import { StatusBadge } from '../../components/ui/badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { ContentCard } from '../../components/ui/ContentCard';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useSimulation } from '../../simulation';
import './Health.css';

const SPARKLINE_W = 300;
const SPARKLINE_H = 60;
const MAX_GRAF = 120;

function buildSparkline(values: number[]): string {
  const subset = values.slice(-MAX_GRAF);
  if (subset.length < 2) return '';
  const min = Math.min(...subset);
  const max = Math.max(...subset);
  const range = max - min || 1;
  const pad = 2;
  const w = SPARKLINE_W - pad * 2;
  const h = SPARKLINE_H - pad * 2;
  return subset
    .map((v, i) => {
      const x = pad + (i / (subset.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function getRiskColor(nivel: string): string {
  switch (nivel) {
    case 'CRITICO': return 'var(--danger, #dc2626)';
    case 'MODERADO': return 'var(--warning, #f59e0b)';
    default: return 'var(--success, #16a34a)';
  }
}

function getAiNote(nivel: string, gsr: number, stress: string): string {
  if (nivel === 'CRITICO') {
    return 'Alerta: se detectaron valores críticos. Se recomienda revisión médica inmediata. El estrés elevado y la frecuencia cardíaca indican posible descompensación metabólica.';
  }
  if (nivel === 'MODERADO') {
    return `Atención: nivel de estrés ${stress.toLowerCase()} (GSR: ${gsr} µS). Monitorear evolución en las próximas horas. Considerar hidratación y descanso.`;
  }
  if (gsr > 40) {
    return `Parámetros dentro de rangos aceptables. El nivel de estrés es ${stress.toLowerCase()}. Mantener monitoreo regular.`;
  }
  return 'Todos los parámetros se encuentran en rangos óptimos. El paciente muestra buena regulación metabólica. Continuar con el plan actual.';
}

export function Health() {
  const [period, setPeriod] = useState('7d');
  const navigate = useNavigate();
  const { latest, readings, events, isRunning } = useSimulation();

  const promedio = useMemo(() => {
    if (readings.length === 0) return { bpm: 0, temp: 0, gsr: 0 };
    const sum = readings.reduce((a, r) => ({
      bpm: a.bpm + r.pulsoBpm,
      temp: a.temp + r.temperaturaC,
      gsr: a.gsr + r.sudoracionGsr,
    }), { bpm: 0, temp: 0, gsr: 0 });
    return {
      bpm: Math.round(sum.bpm / readings.length),
      temp: parseFloat((sum.temp / readings.length).toFixed(1)),
      gsr: parseFloat((sum.gsr / readings.length).toFixed(1)),
    };
  }, [readings]);

  const bpmValues = useMemo(() => readings.map((r) => r.pulsoBpm), [readings]);
  const tempValues = useMemo(() => readings.map((r) => r.temperaturaC), [readings]);
  const gsrValues = useMemo(() => readings.map((r) => r.sudoracionGsr), [readings]);

  const bpmSparks = useMemo(() => buildSparkline(bpmValues), [bpmValues]);
  const tempSparks = useMemo(() => buildSparkline(tempValues), [tempValues]);
  const gsrSparks = useMemo(() => buildSparkline(gsrValues), [gsrValues]);

  const latestEvents = useMemo(() => events.slice(-8).reverse(), [events]);

  const iconSize = 16;
  const hasData = isRunning && readings.length > 0;

  return (
    <DashboardLayout>
      <PageHeader
        title="Análisis Clínico Avanzado y Reportes de Salud"
        subtitle={hasData
          ? `${readings.length} lecturas recopiladas · Simulación wearable`
          : 'Vincula un paciente para ver datos de salud'}
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
        <SecondaryButton onClick={() => navigate('/reportes')}>
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
            <span className="health__big-value">{hasData ? latest?.pulsoBpm ?? '--' : '--'}</span>
            <span className="health__big-unit">BPM</span>
          </div>
          <p className="health__avg">Promedio {hasData ? promedio.bpm : '--'} BPM</p>
          {hasData && bpmSparks && (
            <svg viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`} className="health__sparkline">
              <polyline fill="none" stroke="var(--danger, #dc2626)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={bpmSparks} />
            </svg>
          )}
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
            <span className="health__big-value">{hasData ? latest?.temperaturaC ?? '--' : '--'}</span>
            <span className="health__big-unit">°C</span>
          </div>
          <p className="health__avg">Promedio {hasData ? promedio.temp : '--'} °C</p>
          {hasData && tempSparks && (
            <svg viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`} className="health__sparkline">
              <polyline fill="none" stroke="var(--cyan, #06b6d4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={tempSparks} />
            </svg>
          )}
        </ContentCard>
      </div>

      <div className="health__row health__row--uneven">
        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <Droplets size={iconSize} strokeWidth={1.8} style={{ color: 'var(--purple)' }} />
              <h3>Sudoración</h3>
            </div>
            <StatusBadge label={hasData ? 'En vivo' : 'Sin datos'} variant={hasData ? 'success' : 'neutral'} />
          </div>
          <div className="health__gsr-row">
            <div className="health__gsr-circle" style={{ borderColor: latest && latest.sudoracionGsr > 65 ? 'var(--danger)' : latest && latest.sudoracionGsr > 40 ? 'var(--warning)' : undefined }}>
              <span className="health__gsr-value">{hasData && latest ? latest.sudoracionGsr : '--'}</span>
              <span className="health__gsr-label">µS</span>
            </div>
            <div className="health__gsr-info">
              <div>
                <span className="health__gsr-info-label">Nivel</span>
                <span className="health__gsr-info-val">{hasData && latest ? latest.stressLevel : 'Sin datos'}</span>
              </div>
              <div>
                <span className="health__gsr-info-label">Electrolitos</span>
                <span className="health__gsr-info-val">Na+ {hasData && latest ? Math.round(135 + latest.sudoracionGsr * 0.05) : '--'} mmol/L</span>
              </div>
              <div>
                <span className="health__gsr-info-label">Lecturas</span>
                <span className="health__gsr-info-val">{readings.length} totales</span>
              </div>
            </div>
          </div>
          {hasData && gsrSparks && (
            <svg viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`} className="health__sparkline" style={{ marginTop: 12 }}>
              <polyline fill="none" stroke="var(--purple, #8b5cf6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={gsrSparks} />
            </svg>
          )}
        </ContentCard>

        <ContentCard>
          <div className="health__card-top">
            <div className="health__card-title-row">
              <Brain size={iconSize} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
              <h3>Notas IA</h3>
            </div>
            {latest && (
              <TrendingUp size={14} style={{ color: getRiskColor(latest.nivelRiesgo) }} />
            )}
          </div>
          <div className="health__ai-box">
            {!hasData || !latest ? (
              <p>Sin recomendaciones de IA disponibles. Conecta más datos para obtener análisis.</p>
            ) : (
              <div className="health__ai-content">
                <p>{getAiNote(latest.nivelRiesgo, latest.sudoracionGsr, latest.stressLevel)}</p>
                <div className="health__ai-metrics">
                  <span className="health__ai-tag" style={{ background: getRiskColor(latest.nivelRiesgo) + '20', color: getRiskColor(latest.nivelRiesgo) }}>
                    Riesgo: {Math.round(latest.probabilidadPico * 100)}%
                  </span>
                  <span className="health__ai-tag">BPM: {latest.pulsoBpm}</span>
                  <span className="health__ai-tag">GSR: {latest.sudoracionGsr} µS</span>
                </div>
              </div>
            )}
          </div>
        </ContentCard>
      </div>

      <div className="health__row">
        <ContentCard>
          <div className="health__card-title-row" style={{ marginBottom: 16 }}>
            <Activity size={iconSize} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
            <h3>Eventos Metabólicos Recientes</h3>
          </div>
          {latestEvents.length === 0 ? (
            <EmptyState
              icon={<Activity size={24} strokeWidth={1.6} />}
              title="Sin eventos recientes"
              description="Los eventos aparecerán al detectar anomalías"
            />
          ) : (
            <ul className="health__events-list">
              {latestEvents.map((ev) => (
                <li key={ev.id} className={`health__event-item health__event--${ev.nivelRiesgo.toLowerCase()}`}>
                  <AlertTriangle size={14} style={{ color: getRiskColor(ev.nivelRiesgo), flexShrink: 0, marginTop: 1 }} />
                  <div className="health__event-content">
                    <span className="health__event-badge" style={{ background: getRiskColor(ev.nivelRiesgo) + '20', color: getRiskColor(ev.nivelRiesgo) }}>
                      {ev.nivelRiesgo === 'CRITICO' ? 'Crítico' : 'Moderado'}
                    </span>
                    <span className="health__event-time">{new Date(ev.fechaEvento).toLocaleTimeString()}</span>
                    <p className="health__event-desc">{ev.descripcion}</p>
                  </div>
                </li>
              ))}
            </ul>
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
