import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Crown, AlertTriangle, Shield, Receipt, Calendar } from 'lucide-react';
import { LoadingSpinner, Button } from '../../components/ui';
import { pagoService, usuarioService } from '../../services';
import { PlanResponse, PagoResponse, ReciboResponse } from '../../types';
import { ROUTES } from '../../constants';
import styles from './Facturacion.module.css';

export default function FacturacionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [historial, setHistorial] = useState<PagoResponse[]>([]);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelMsg, setCancelMsg] = useState('');
  const [reciboId, setReciboId] = useState('');
  const [reciboData, setReciboData] = useState<ReciboResponse | null>(null);

  const load = async () => {
    try {
      const [p, h] = await Promise.all([
        usuarioService.miPlan(),
        pagoService.historial(),
      ]);
      setPlan(p);
      setHistorial(Array.isArray(h) ? h : []);
    } catch {
      setPlan(null);
      setHistorial([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async () => {
    try {
      await pagoService.cancelar();
      setCancelMsg('Suscripcion cancelada correctamente');
      setTimeout(() => { setShowCancel(false); load(); }, 1500);
    } catch (err: any) {
      setCancelMsg(err?.message || 'Error al cancelar');
    }
  };

  const handleRecibo = async (id: string) => {
    if (reciboId === id) { setReciboId(''); setReciboData(null); return; }
    try {
      const r = await pagoService.recibo(id);
      setReciboData(r);
      setReciboId(id);
    } catch {
      setReciboData(null);
    }
  };

  if (loading) return <LoadingSpinner />;

  const planName = plan?.nombre || 'Gratis';
  const planPrice = plan?.precio ?? 0;
  const planMoneda = plan?.precioMoneda || 'MXN';
  const proximoPago = historial.length > 0 && historial[0].estado === 'completado'
    ? new Date(historial[0].fechaPago).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })
    : null;

  return (
    <div>
      <h1 className={styles.pageTitle}>Centro de Facturacion y Suscripcion</h1>
      <p className={styles.pageSubtitle}>Gestiona tu plan, metodos de pago e historial de transacciones</p>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Crown size={16} style={{ color:'var(--color-cyan)',verticalAlign:'middle',marginRight:6 }} />
              Suscripcion Activa
            </div>
            <span className={styles.planBadge}>
              <span style={{ width:8,height:8,borderRadius:'50%',background:'var(--color-success)' }}/>
              Activa
            </span>
          </div>

          <div className={styles.planName}>Plan {planName}</div>
          <div className={styles.planPrice}>
            {planPrice === 0 ? 'Gratis' : `$${planPrice} ${planMoneda}`}
          </div>
          <div className={styles.planPeriod}>
            {planPrice === 0 ? 'Acceso gratuito ilimitado' : 'Facturacion mensual'}
          </div>

          {proximoPago && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'var(--color-bg-tertiary)',borderRadius:8,marginBottom:12 }}>
              <Calendar size={16} style={{ color:'var(--color-text-muted)' }}/>
              <span style={{ fontSize:'0.84rem',color:'var(--color-text-secondary)' }}>Proximo pago: <strong style={{ color:'var(--color-text-primary)' }}>{proximoPago}</strong></span>
            </div>
          )}

          {plan && (
            <>
              <div className={styles.planRow}>
                <span className={styles.planLabel}>Pacientes incluidos</span>
                <span className={styles.planValue}>{plan.limitePacientes}</span>
              </div>
              <div className={styles.planRow}>
                <span className={styles.planLabel}>Cuidadores permitidos</span>
                <span className={styles.planValue}>{plan.limiteCuidadores}</span>
              </div>
              <div className={styles.planRow}>
                <span className={styles.planLabel}>Historial de datos</span>
                <span className={styles.planValue}>{plan.diasHistorial} dias</span>
              </div>
              <div className={styles.planRow}>
                <span className={styles.planLabel}>GPS Continuo</span>
                <span className={styles.planValue} style={{ color: plan.gpsContinuo ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  {plan.gpsContinuo ? 'Incluido' : 'No incluido'}
                </span>
              </div>
              <div className={styles.planRow}>
                <span className={styles.planLabel}>Consola IA</span>
                <span className={styles.planValue} style={{ color: plan.aiConsole ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                  {plan.aiConsole ? 'Incluida' : 'No incluida'}
                </span>
              </div>
            </>
          )}

          <div className={styles.actionRow}>
            <Button size="sm" onClick={() => navigate(ROUTES.LICENCIAMIENTOS)}>Cambiar plan</Button>
            {planPrice > 0 && (
              <button onClick={() => { setShowCancel(true); setCancelMsg(''); }}
                style={{ padding:'6px 16px',background:'var(--color-danger-bg)',border:'1px solid rgba(255,82,82,0.2)',borderRadius:8,color:'var(--color-danger)',cursor:'pointer',fontFamily:'var(--font-sans)',fontSize:'0.85rem',fontWeight:500 }}>
                Cancelar suscripcion
              </button>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <CreditCard size={16} style={{ color:'var(--color-cyan)',verticalAlign:'middle',marginRight:6 }} />
              Metodos de Pago
            </div>
            <span style={{ fontSize:'0.7rem',display:'flex',alignItems:'center',gap:4,color:'var(--color-text-muted)' }}>
              <Shield size={12}/> Cifrado SSL
            </span>
          </div>

          {historial.filter(p => p.metodoPago && p.estado === 'completado').length > 0 ? (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              {[...new Map(historial.filter(p => p.metodoPago && p.estado === 'completado').map(p => [p.metodoPago, p])).values()].slice(0, 3).map((p, i) => (
                <div key={i} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--color-bg-tertiary)',borderRadius:8 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                    <div style={{ width:38,height:26,borderRadius:4,background:'var(--color-bg-hover)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <CreditCard size={16} style={{ color:'var(--color-cyan)' }}/>
                    </div>
                    <div>
                      <div style={{ fontSize:'0.84rem',fontWeight:500 }}>{p.metodoPago === 'tarjeta' ? 'Tarjeta' : p.metodoPago}</div>
                      <div style={{ fontSize:'0.75rem',color:'var(--color-text-muted)' }}>Ultimo pago: {new Date(p.fechaPago).toLocaleDateString('es-MX')}</div>
                    </div>
                  </div>
                  <span style={{ fontSize:'0.72rem',color:'var(--color-success)',fontWeight:500 }}>Predeterminado</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <CreditCard size={36} style={{ opacity:0.25,marginBottom:10 }} />
              <div>Sin metodos de pago</div>
              <div style={{ fontSize:'0.78rem',marginTop:4 }}>Los metodos de pago se registran al realizar tu primer pago con Stripe</div>
              <div style={{ marginTop:14 }}>
                <Button size="sm" variant="secondary" onClick={() => navigate(ROUTES.LICENCIAMIENTOS)}>
                  Elegir plan y pagar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <Receipt size={16} style={{ color:'var(--color-cyan)',verticalAlign:'middle',marginRight:6 }} />
            Historial de Transacciones
          </div>
          <span style={{ fontSize:'0.78rem',color:'var(--color-text-muted)' }}>{historial.length} transacciones</span>
        </div>

        {historial.length === 0 ? (
          <div className={styles.empty}>
            <Receipt size={36} style={{ opacity:0.25,marginBottom:10 }} />
            <div>Aun no hay transacciones</div>
            <div style={{ fontSize:'0.78rem',marginTop:4 }}>Tu historial de pagos aparecera aqui cuando realices tu primera suscripcion</div>
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span className={styles.colDate}>Fecha</span>
              <span className={styles.colDetail}>Metodo</span>
              <span className={styles.colAmount}>Monto</span>
              <span className={styles.colStatus}>Estado</span>
              <span className={styles.colAction}></span>
            </div>
            {historial.map(p => (
              <div key={p.id}>
                <div className={styles.tableRow}>
                  <span className={styles.colDate}>
                    {new Date(p.fechaPago).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}
                  </span>
                  <span className={styles.colDetail} style={{ textTransform:'capitalize' }}>
                    {p.metodoPago === 'tarjeta' ? 'Tarjeta de credito/debito' : p.metodoPago === 'stripe' ? 'Stripe' : p.metodoPago}
                  </span>
                  <span className={styles.colAmount}>${p.monto} {p.moneda}</span>
                  <span className={styles.colStatus}>
                    <span className={`${styles.statusBadge} ${
                      p.estado === 'completado' ? styles.statusCompletado :
                      p.estado === 'pendiente' ? styles.statusPendiente :
                      styles.statusCancelado
                    }`}>
                      {p.estado === 'completado' ? 'Pagado' :
                       p.estado === 'pendiente' ? 'Pendiente' :
                       p.estado === 'cancelado' ? 'Cancelado' :
                       p.estado === 'reembolsado' ? 'Reembolsado' : p.estado}
                    </span>
                  </span>
                  <span className={styles.colAction}>
                    <button className={styles.rowBtn} onClick={() => handleRecibo(p.id)}>
                      {reciboId === p.id ? 'Ocultar' : 'Recibo'}
                    </button>
                  </span>
                </div>
                {reciboId === p.id && reciboData && (
                  <div style={{ padding:'10px 14px',marginBottom:4,background:'var(--color-bg-tertiary)',borderRadius:6,fontSize:'0.82rem',color:'var(--color-text-secondary)' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                      <span>ID: {reciboData.pagoId}</span>
                      <span>{new Date(reciboData.fechaPago).toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}</span>
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between' }}>
                      <span>Monto: ${reciboData.monto} {reciboData.moneda}</span>
                      <span style={{ color:'var(--color-cyan)',fontSize:'0.78rem' }}>Descarga: {reciboData.descargaUrl}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCancel && (
        <div className={styles.modalOverlay} onClick={() => { if (!cancelMsg.includes('correctamente')) setShowCancel(false); }}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
              <AlertTriangle size={22} style={{ color:'var(--color-warning)' }}/>
              <h3 className={styles.modalTitle}>Cancelar suscripcion</h3>
            </div>
            <p className={styles.modalText}>
              Estas a punto de cancelar tu plan <strong style={{ color:'var(--color-cyan)' }}>{planName}</strong>.
              Perderas acceso a las funciones premium. Esta accion no se puede deshacer.
            </p>
            {cancelMsg && (
              <p style={{ padding:10,background:cancelMsg.includes('correctamente')?'var(--color-success-bg)':'var(--color-danger-bg)',borderRadius:6,fontSize:'0.84rem',marginBottom:12,
                color:cancelMsg.includes('correctamente')?'var(--color-success)':'var(--color-danger)' }}>
                {cancelMsg}
              </p>
            )}
            <div className={styles.modalActions}>
              <Button variant="secondary" size="sm" onClick={() => setShowCancel(false)}
                disabled={cancelMsg.includes('correctamente')}>Volver</Button>
              <Button variant="danger" size="sm" onClick={handleCancel}
                disabled={cancelMsg.includes('correctamente')}>Confirmar cancelacion</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
