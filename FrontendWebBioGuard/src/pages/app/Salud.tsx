import { useState, useEffect } from 'react';
import { Heart, Thermometer, Droplets, Brain, FileText, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { LoadingSpinner } from '../../components/ui';
import { sensorService, reporteService, mlService, pacienteService } from '../../services';
import httpClient from '../../utils/httpClient';
import { useAuth } from '../../context';
import { EstadisticasResponse, TendenciaItem, EventoMetabolicoResponse, PacienteResponse } from '../../types';
import styles from './Salud.module.css';

type Periodo = '7d' | '30d' | 'historial';

export default function SaludPage() {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EstadisticasResponse | null>(null);
  const [tendencias, setTendencias] = useState<TendenciaItem[]>([]);
  const [eventos, setEventos] = useState<EventoMetabolicoResponse[]>([]);
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [recomendaciones, setRecomendaciones] = useState<string[]>([]);
  const [prediccionActual, setPrediccionActual] = useState<any>(null);
  const [medicamentos, setMedicamentos] = useState<any[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const pac = await pacienteService.miPaciente();
        if (cancelled || !pac) { setLoading(false); return; }
        setPaciente(pac);
        const p = periodo === '7d' ? 'semanal' : periodo === '30d' ? 'mensual' : 'mensual';
        const [s, t, ev, rec, pred, med] = await Promise.all([
          sensorService.getEstadisticas(pac.id),
          sensorService.getTendencia(pac.id, p),
          sensorService.getEventos(pac.id, 20),
          mlService.getRecomendaciones(pac.id).catch(() => null),
          mlService.getPrediccionActual(pac.id).catch(() => null),
          reporteService.getHistorialMedicamentos(pac.id).catch(() => []),
        ]);
        if (cancelled) return;
        setStats(s);
        setTendencias(t);
        setEventos(ev);
        if (rec && rec.recomendaciones) setRecomendaciones(rec.recomendaciones);
        if (pred && pred.probabilidad !== undefined) setPrediccionActual(pred);
        setMedicamentos(med || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [periodo]);

  const getNivelClass = (n: string) => {
    if (!n) return styles.levelNormal;
    const l = n.toLowerCase();
    if (l.includes('cr') || l.includes('critico')) return styles.levelCritico;
    if (l.includes('pre') || l.includes('pico')) return styles.levelPrePico;
    return styles.levelNormal;
  };

  const chartData = tendencias.length ? {
    pulso: tendencias.map((d, i) => ({ x: (i / Math.max(tendencias.length - 1, 1)) * 100, y: 100 - (d.pulsoBpm / 200) * 100 })),
    temp: tendencias.map((d, i) => ({ x: (i / Math.max(tendencias.length - 1, 1)) * 100, y: 100 - ((d.temperaturaC - 30) / 15) * 100 })),
  } : null;

  const handleExportPDF = async () => {
    if (!paciente) return;
    setReportLoading(true);
    setReportMsg('');
    try {
      const ahora = new Date();
      let desde: Date;
      if (periodo === '7d') desde = new Date(ahora.getTime() - 7 * 86400000);
      else if (periodo === '30d') desde = new Date(ahora.getTime() - 30 * 86400000);
      else desde = new Date(ahora.getTime() - 90 * 86400000);

      const desdeStr = desde.toISOString();
      const hastaStr = ahora.toISOString();
      const response = await httpClient.get(`/api/Sensores/lecturas/${paciente.id}/rango?desde=${desdeStr}&hasta=${hastaStr}`);
      const lecturas = response.data as any[];
      const dataRows = Array.isArray(lecturas) ? lecturas.map((l: any) => [l.timestamp, l.pulsoBpm, l.temperaturaC, l.sudoracionGsr, l.probabilidadPico]) : [];

      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const headers = ['Hora', 'Pulso', 'Temp', 'Sudor', 'IA'];
      let y = 15;

      pdf.setFillColor(7, 17, 29);
      pdf.rect(0, 0, w, 22, 'F');
      pdf.setTextColor(45, 156, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('BioGuard', 15, 13);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Reporte de Salud', 15, 18);

      y = 30;
      pdf.setTextColor(7, 17, 29);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Paciente: ${paciente.nombre}`, 15, y);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`ID: ${paciente.id.slice(0, 16)}...`, 15, y + 5);
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`, 15, y + 10);
      pdf.text(`Registros: ${dataRows.length}`, 15, y + 15);

      y += 22;

      if (tieneDatos && stats) {
        pdf.setFillColor(240, 244, 255);
        pdf.rect(15, y - 4, w - 30, 22, 'F');
        pdf.setTextColor(45, 156, 255);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Pulso Cardiaco', w / 2, y + 1, { align: 'center' });
        pdf.setTextColor(7, 17, 29);
        pdf.setFontSize(18);
        pdf.text(`${stats.ultimoPulso} BPM`, w / 2, y + 12, { align: 'center' });
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Promedio: ${Math.round(stats.promedioPulso)} BPM  |  Temp: ${stats.ultimaTemperatura?.toFixed(1) ?? '--'}°C`, w / 2, y + 19, { align: 'center' });
        y += 26;
      }

      if (dataRows.length > 0) {
        const colWs = [45, 25, 25, 25, 30];
        const headerH = 7;
        pdf.setFillColor(45, 156, 255);
        pdf.rect(15, y, w - 30, headerH, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        headers.forEach((h, i) => {
          const x = 15 + colWs.slice(0, i).reduce((a, b) => a + b, 0);
          pdf.text(h, x + 2, y + 5);
        });

        y += headerH;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(55, 65, 81);
        dataRows.slice(0, 50).forEach((row, ri) => {
          if (y > 270) { pdf.addPage(); y = 15; }
          if (ri % 2 === 0) { pdf.setFillColor(245, 247, 250); pdf.rect(15, y, w - 30, 6, 'F'); }
          const cols = row;
          if (cols.length >= 4) {
            const ts = cols[0].length > 15 ? cols[0].slice(11, 19) : cols[0];
            const vals = [ts, cols[1] || '', cols[2] || '', cols[3] || '', cols[4] || ''];
            vals.forEach((c, ci) => {
              const x = 15 + colWs.slice(0, ci).reduce((a, b) => a + b, 0);
              pdf.text(c, x + 2, y + 4.5);
            });
          }
          y += 6;
        });
      } else {
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(10);
        pdf.text('Sin datos registrados. Vincula un dispositivo wearable para comenzar a recibir lecturas.', 15, y + 5);
      }

      pdf.save(`reporte-bioguard-${paciente.nombre.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      setReportMsg('PDF descargado exitosamente');
      setTimeout(() => setReportMsg(''), 3000);
    } catch (err: any) {
      console.error('Error reporte:', err);
      setReportMsg('Error al generar el reporte');
      setTimeout(() => setReportMsg(''), 3000);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const tieneDatos = stats && typeof stats.ultimoPulso === 'number';

  const pulsoTrend = tieneDatos ? (stats.ultimoPulso > stats.promedioPulso * 1.05 ? 'up' : stats.ultimoPulso < stats.promedioPulso * 0.95 ? 'down' : 'stable') : 'stable';

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Analisis Clinico Avanzado y Reportes de Salud</h1>
        <p className={styles.subtitle}>
          {paciente ? <>Monitoreo de <strong style={{ color: 'var(--color-cyan)' }}>{paciente.nombre}</strong> - Plan {user?.plan || 'Gratis'}</> : 'Vincula un paciente para ver datos de salud'}
        </p>
      </div>

      <div className={styles.headerRow}>
        <div className={styles.periodSelector}>
          {(['7d','30d','historial'] as Periodo[]).map((p) => (
            <button key={p} className={`${styles.periodBtn} ${periodo === p ? styles.periodBtnActive : ''}`} onClick={() => setPeriodo(p)}>
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : 'Historial'}
            </button>
          ))}
        </div>
        <button onClick={handleExportPDF}
          style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 18px',background:'var(--gradient-cyan-blue)',border:'none',borderRadius:8,color:'#fff',cursor:'pointer',fontFamily:'var(--font-sans)',fontSize:'0.85rem',fontWeight:500,opacity:reportLoading||!paciente?0.6:1 }}
          disabled={!paciente || reportLoading}>
          <FileText size={16} /> {reportLoading ? 'Generando...' : 'Generar reporte completo'}
        </button>
      </div>

      {reportMsg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: reportMsg.includes('Error') ? 'rgba(255,82,82,0.08)' : 'rgba(0,230,118,0.08)', border: `1px solid ${reportMsg.includes('Error') ? 'rgba(255,82,82,0.2)' : 'rgba(0,230,118,0.2)'}`, borderRadius: 10, color: reportMsg.includes('Error') ? '#ff5252' : '#00e676', fontSize: '0.85rem' }}>
          {reportMsg}
        </div>
      )}

      <div className={styles.grid2}>
        <div className={styles.healthCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <div className={styles.cardIcon} style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}><Heart size={16} /></div>
              Pulso Cardiaco
            </div>
            <span className={`${styles.trendBadge} ${pulsoTrend==='up'?styles.trendUp:pulsoTrend==='down'?styles.trendDown:styles.trendStable}`}>
              {pulsoTrend==='up'?<TrendingUp size={14}/>:pulsoTrend==='down'?<TrendingDown size={14}/>:<Minus size={14}/>}
              {tieneDatos ? (pulsoTrend==='up'?'Elevado':pulsoTrend==='down'?'Bajo':'Estable') : 'Sin datos'}
            </span>
          </div>
          <div className={styles.bigValue}>{tieneDatos && stats.ultimoPulso ? stats.ultimoPulso : '--'}<span className={styles.bigUnit}>BPM</span></div>
          <div className={styles.subValue}>Promedio: {stats?.promedioPulso ? Math.round(stats.promedioPulso) : '--'} BPM</div>
          {chartData && (
            <div className={styles.chartArea}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width:'100%',height:'100%' }}>
                <polyline fill="none" stroke="var(--color-danger)" strokeWidth="0.25" vectorEffect="non-scaling-stroke" points={chartData.pulso.map(p => `${p.x},${p.y}`).join(' ')} />
              </svg>
            </div>
          )}
        </div>

        <div className={styles.healthCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <div className={styles.cardIcon} style={{ background: 'var(--color-cyan-glow)', color: 'var(--color-cyan)' }}><Thermometer size={16} /></div>
              Temperatura
            </div>
            <span className={`${styles.trendBadge} ${styles.trendStable}`}><Minus size={14} />{tieneDatos ? 'Normal' : 'Sin datos'}</span>
          </div>
          <div className={styles.bigValue}>{stats?.ultimaTemperatura?.toFixed(1) ?? '--'}<span className={styles.bigUnit}>C</span></div>
          <div className={styles.subValue}>Promedio: {stats?.promedioTemperatura?.toFixed(1) ?? '--'} C</div>
          {chartData && (
            <div className={styles.chartArea}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width:'100%',height:'100%' }}>
                <polyline fill="none" stroke="var(--color-cyan)" strokeWidth="0.25" vectorEffect="non-scaling-stroke" points={chartData.temp.map(p => `${p.x},${p.y}`).join(' ')} />
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.healthCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <div className={styles.cardIcon} style={{ background: 'var(--color-purple-glow)', color: 'var(--color-purple)' }}><Droplets size={16} /></div>
              Sudoracion
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:24 }}>
            <div className={styles.gaugeCircle}>
              <svg viewBox="0 0 140 140" style={{ width:'100%',height:'100%',transform:'rotate(-90deg)' }}>
                <circle cx={70} cy={70} r={60} fill="none" stroke="var(--color-bg-tertiary)" strokeWidth={8} />
                <circle cx={70} cy={70} r={60} fill="none" stroke="var(--color-purple)" strokeWidth={8} strokeLinecap="round"
                  strokeDasharray={`${(Math.min(stats?.ultimaSudoracion ?? 0, 100) / 100) * 377} 377`} />
              </svg>
              <div className={styles.gaugeValue}>
                <span className={styles.gaugeNumber}>{stats?.ultimaSudoracion?.toFixed(0) ?? '--'}</span>
                <span className={styles.gaugeLabel}>GSR</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize:'0.82rem',color:'var(--color-text-secondary)',marginBottom:8 }}>
                Nivel: {!tieneDatos ? 'Sin datos' : (stats.ultimaSudoracion ?? 0) > 50 ? 'Elevado' : (stats.ultimaSudoracion ?? 0) > 20 ? 'Moderado' : 'Normal'}
              </div>
              <div style={{ fontSize:'0.82rem',color:'var(--color-text-secondary)',marginBottom:4 }}>Electrolitos: {tieneDatos ? 'Normales' : 'Sin datos'}</div>
              <div style={{ fontSize:'0.78rem',color:'var(--color-text-muted)' }}>{stats?.totalLecturas ?? 0} lecturas totales</div>
            </div>
          </div>
        </div>

        <div className={styles.healthCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <div className={styles.cardIcon} style={{ background: 'var(--color-blue-glow)', color: 'var(--color-blue)' }}><Brain size={16} /></div>
              Notas IA
            </div>
          </div>
          <div className={styles.notesSection}>
            {prediccionActual && (
              <div className={`${styles.noteItem} ${prediccionActual.nivelRiesgo?.toLowerCase().includes('cr') ? styles.noteItemDanger : prediccionActual.nivelRiesgo?.toLowerCase().includes('pre') ? styles.noteItemWarning : styles.noteItemSuccess}`}>
                <div className={styles.noteTitle}>Prediccion: {prediccionActual.nivelRiesgo || 'Normal'}</div>
                <div className={styles.noteText}>Probabilidad: {((prediccionActual.probabilidad || 0) * 100).toFixed(1)}%{prediccionActual.horasEstimadas != null ? ' - Proximas '+prediccionActual.horasEstimadas+'h' : ''}</div>
              </div>
            )}
            {recomendaciones.length > 0 ? recomendaciones.map((r, i) => (
              <div key={i} className={`${styles.noteItem} ${r.toLowerCase().includes('inmediato')||r.toLowerCase().includes('critico')?styles.noteItemDanger:r.toLowerCase().includes('hidrat')||r.toLowerCase().includes('evitar')?styles.noteItemWarning:styles.noteItemInfo}`}>
                <div className={styles.noteText}>{r}</div>
              </div>
            )) : (
              <div className={styles.noteItem}><div className={styles.noteText} style={{ color:'var(--color-text-muted)' }}>Sin recomendaciones de IA disponibles. Conecta mas datos para obtener analisis.</div></div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.healthCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}><Activity size={18} style={{ color:'var(--color-warning)' }} />Eventos Metabolicos Recientes</div>
          </div>
          {eventos.length === 0 ? (
            <div style={{ padding:20,textAlign:'center',color:'var(--color-text-muted)',fontSize:'0.85rem' }}>No hay eventos registrados</div>
          ) : (
            <div className={styles.eventsList}>
              {eventos.slice(0,8).map(ev => (
                <div key={ev.id} className={styles.eventItem}>
                  <span>{new Date(ev.fechaEvento).toLocaleDateString('es-MX',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
                  <span className={`${styles.eventLevel} ${getNivelClass(ev.nivelRiesgo)}`}>{ev.nivelRiesgo}</span>
                  <span>{ev.atendida?'Atendido':'Pendiente'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.healthCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}><FileText size={18} style={{ color:'var(--color-cyan)' }} />Medicamentos</div>
          </div>
          {medicamentos.length === 0 ? (
            <div style={{ padding:20,textAlign:'center',color:'var(--color-text-muted)',fontSize:'0.85rem' }}>Sin medicamentos registrados</div>
          ) : (
            <div className={styles.medList}>
              {medicamentos.map((m: any) => (
                <div key={m.id} className={styles.medItem}>
                  <div className={styles.medInfo}>
                    <span className={styles.medName}>{m.nombre}</span>
                    <span className={styles.medDose}>{m.dosis} - {m.horario}</span>
                  </div>
                  <span className={m.activo ? styles.medActive : styles.medInactive}>{m.activo?'Activo':'Inactivo'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
