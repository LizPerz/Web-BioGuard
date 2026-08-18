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
  Brain,
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

function estadoValor(v: number | null, min: number, max: number) {
  if (v == null) return { label: 'Sin datos', tone: 'neutral' as const };
  if (v < min) return { label: 'Bajo', tone: 'info' as const };
  if (v > max) return { label: 'Elevado', tone: 'danger' as const };
  return { label: 'Normal', tone: 'success' as const };
}

function formatearSexo(sexo?: string | null): string {
  if (!sexo) return '';
  const s = sexo.toLowerCase();
  if (s.startsWith('f')) return 'Femenino';
  if (s.startsWith('m')) return 'Masculino';
  return sexo;
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
      console.warn('Error cargando predicción ML actual');
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
      promedioEstres: lecturas.length ? lecturas.reduce((s, l) => s + l.estresPct, 0) / lecturas.length : null,
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
          estres: items.reduce((s, l) => s + l.estresPct, 0) / items.length,
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
        estres: items.reduce((s, l) => s + l.estresPct, 0) / items.length,
        riesgo: Math.max(...items.map((l) => l.probabilidadPico)),
      }));
  }, [reporte]);

  const imc = useMemo(() => {
    if (!paciente?.pesoKg || !paciente?.estaturaCm) return null;
    const h = paciente.estaturaCm / 100;
    if (h <= 0) return null;
    return paciente.pesoKg / (h * h);
  }, [paciente]);

  const sexoLabel = formatearSexo(paciente?.sexo);

  const clasificacionRiesgo = useMemo(() => {
    const lecturas = reporte?.lecturas ?? [];
    if (!lecturas.length) return null;
    return {
      bajo: lecturas.filter((l) => l.probabilidadPico < 0.3).length,
      moderado: lecturas.filter((l) => l.probabilidadPico >= 0.3 && l.probabilidadPico < 0.7).length,
      alto: lecturas.filter((l) => l.probabilidadPico >= 0.7).length,
    };
  }, [reporte]);

  const estados = useMemo(
    () => ({
      pulso: estadoValor(metricas.promedioPulso, 60, 100),
      temp: estadoValor(metricas.promedioTemp, 36.1, 37.2),
      estres: estadoValor(metricas.promedioEstres, 40, 70),
      riesgo: estadoValor(metricas.riesgoMax != null ? metricas.riesgoMax * 100 : null, 30, 70),
    }),
    [metricas],
  );

  const resumen = useMemo(() => {
    const partes: string[] = [];
    const lecturas = reporte?.lecturas ?? [];
    if (!lecturas.length) {
      partes.push('No se registraron lecturas de sensores en el período consultado.');
    } else {
      if (metricas.promedioPulso != null) {
        const p = metricas.promedioPulso;
        const d = p >= 60 && p <= 100 ? 'dentro del rango habitual (60–100 BPM)' : p < 60 ? 'por debajo del rango habitual (60–100 BPM)' : 'por encima del rango habitual (60–100 BPM)';
        partes.push(`El pulso promedio fue de ${formatearNumero(p)} BPM, ${d}.`);
      }
      if (metricas.promedioTemp != null) {
        const t = metricas.promedioTemp;
        const d = t >= 36.1 && t <= 37.2 ? 'dentro de la temperatura corporal normal' : 'fuera del rango corporal habitual (36.1–37.2 °C)';
        partes.push(`La temperatura promedio fue de ${formatearNumero(t, 2)} °C, ${d}.`);
      }
      if (metricas.promedioEstres != null) {
        const e = metricas.promedioEstres;
        const d = e < 40 ? 'un nivel de estrés bajo' : e < 70 ? 'un nivel de estrés moderado' : 'un nivel de estrés elevado';
        partes.push(`El estrés promedio fue de ${formatearNumero(e, 0)} %, lo que representa ${d}.`);
      }
      if (clasificacionRiesgo) {
        partes.push(
          `Del total de lecturas, ${clasificacionRiesgo.bajo} se clasificaron con riesgo bajo, ${clasificacionRiesgo.moderado} con riesgo moderado y ${clasificacionRiesgo.alto} con riesgo alto.`,
        );
      }
    }
    if (metricas.totalEventos > 0) {
      partes.push(
        `Se detectaron ${metricas.totalEventos} evento(s) metabólico(s)${metricas.criticos > 0 ? `, de los cuales ${metricas.criticos} fueron críticos` : ', sin episodios críticos'}.`,
      );
    }
    if (metricas.totalAlertas > 0) {
      partes.push(`Se generaron ${metricas.totalAlertas} alerta(s) durante el período.`);
    }
    return partes.join(' ');
  }, [metricas, clasificacionRiesgo, reporte]);

  const conclusion = useMemo(() => {
    const base = 'El monitoreo de BioGuard ofrece una vista general del estado de salud del paciente en el período consultado. ';
    if (metricas.criticos > 0 || (clasificacionRiesgo && clasificacionRiesgo.alto > 0)) {
      return base + 'Debido a la presencia de episodios de riesgo alto o eventos críticos, se recomienda dar seguimiento cercano, mantener una hidratación y alimentación adecuadas y consultar a un profesional de la salud.';
    }
    if (metricas.totalAlertas > 0) {
      return base + 'Se recomienda continuar con el monitoreo regular, revisar las alertas registradas y mantener hábitos saludables. Si los síntomas persisten, acudir con un especialista.';
    }
    return base + 'Se recomienda mantener el monitoreo periódico y los hábitos saludables para preservar la estabilidad metabólica del paciente.';
  }, [metricas, clasificacionRiesgo]);

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
          {/* Encabezado del documento */}
          <div className="reportes__doc-header">
            <div className="reportes__doc-brand">
              <img src="/bioguard.png" alt="BioGuard" className="reportes__doc-logo" />
              <div className="reportes__doc-brand-text">
                <span className="reportes__doc-name">BioGuard</span>
                <span className="reportes__doc-sub">Monitoreo de salud inteligente</span>
              </div>
            </div>
            <div className="reportes__doc-titles">
              <span className="reportes__doc-kicker">Documento de monitoreo</span>
              <h2 className="reportes__doc-title">Reporte de salud</h2>
              <span className="reportes__doc-period">{rangoTexto}</span>
            </div>
          </div>
          <div className="reportes__doc-rule" />

          {/* Datos del paciente */}
          <div className="reportes__paciente">
            <div className="reportes__paciente-id">
              <div className="reportes__paciente-avatar">
                <UserRound size={22} strokeWidth={1.8} />
              </div>
              <div className="reportes__paciente-main">
                <span className="reportes__paciente-label">Paciente</span>
                <h3 className="reportes__paciente-nombre">{paciente.nombre}</h3>
                <p className="reportes__paciente-detalle">
                  {[paciente.edad != null ? `${paciente.edad} años` : null, sexoLabel || null, imc != null ? `IMC ${formatearNumero(imc, 1)}` : null]
                    .filter(Boolean)
                    .join(' · ') || 'Sin datos biométricos complementarios'}
                </p>
              </div>
            </div>
            <div className="reportes__paciente-meta">
              <div className="reportes__paciente-meta-item">
                <span>Plan</span>
                <strong>{plan?.nombre ?? 'Gratis'}</strong>
              </div>
              <div className="reportes__paciente-meta-item">
                <span>Período</span>
                <strong>{rangoTexto}</strong>
              </div>
              <div className="reportes__paciente-meta-item">
                <span>Generado</span>
                <strong>{formatearFecha(new Date())}</strong>
              </div>
            </div>
          </div>

          {/* Resumen ejecutivo */}
          <div className="reportes__resumen">
            <div className="reportes__resumen-icon">
              <FileText size={18} strokeWidth={1.8} />
            </div>
            <div className="reportes__resumen-body">
              <h3>Resumen ejecutivo</h3>
              <p>{resumen}</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="reportes__kpi-grid">
            <div className="reportes__kpi">
              <span className="reportes__kpi-icon reportes__kpi-icon--pulse">
                <HeartPulse size={17} strokeWidth={1.8} />
              </span>
              <span className="reportes__kpi-label">Pulso promedio</span>
              <span className="reportes__kpi-value">{metricas.promedioPulso != null ? formatearNumero(metricas.promedioPulso) : '—'} <small>BPM</small></span>
              <span className={`reportes__kpi-estado reportes__kpi-estado--${estados.pulso.tone}`}>{estados.pulso.label}</span>
            </div>
            <div className="reportes__kpi">
              <span className="reportes__kpi-icon reportes__kpi-icon--temp">
                <Thermometer size={17} strokeWidth={1.8} />
              </span>
              <span className="reportes__kpi-label">Temperatura promedio</span>
              <span className="reportes__kpi-value">{metricas.promedioTemp != null ? formatearNumero(metricas.promedioTemp, 2) : '—'} <small>°C</small></span>
              <span className={`reportes__kpi-estado reportes__kpi-estado--${estados.temp.tone}`}>{estados.temp.label}</span>
            </div>
            <div className="reportes__kpi">
              <span className="reportes__kpi-icon reportes__kpi-icon--estres">
                <Droplets size={17} strokeWidth={1.8} />
              </span>
              <span className="reportes__kpi-label">Estrés promedio</span>
              <span className="reportes__kpi-value">{metricas.promedioEstres != null ? formatearNumero(metricas.promedioEstres, 0) : '—'} <small>%</small></span>
              <span className={`reportes__kpi-estado reportes__kpi-estado--${estados.estres.tone}`}>{estados.estres.label}</span>
            </div>
            <div className="reportes__kpi">
              <span className="reportes__kpi-icon reportes__kpi-icon--lecturas">
                <Activity size={17} strokeWidth={1.8} />
              </span>
              <span className="reportes__kpi-label">Lecturas</span>
              <span className="reportes__kpi-value">{metricas.totalLecturas}</span>
              <span className={`reportes__kpi-estado reportes__kpi-estado--${metricas.totalLecturas > 0 ? 'success' : 'neutral'}`}>{metricas.totalLecturas > 0 ? 'Activo' : 'Sin datos'}</span>
            </div>
            <div className="reportes__kpi">
              <span className="reportes__kpi-icon reportes__kpi-icon--riesgo">
                <ShieldAlert size={17} strokeWidth={1.8} />
              </span>
              <span className="reportes__kpi-label">Riesgo máximo</span>
              <span className="reportes__kpi-value">{metricas.riesgoMax != null ? `${formatearNumero(metricas.riesgoMax * 100)}%` : '—'}</span>
              <span className={`reportes__kpi-estado reportes__kpi-estado--${estados.riesgo.tone}`}>{estados.riesgo.label}</span>
            </div>
            <div className="reportes__kpi">
              <span className="reportes__kpi-icon reportes__kpi-icon--eventos">
                <BellRing size={17} strokeWidth={1.8} />
              </span>
              <span className="reportes__kpi-label">Eventos</span>
              <span className="reportes__kpi-value">{metricas.totalEventos} <small>{metricas.criticos > 0 ? `${metricas.criticos} crítico${metricas.criticos === 1 ? '' : 's'}` : 'sin críticos'}</small></span>
              <span className={`reportes__kpi-estado reportes__kpi-estado--${metricas.criticos > 0 ? 'danger' : metricas.totalEventos > 0 ? 'warning' : 'neutral'}`}>
                {metricas.criticos > 0 ? 'Con críticos' : metricas.totalEventos > 0 ? 'Monitoreado' : 'Sin eventos'}
              </span>
            </div>
          </div>

          {/* Lecturas por hora/día con gráfica */}
          {metricas.totalLecturas > 0 && (
            <ContentCard className="reportes__tabla-card">
              <div className="reportes__card-title-row" style={{ marginBottom: 12 }}>
                <Activity size={iconSize} strokeWidth={1.8} style={{ color: 'var(--warning)' }} />
                <h3>{reporte.esDia ? 'Lecturas por hora' : 'Lecturas por día'}</h3>
                <StatusBadge label={`${metricas.totalLecturas} lecturas`} variant="info" />
              </div>
              <div className="reportes__chart">
                {filasResumen.map((f) => (
                  <div className="reportes__chart-col" key={f.grupo}>
                    <div className="reportes__chart-track">
                      <div
                        className="reportes__chart-bar"
                        style={{
                          height: `${Math.max(2, Math.round(f.riesgo * 100))}%`,
                          backgroundColor: f.riesgo < 0.3 ? 'var(--success)' : f.riesgo < 0.7 ? 'var(--warning)' : 'var(--danger)',
                        }}
                        title={`${f.grupo}: riesgo ${formatearNumero(f.riesgo * 100)}%`}
                      />
                    </div>
                    <span className="reportes__chart-label">{f.grupo}</span>
                  </div>
                ))}
              </div>
              <p className="reportes__chart-caption">
                Riesgo de pico glucémico máximo por {reporte.esDia ? 'hora' : 'día'} (%)
                <span> · verde: bajo · ámbar: moderado · rojo: alto</span>
              </p>
              <div className="reportes__tabla-wrap">
                <table className="reportes__tabla">
                  <thead>
                    <tr>
                      <th>{reporte.esDia ? 'Hora' : 'Fecha'}</th>
                      <th>Lecturas</th>
                      <th>Pulso prom.</th>
                      <th>Temp. prom.</th>
                      <th>Estrés prom.</th>
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
                        <td>{formatearNumero(f.estres, 0)} %</td>
                        <td className={f.riesgo >= 0.7 ? 'reportes__tabla-critico' : undefined}>{formatearNumero(f.riesgo * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ContentCard>
          )}

          {/* Análisis ML */}
          {cargandoPredicciones ? (
            <ContentCard className="reportes__ml-card">
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando análisis ML...</p>
            </ContentCard>
          ) : prediccionActual ? (
            <div className="reportes__ml-section">
              <div className="reportes__card-title-row" style={{ marginBottom: 16 }}>
                <span className="reportes__kpi-icon reportes__kpi-icon--ml">
                  <Brain size={iconSize} strokeWidth={1.8} />
                </span>
                <h3>Análisis ML - Predicción de Pico Glucémico</h3>
              </div>
              <div className="reportes__ml-grid">
                <PrediccionMlCard prediccion={prediccionActual} />
              </div>
            </div>
          ) : null}

          {/* Eventos y alertas */}
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

          {/* Conclusión */}
          <div className="reportes__conclusion">
            <h3>Conclusión</h3>
            <p>{conclusion}</p>
          </div>

          <div className="reportes__footer">
            <span>Generado por BioGuard</span>
            <span className="reportes__footer-note">Documento informativo de monitoreo, no sustituye un diagnóstico médico.</span>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
