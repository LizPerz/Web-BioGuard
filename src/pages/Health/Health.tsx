import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Printer,
  CalendarDays,
  HeartPulse,
  Thermometer,
  Droplets,
  Activity,
  BellRing,
  ShieldAlert,
  Loader2,
  Check,
  UserRound,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, SecondaryButton } from '../../components/ui/buttons';
import { ContentCard } from '../../components/ui/ContentCard';
import { StatusBadge } from '../../components/ui/badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { PrediccionMlCard } from '../../components/ml/PrediccionMlCard';
import {
  getMiPaciente,
  getMiPlan,
  getLecturasRango,
  getEventos,
  getHistorialAlertas,
  getPrediccionActual,
  ApiError,
  type PacienteResponse,
  type PlanResponse,
  type LecturaResponse,
  type EventoResponse,
  type AlertaResponse,
  type PrediccionMlResponse,
} from '../../lib/api';
import './Health.css';

type Rango = '7d' | '30d';

interface ReporteDatos {
  lecturas: LecturaResponse[];
  eventos: EventoResponse[];
  alertas: AlertaResponse[];
  esDia: boolean;
}

const iconSize = 16;

const MS_DIA = 24 * 60 * 60 * 1000;

const formatearFecha = (d: Date) => {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString('es-MX');
  }
};

const formatearFechaCorta = (d: Date) => {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
    }).format(d);
  } catch {
    return d.toLocaleDateString('es-MX');
  }
};

const formatearHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const formatearNumero = (v: number, digitos = 1) =>
  Number.isFinite(v) ? v.toLocaleString('es-MX', { maximumFractionDigits: digitos }) : '—';

const aIso = (d: Date) => d.toISOString();

const hoyLocal = () => {
  const h = new Date();
  return new Date(h.getFullYear(), h.getMonth(), h.getDate());
};

const aYYYYMMDD = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  return err instanceof ApiError ? err.message : fallback;
}

export function Health() {
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [rango, setRango] = useState<Rango>('7d');
  const [fecha, setFecha] = useState('');
  const [generando, setGenerando] = useState(false);
  const [reporte, setReporte] = useState<ReporteDatos | null>(null);
  const [rangoTexto, setRangoTexto] = useState('');

  const [prediccionActual, setPrediccionActual] = useState<PrediccionMlResponse | null>(null);
  const [cargandoPredicciones, setCargandoPredicciones] = useState(false);

  const maxDias = plan?.diasHistorial && plan.diasHistorial > 0 ? plan.diasHistorial : 7;

  const rangosDisponibles = useMemo<Rango[]>(() => {
    const opts: Rango[] = ['7d'];
    if (maxDias >= 30) opts.push('30d');
    return opts;
  }, [maxDias]);

  const minFecha = useMemo(
    () => aYYYYMMDD(new Date(hoyLocal().getTime() - (maxDias - 1) * MS_DIA)),
    [maxDias],
  );
  const maxFecha = aYYYYMMDD(hoyLocal());

  useEffect(() => {
    (async () => {
      setCargando(true);
      setError('');
      try {
        const [p, pl] = await Promise.all([
          getMiPaciente(),
          getMiPlan().catch(() => null),
        ]);
        setPaciente(p);
        setPlan(pl);
      } catch (err) {
        setError(errMsg(err));
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!rangosDisponibles.includes(rango)) setRango('7d');
  }, [rangosDisponibles, rango]);

  const calcularRango = (): { desde: Date; hasta: Date; texto: string; esDia: boolean } => {
    if (fecha) {
      const [y, m, d] = fecha.split('-').map(Number);
      const desde = new Date(y, m - 1, d, 0, 0, 0, 0);
      const hasta = new Date(y, m - 1, d, 23, 59, 59, 999);
      return { desde, hasta, texto: formatearFecha(desde), esDia: true };
    }
    const dias = rango === '30d' ? 30 : 7;
    const hoy = hoyLocal();
    const hasta = new Date();
    const desde = new Date(hoy.getTime() - (dias - 1) * MS_DIA);
    return { desde, hasta, texto: `${formatearFecha(desde)} — ${formatearFecha(hoy)}`, esDia: false };
  };

  const generar = async () => {
    if (!paciente) return;
    setGenerando(true);
    setError('');
    try {
      const { desde, hasta, texto, esDia } = calcularRango();
      const [lecturas, eventos, alertas] = await Promise.all([
        getLecturasRango(paciente.id, aIso(desde), aIso(hasta)),
        getEventos(paciente.id),
        getHistorialAlertas(paciente.id),
      ]);
      const eventosFiltrados = eventos.filter((e) => {
        const t = new Date(e.fechaEvento).getTime();
        return t >= desde.getTime() && t <= hasta.getTime();
      });
      const alertasFiltradas = alertas.filter((a) => {
        const t = new Date(a.fechaCreacion).getTime();
        return t >= desde.getTime() && t <= hasta.getTime();
      });
      setReporte({
        lecturas,
        eventos: eventosFiltrados,
        alertas: alertasFiltradas,
        esDia,
      });
      setRangoTexto(texto);

      await cargarPredicciones();
    } catch (err) {
      setError(errMsg(err));
      setReporte(null);
    } finally {
      setGenerando(false);
    }
  };

  const cargarPredicciones = async () => {
    if (!paciente) return;
    setCargandoPredicciones(true);
    try {
      const pred = await getPrediccionActual(paciente.id);
      setPrediccionActual(pred);
    } catch (err) {
      console.warn('Error cargando predicción ML actual:', err);
      setPrediccionActual(null);
    } finally {
      setCargandoPredicciones(false);
    }
  };

  const metricas = useMemo(() => {
    const lecturas = reporte?.lecturas ?? [];
    const eventos = reporte?.eventos ?? [];
    const alertas = reporte?.alertas ?? [];
    return {
      totalLecturas: lecturas.length,
      promedioPulso: lecturas.length ? lecturas.reduce((s, l) => s + l.pulsoBpm, 0) / lecturas.length : null,
      promedioTemp: lecturas.length ? lecturas.reduce((s, l) => s + l.temperaturaC, 0) / lecturas.length : null,
      promedioGsr: lecturas.length ? lecturas.reduce((s, l) => s + l.sudoracionGsr, 0) / lecturas.length : null,
      riesgoMax: lecturas.length ? Math.max(...lecturas.map((l) => l.probabilidadPico)) : null,
      totalEventos: eventos.length,
      criticos: eventos.filter((e) => e.nivelRiesgo === 'Critico').length,
      totalAlertas: alertas.length,
      sinAtender: alertas.filter((a) => !a.atendida).length,
    };
  }, [reporte]);

  const filasResumen = useMemo(() => {
    if (!reporte || reporte.lecturas.length === 0) return [];
    if (reporte.esDia) {
      const porHora = new Map<string, LecturaResponse[]>();
      reporte.lecturas.forEach((l) => {
        const key = formatearHora(l.timestamp);
        if (!porHora.has(key)) porHora.set(key, []);
        porHora.get(key)!.push(l);
      });
      return Array.from(porHora.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([hora, items]) => ({
          grupo: hora,
          count: items.length,
          pulso: items.reduce((s, l) => s + l.pulsoBpm, 0) / items.length,
          temp: items.reduce((s, l) => s + l.temperaturaC, 0) / items.length,
          gsr: items.reduce((s, l) => s + l.sudoracionGsr, 0) / items.length,
          riesgo: Math.max(...items.map((l) => l.probabilidadPico)),
        }));
    }
    const porDia = new Map<string, LecturaResponse[]>();
    reporte.lecturas.forEach((l) => {
      const key = aYYYYMMDD(new Date(l.timestamp));
      if (!porDia.has(key)) porDia.set(key, []);
      porDia.get(key)!.push(l);
    });
    return Array.from(porDia.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, items]) => ({
        grupo: formatearFechaCorta(new Date(dia + 'T12:00:00')),
        count: items.length,
        pulso: items.reduce((s, l) => s + l.pulsoBpm, 0) / items.length,
        temp: items.reduce((s, l) => s + l.temperaturaC, 0) / items.length,
        gsr: items.reduce((s, l) => s + l.sudoracionGsr, 0) / items.length,
        riesgo: Math.max(...items.map((l) => l.probabilidadPico)),
      }));
  }, [reporte]);

  const tieneDatos = !!reporte && (metricas.totalLecturas > 0 || metricas.totalEventos > 0 || metricas.totalAlertas > 0);

  const imprimir = () => {
    window.print();
  };

  const rangoValido = (value: string) => {
    if (!value) return false;
    const [y, m, d] = value.split('-').map(Number);
    const t = new Date(y, m - 1, d).getTime();
    return t >= new Date(minFecha + 'T12:00:00').getTime() && t <= new Date(maxFecha + 'T12:00:00').getTime();
  };

  const cambiarFecha = (value: string) => {
    setFecha(value);
    if (value && rangoValido(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setRangoTexto(formatearFecha(new Date(y, m - 1, d)));
    }
  };

  const options = rangosDisponibles.map((r) => ({
    value: r,
    label: r === '7d' ? '7 días' : '30 días',
  }));

  return (
    <DashboardLayout>
      <PageHeader
        title="Reportes"
        subtitle="Genera el reporte diario o histórico de tu paciente según tu plan"
        action={
          <SecondaryButton onClick={imprimir} disabled={!tieneDatos}>
            <Printer size={14} strokeWidth={1.8} />
            Imprimir reporte
          </SecondaryButton>
        }
      />

      {error && (
        <div className="modal__error" style={{ marginBottom: 20 }} role="alert">
          {error}
        </div>
      )}

      <div className="reportes__controls">
        <ContentCard className="reportes__controls-card">
          <div className="reportes__controls-row">
            <div className="reportes__period">
              <span className="reportes__controls-label">Historial</span>
              <SegmentedControl options={options} value={rango} onChange={(v) => setRango(v as Rango)} />
            </div>

            <div className="reportes__fecha">
              <span className="reportes__controls-label">Imprimir reporte de un día</span>
              <div className="reportes__fecha-input">
                <CalendarDays size={15} strokeWidth={1.8} />
                <input
                  type="date"
                  value={fecha}
                  min={minFecha}
                  max={maxFecha}
                  onChange={(e) => cambiarFecha(e.target.value)}
                  aria-label="Fecha del reporte"
                />
              </div>
            </div>

            <PrimaryButton onClick={generar} disabled={!paciente || generando || (fecha !== '' && !rangoValido(fecha))}>
              {generando ? <Loader2 size={14} strokeWidth={1.8} className="reportes__spin" /> : <FileText size={14} strokeWidth={1.8} />}
              {generando ? 'Generando…' : 'Generar reporte'}
            </PrimaryButton>
          </div>

          <p className="reportes__plan-hint">
            Tu plan {plan?.nombre ?? 'actual'} incluye reporte diario
            {maxDias >= 30 ? ', historial de 7 o 30 días y reporte de un día específico' : maxDias >= 7 ? ' y hasta 7 días de historial' : ''}.
            {plan?.limiteCuidadores ? ` · ${plan.limiteCuidadores} cuidadores permitidos.` : ''}
          </p>
        </ContentCard>
      </div>

      {cargando ? (
        <p className="pacientes__loading">Cargando…</p>
      ) : !paciente ? (
        <EmptyState
          icon={<UserRound size={24} strokeWidth={1.6} />}
          title="Sin paciente vinculado"
          description="Crea un paciente en Pacientes y Cuidadores para poder generar reportes"
        />
      ) : !reporte ? (
        <EmptyState
          icon={<FileText size={24} strokeWidth={1.6} />}
          title="Sin reporte generado"
          description={`Selecciona un historial${fecha ? ' o un día' : ''} y presiona "Generar reporte"`}
        />
      ) : !tieneDatos ? (
        <EmptyState
          icon={<Activity size={24} strokeWidth={1.6} />}
          title="Sin datos para este período"
          description={`No hay lecturas, eventos ni alertas en ${rangoTexto}`}
        />
      ) : (
        <div className="reportes__print-area">
          <div className="reportes__header">
            <div className="reportes__header-brand">
              <span className="reportes__header-logo">BioGuard</span>
              <span className="reportes__header-sub">Reporte de salud</span>
            </div>
            <div className="reportes__header-meta">
              <span><strong>Paciente:</strong> {paciente.nombre}</span>
              <span><strong>Plan:</strong> {plan?.nombre ?? 'Gratis'}</span>
              <span><strong>Período:</strong> {rangoTexto}</span>
              <span><strong>Generado:</strong> {formatearFecha(new Date())}</span>
            </div>
          </div>

          <div className="reportes__kpi-grid">
            <div className="reportes__kpi">
              <HeartPulse size={17} strokeWidth={1.8} style={{ color: 'var(--danger)' }} />
              <span className="reportes__kpi-label">Pulso promedio</span>
              <span className="reportes__kpi-value">{metricas.promedioPulso != null ? formatearNumero(metricas.promedioPulso) : '—'} <small>BPM</small></span>
            </div>
            <div className="reportes__kpi">
              <Thermometer size={17} strokeWidth={1.8} style={{ color: 'var(--cyan)' }} />
              <span className="reportes__kpi-label">Temperatura promedio</span>
              <span className="reportes__kpi-value">{metricas.promedioTemp != null ? formatearNumero(metricas.promedioTemp, 2) : '—'} <small>°C</small></span>
            </div>
            <div className="reportes__kpi">
              <Droplets size={17} strokeWidth={1.8} style={{ color: 'var(--purple)' }} />
              <span className="reportes__kpi-label">Sudoración promedio</span>
              <span className="reportes__kpi-value">{metricas.promedioGsr != null ? formatearNumero(metricas.promedioGsr, 2) : '—'} <small>µS</small></span>
            </div>
            <div className="reportes__kpi">
              <Activity size={17} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
              <span className="reportes__kpi-label">Lecturas</span>
              <span className="reportes__kpi-value">{metricas.totalLecturas}</span>
            </div>
            <div className="reportes__kpi">
              <ShieldAlert size={17} strokeWidth={1.8} style={{ color: 'var(--danger)' }} />
              <span className="reportes__kpi-label">Riesgo máximo</span>
              <span className="reportes__kpi-value">{metricas.riesgoMax != null ? `${formatearNumero(metricas.riesgoMax * 100)}%` : '—'}</span>
            </div>
            <div className="reportes__kpi">
              <BellRing size={17} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
              <span className="reportes__kpi-label">Eventos</span>
              <span className="reportes__kpi-value">{metricas.totalEventos} <small>{metricas.criticos > 0 ? `${metricas.criticos} crítico${metricas.criticos === 1 ? '' : 's'}` : 'sin críticos'}</small></span>
            </div>
          </div>

          {metricas.totalLecturas > 0 && (
            <ContentCard className="reportes__tabla-card">
              <div className="reportes__card-title-row" style={{ marginBottom: 12 }}>
                <Activity size={iconSize} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
                <h3>{reporte.esDia ? 'Lecturas por hora' : 'Lecturas por día'}</h3>
                <StatusBadge label={`${metricas.totalLecturas} lecturas`} variant="info" />
              </div>
              <div className="reportes__tabla-wrap">
                <table className="reportes__tabla">
                  <thead>
                    <tr>
                      <th>{reporte.esDia ? 'Hora' : 'Fecha'}</th>
                      <th>Lecturas</th>
                      <th>Pulso prom.</th>
                      <th>Temp. prom.</th>
                      <th>GSR prom.</th>
                      <th>Riesgo máx.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasResumen.map((f) => (
                      <tr key={f.grupo}>
                        <td className="reportes__tabla-grupo">{f.grupo}</td>
                        <td>{f.count}</td>
                        <td>{formatearNumero(f.pulso)} BPM</td>
                        <td>{formatearNumero(f.temp, 2)} °C</td>
                        <td>{formatearNumero(f.gsr, 2)} µS</td>
                        <td>{formatearNumero(f.riesgo * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ContentCard>
          )}

          {cargandoPredicciones ? (
            <ContentCard className="reportes__ml-card">
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando análisis ML...</p>
            </ContentCard>
          ) : prediccionActual ? (
            <div className="reportes__ml-section">
              <h3 style={{ marginBottom: 16, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                📊 Análisis ML - Predicción de Pico Glucémico
              </h3>
              <div className="reportes__ml-grid">
                <PrediccionMlCard prediccion={prediccionActual} />
              </div>
            </div>
          ) : null}

          <div className="reportes__dos-col">
            {metricas.totalEventos > 0 && (
              <ContentCard className="reportes__lista-card">
                <div className="reportes__card-title-row" style={{ marginBottom: 12 }}>
                  <ShieldAlert size={iconSize} strokeWidth={1.8} style={{ color: 'var(--danger)' }} />
                  <h3>Eventos metabólicos</h3>
                </div>
                <ul className="reportes__lista">
                  {reporte.eventos.map((e) => (
                    <li key={e.id} className="reportes__lista-item">
                      <span className="reportes__lista-hora">{formatearHora(e.fechaEvento)}</span>
                      <StatusBadge
                        label={e.nivelRiesgo}
                        variant={e.nivelRiesgo === 'Critico' ? 'danger' : e.nivelRiesgo === 'Pre-Pico' ? 'warning' : 'info'}
                      />
                      <span className="reportes__lista-desc">{e.descripcion || `Probabilidad ${formatearNumero(e.probabilidadMl * 100)}%`}</span>
                      {e.atendida && <Check size={14} strokeWidth={2} style={{ color: 'var(--success)' }} />}
                    </li>
                  ))}
                </ul>
              </ContentCard>
            )}

            {metricas.totalAlertas > 0 && (
              <ContentCard className="reportes__lista-card">
                <div className="reportes__card-title-row" style={{ marginBottom: 12 }}>
                  <BellRing size={iconSize} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
                  <h3>Alertas</h3>
                </div>
                <ul className="reportes__lista">
                  {reporte.alertas.map((a) => (
                    <li key={a.id} className="reportes__lista-item">
                      <span className="reportes__lista-hora">{formatearHora(a.fechaCreacion)}</span>
                      <StatusBadge
                        label={a.nivel}
                        variant={a.nivel === 'critico' ? 'danger' : a.nivel === 'advertencia' ? 'warning' : 'info'}
                      />
                      <span className="reportes__lista-desc">{a.titulo}</span>
                      {a.atendida ? <Check size={14} strokeWidth={2} style={{ color: 'var(--success)' }} /> : <span className="reportes__sin-atender">pendiente</span>}
                    </li>
                  ))}
                </ul>
              </ContentCard>
            )}
          </div>

          <p className="reportes__footer">
            Generado por BioGuard · Documento informativo de monitoreo, no sustituye un diagnóstico médico.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
