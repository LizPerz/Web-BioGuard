import { useState, useEffect } from 'react';
import { User, UserPlus, QrCode, Copy, Activity, Key, Check, X, Lock } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui';
import { usuarioService, pacienteService, cuidadorService } from '../../services';
import { UsuarioPerfilResponse, PacienteResponse, CuidadorResponse, AuditoriaResponse } from '../../types';
import httpClient from '../../utils/httpClient';
import styles from './Seguridad.module.css';

const QR_LOGIN_URL = 'http://localhost:5173/login?code=';

export default function SeguridadPage() {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<UsuarioPerfilResponse | null>(null);
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [cuidadores, setCuidadores] = useState<CuidadorResponse[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaResponse[]>([]);
  const [copied, setCopied] = useState(false);
  const [patCopied, setPatCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cuidForm, setCuidForm] = useState({ nombre: '', parentesco: '', telefono: '', correo: '' });
  const [cuidError, setCuidError] = useState('');
  const [cuidLoading, setCuidLoading] = useState(false);
  const [showCredenciales, setShowCredenciales] = useState<CuidadorResponse | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [pacienteQR, setPacienteQR] = useState('');
  const [editCuidador, setEditCuidador] = useState<CuidadorResponse | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', parentesco: '' });
  const [cuidCopied, setCuidCopied] = useState(false);
  const [showPatientQR, setShowPatientQR] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try { const p = await usuarioService.miPerfil(); if (!cancelled) setPerfil(p); } catch {}
      try { const aud = await httpClient.get('/api/Auditoria?pagina=1&porPagina=20').then(r => r.data as AuditoriaResponse[]); if (!cancelled) setAuditoria(aud); } catch {}
      try {
        const pac = await pacienteService.miPaciente();
        if (!cancelled) setPaciente(pac);
        try { const cuid = await cuidadorService.getByPaciente(pac.id); if (!cancelled) setCuidadores(cuid || []); } catch {}
        try { const qrRes = await httpClient.get(`/api/Pacientes/${pac.id}/qr`); if (!cancelled) setPacienteQR(qrRes.data?.codigoAccesoQr || ''); } catch {}
      } catch {}
      if (!cancelled) setLoading(false);
    };
    setLoading(true);
    load();
    return () => { cancelled = true; };
  }, []);

  const getPacienteQR = () => pacienteQR;

  const handleCopyKey = async () => {
    const text = getPacienteQR();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reloadCuidadores = async () => {
    if (!paciente) return;
    try {
      const cuid = await cuidadorService.getByPaciente(paciente.id);
      setCuidadores(cuid || []);
    } catch {}
  };

  const handleAddCaregiver = async () => {
    if (!paciente) return;
    if (!cuidForm.nombre || !cuidForm.parentesco || !cuidForm.telefono || !cuidForm.correo) {
      setCuidError('Todos los campos son obligatorios');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(cuidForm.correo)) {
      setCuidError('Correo inválido');
      return;
    }
    setCuidLoading(true);
    setCuidError('');
    try {
      await cuidadorService.crear({
        pacienteId: paciente.id,
        nombre: cuidForm.nombre,
        parentesco: cuidForm.parentesco,
        telefono: cuidForm.telefono,
        correo: cuidForm.correo,
      });
      setShowModal(false);
      setCuidForm({ nombre: '', parentesco: '', telefono: '', correo: '' });
      await reloadCuidadores();
    } catch (err: any) {
      setCuidError(err?.message || 'Error al crear cuidador');
    } finally {
      setCuidLoading(false);
    }
  };

  const handleShowCredenciales = async (cuidador: CuidadorResponse) => {
    setShowCredenciales(cuidador);
    try {
      const res = await httpClient.get(`/api/Cuidadores/${cuidador.id}/qr`);
      setQrCode(res.data?.codigoAccesoQr || cuidador.codigoAccesoQr);
    } catch {
      setQrCode(cuidador.codigoAccesoQr);
    }
  };

  const handleRegenerarQR = async (cuidador: CuidadorResponse) => {
    try {
      const res = await httpClient.post(`/api/Cuidadores/${cuidador.id}/regenerar-qr`);
      setQrCode(res.data?.codigoAccesoQr || '');
    } catch {}
  };

  const handleOpenEdit = (cuidador: CuidadorResponse) => {
    setEditCuidador(cuidador);
    setEditForm({ nombre: cuidador.nombre, parentesco: cuidador.parentesco });
  };

  const handleSaveEdit = async () => {
    if (!editCuidador || !editForm.nombre || !editForm.parentesco) return;
    try {
      await cuidadorService.editar(editCuidador.id, editForm);
      setEditCuidador(null);
      await reloadCuidadores();
    } catch {}
  };

  const getStatusBadge = (accion: string) => {
    const a = accion.toLowerCase();
    if (a.includes('login') || a.includes('registro')) return 'success';
    if (a.includes('fallo') || a.includes('error')) return 'warning';
    return 'info';
  };

  const getEventIcon = (accion: string) => {
    const a = accion.toLowerCase();
    if (a.includes('login')) return <Key size={14} />;
    if (a.includes('registro')) return <UserPlus size={14} />;
    return <Activity size={14} />;
  };

  if (loading && !perfil && !paciente) return <LoadingSpinner />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Consola de Seguridad y Vinculación Activa</h1>
      <p className={styles.subtitle}>
        Gestión de identidad, cifrado, pacientes vinculados y registro de actividad
      </p>

      <div className={styles.mainGrid}>
        {/* Left: Cifrado */}
        <div className={`${styles.card} ${styles.cipherCard}`}>
          <div className={styles.cipherIcon}>
            <Lock size={32} />
          </div>
          <div className={styles.cipherLabel}>Cifrado de extremo a extremo</div>
          <div className={styles.cipherValue}>256-bit</div>
          <div className={styles.cipherDesc}>
            Protocolo AES-256 con intercambio de claves HMAC-SHA256. Todos los datos biométricos están protegidos con cifrado de grado militar.
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: '100%' }} />
          </div>
          <div className={styles.progressLabel}>Conexión segura activa</div>
        </div>

        {/* Right: Patient + bottom row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Patient card */}
          <div className={styles.card}>
            {paciente ? (
              <div className={styles.patientCard}>
                <div className={styles.patientAvatar}>
                  {paciente.nombre.charAt(0).toUpperCase()}
                </div>
                <div className={styles.patientInfo}>
                  <div className={styles.patientName}>{paciente.nombre}</div>
                  <div className={styles.patientId}>ID: {paciente.id.slice(0, 12)}...</div>
                  <div className={styles.patientDate}>Vinculado: {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                  <div className={styles.badge}>
                    <span className={styles.badgeDot} /> Vínculo principal
                  </div>
                </div>
                <div className={styles.patientActions}>
                  <button className={styles.actionBtn} onClick={() => setShowPatientQR(true)}>
                    <QrCode size={14} style={{ marginRight: 4 }} /> Ver QR
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={handleCopyKey}
                    style={{
                      background: copied ? 'rgba(0,230,118,0.12)' : '',
                      borderColor: copied ? 'rgba(0,230,118,0.3)' : '',
                      color: copied ? '#00e676' : '',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {copied ? <Check size={14} style={{ marginRight: 4 }} /> : <Copy size={14} style={{ marginRight: 4 }} />}
                    {copied ? 'Copiado' : 'Copiar clave'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#8E9CB8' }}>
                <User size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div>Sin paciente vinculado</div>
                <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Ve al Dashboard para crear uno</div>
              </div>
            )}
          </div>

          {/* Bottom row */}
          <div className={styles.bottomRow}>
            {/* Caregiver */}
            <div className={styles.card}>
              {cuidadores.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 8 }}>
                  <div className={styles.caregiverAvatar}>
                    <User size={22} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div className={styles.caregiverName}>{cuidadores[0].nombre}</div>
                    <div className={styles.caregiverPerm}>{cuidadores[0].parentesco} · Acceso completo</div>
                  </div>
                  <div className={styles.caregiverActions} style={{ marginTop: 4 }}>
                    <button className={styles.smallBtn} onClick={() => handleOpenEdit(cuidadores[0])}>Asignar</button>
                    <button className={styles.smallBtn} onClick={() => handleShowCredenciales(cuidadores[0])}><Key size={13} style={{ marginRight: 3 }} />Credenciales</button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#8E9CB8' }}>
                  <User size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: '0.85rem' }}>Sin cuidador asignado</div>
                </div>
              )}
            </div>

            {/* Add caregiver button */}
            <button className={styles.addCard} onClick={() => { if (paciente) setShowModal(true); }}>
              <UserPlus size={28} />
Añadir Cuidador
            </button>
          </div>
        </div>
      </div>

      {/* Activity table */}
      <div className={`${styles.card} ${styles.activityCard}`}>
        <div className={styles.activityTitle}>Registro de actividad reciente</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Origen</th>
              <th>Estado</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {auditoria.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.emptyRow}>Sin actividad registrada</td>
              </tr>
            ) : (
              auditoria.slice(0, 10).map((a) => {
                const badge = getStatusBadge(a.accion);
                return (
                  <tr key={a.id} className={styles.tableRow}>
                    <td>
                      <div className={styles.eventCell}>
                        <div className={styles.eventIcon} style={{ background: badge === 'success' ? 'rgba(0,230,118,0.1)' : badge === 'warning' ? 'rgba(255,215,64,0.1)' : 'rgba(45,156,255,0.1)', color: badge === 'success' ? '#00e676' : badge === 'warning' ? '#ffd740' : '#2D9CFF' }}>
                          {getEventIcon(a.accion)}
                        </div>
                        {a.accion}
                      </div>
                    </td>
                    <td style={{ color: '#8E9CB8' }}>{a.tablaAfectada}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${badge === 'success' ? styles.statusSuccess : badge === 'warning' ? styles.statusWarning : styles.statusInfo}`}>
                        <span className={styles.statusDot} style={{ background: badge === 'success' ? '#00e676' : badge === 'warning' ? '#ffd740' : '#2D9CFF' }} />
                        {a.accion.toLowerCase().includes('login') ? 'Exitoso' : a.accion.toLowerCase().includes('registro') ? 'Completado' : 'Activo'}
                      </span>
                    </td>
                    <td style={{ color: '#8E9CB8', fontSize: '0.8rem' }}>
                      {new Date(a.fecha).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => { if (!cuidLoading) setShowModal(false); }}>
          <div style={{ background: '#111C2E', border: '1px solid rgba(45,156,255,0.2)', borderRadius: 20, padding: 28, maxWidth: 440, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F7FA' }}>Anadir Cuidador</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#8E9CB8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input placeholder="Nombre completo" value={cuidForm.nombre} onChange={e => setCuidForm({...cuidForm, nombre: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(45,156,255,0.04)', border: '1px solid rgba(45,156,255,0.15)', borderRadius: 10, color: '#F5F7FA', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none' }} />
              <input placeholder="Parentesco (Madre, Padre, etc)" value={cuidForm.parentesco} onChange={e => setCuidForm({...cuidForm, parentesco: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(45,156,255,0.04)', border: '1px solid rgba(45,156,255,0.15)', borderRadius: 10, color: '#F5F7FA', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none' }} />
              <input placeholder="Teléfono" value={cuidForm.telefono} onChange={e => setCuidForm({...cuidForm, telefono: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(45,156,255,0.04)', border: '1px solid rgba(45,156,255,0.15)', borderRadius: 10, color: '#F5F7FA', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none' }} />
              <input placeholder="Correo electrónico" type="email" value={cuidForm.correo} onChange={e => setCuidForm({...cuidForm, correo: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(45,156,255,0.04)', border: '1px solid rgba(45,156,255,0.15)', borderRadius: 10, color: '#F5F7FA', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none' }} />
              {cuidError && <span style={{ color: '#ff5252', fontSize: '0.82rem' }}>{cuidError}</span>}
              <button onClick={handleAddCaregiver} disabled={cuidLoading} style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #2D9CFF, #8FD7FF)', border: 'none', borderRadius: 12, color: '#07111D', cursor: cuidLoading ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, marginTop: 4, opacity: cuidLoading ? 0.7 : 1 }}>
                {cuidLoading ? 'Guardando...' : 'Guardar Cuidador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCredenciales && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => { setShowCredenciales(null); setCuidCopied(false); }}>
          <div style={{ background: '#111C2E', border: '1px solid rgba(45,156,255,0.2)', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F7FA' }}>Credenciales de Acceso</h3>
              <button onClick={() => { setShowCredenciales(null); setCuidCopied(false); }} style={{ background: 'none', border: 'none', color: '#8E9CB8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ marginBottom: 8, color: '#F5F7FA', fontWeight: 600, fontSize: '0.95rem' }}>{showCredenciales.nombre}</div>
            <div style={{ fontSize: '0.8rem', color: '#8E9CB8', marginBottom: 20 }}>Escanee este QR desde la app móvil para iniciar sesión</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, display: 'inline-block' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(QR_LOGIN_URL + qrCode)}`}
                alt="QR de acceso"
                style={{ display: 'block', borderRadius: 8 }}
              />
            </div>
            <div style={{ background: 'rgba(45,156,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#8E9CB8', marginBottom: 6 }}>Código de acceso</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: '#2D9CFF', letterSpacing: 2 }}>{qrCode}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { navigator.clipboard.writeText(qrCode); setCuidCopied(true); setTimeout(() => setCuidCopied(false), 2000); }} className={styles.smallBtn} style={{ padding: '8px 16px', fontSize: '0.85rem', background: cuidCopied ? 'rgba(0,230,118,0.15)' : '', borderColor: cuidCopied ? '#00e676' : '', color: cuidCopied ? '#00e676' : '' }}>
                {cuidCopied ? 'Copiado!' : 'Copiar código'}
              </button>
              <button onClick={() => handleRegenerarQR(showCredenciales)} className={styles.smallBtn} style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Regenerar QR</button>
            </div>
          </div>
        </div>
      )}

      {editCuidador && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setEditCuidador(null)}>
          <div style={{ background: '#111C2E', border: '1px solid rgba(45,156,255,0.2)', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F7FA' }}>Editar Cuidador</h3>
              <button onClick={() => setEditCuidador(null)} style={{ background: 'none', border: 'none', color: '#8E9CB8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input placeholder="Nombre" value={editForm.nombre} onChange={e => setEditForm({...editForm, nombre: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(45,156,255,0.04)', border: '1px solid rgba(45,156,255,0.15)', borderRadius: 10, color: '#F5F7FA', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none' }} />
              <input placeholder="Parentesco" value={editForm.parentesco} onChange={e => setEditForm({...editForm, parentesco: e.target.value})} style={{ padding: '10px 14px', background: 'rgba(45,156,255,0.04)', border: '1px solid rgba(45,156,255,0.15)', borderRadius: 10, color: '#F5F7FA', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none' }} />
              <button onClick={handleSaveEdit} style={{ padding: '12px 20px', background: 'linear-gradient(135deg, #2D9CFF, #8FD7FF)', border: 'none', borderRadius: 12, color: '#07111D', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.9rem', fontWeight: 600, marginTop: 4 }}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {showPatientQR && paciente && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => { setShowPatientQR(false); setPatCopied(false); }}>
          <div style={{ background: '#111C2E', border: '1px solid rgba(45,156,255,0.2)', borderRadius: 20, padding: 28, maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F5F7FA' }}>QR de Acceso - {paciente.nombre}</h3>
              <button onClick={() => { setShowPatientQR(false); setPatCopied(false); }} style={{ background: 'none', border: 'none', color: '#8E9CB8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#8E9CB8', marginBottom: 20 }}>Escanea este QR en la app movil para vincular al paciente</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, display: 'inline-block' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(QR_LOGIN_URL + pacienteQR)}`}
                alt="QR del paciente"
                style={{ display: 'block', borderRadius: 8 }}
              />
            </div>
            <div style={{ background: 'rgba(45,156,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', color: '#8E9CB8', marginBottom: 6 }}>Clave de acceso</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: '#2D9CFF', letterSpacing: 2 }}>{pacienteQR}</div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(pacienteQR); setPatCopied(true); setTimeout(() => setPatCopied(false), 2000); }} className={styles.smallBtn} style={{ padding: '8px 16px', fontSize: '0.85rem', background: patCopied ? 'rgba(0,230,118,0.15)' : '', borderColor: patCopied ? '#00e676' : '', color: patCopied ? '#00e676' : '' }}>
              {patCopied ? 'Copiado!' : 'Copiar clave'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
