import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, AlertTriangle, Camera, Lock } from 'lucide-react';
import { LoadingSpinner, Button } from '../../components/ui';
import { usuarioService, authService } from '../../services';
import { useAuth } from '../../context';
import { UsuarioPerfilResponse } from '../../types';
import { ROUTES } from '../../constants';
import styles from './Ajustes.module.css';

export default function AjustesPage() {
  const { user, logout, setPhotoUrl, photoUrl } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<UsuarioPerfilResponse | null>(null);
  const [formNombre, setFormNombre] = useState({ nombre: '', apellidoPaterno: '', apellidoMaterno: '' });
  const [formCorreo, setFormCorreo] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [msg, setMsg] = useState('');
  const [passForm, setPassForm] = useState({ actual: '', nueva: '' });
  const [passMsg, setPassMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usuarioService.miPerfil().then(p => {
      setPerfil(p);
      setFormNombre({ nombre: p.nombre, apellidoPaterno: p.apellidoPaterno, apellidoMaterno: p.apellidoMaterno || '' });
      if (p.fotoPerfil) setPhotoUrl(p.fotoPerfil);
    }).finally(() => setLoading(false));
  }, []);

  const handleSavePerfil = async () => {
    if (!formNombre.nombre || !formNombre.apellidoPaterno) { setMsg('Nombre y apellido paterno son obligatorios'); return; }
    try { await usuarioService.editarPerfil(formNombre); setMsg('Perfil actualizado correctamente'); setPerfil(p => p ? { ...p, ...formNombre } : p); }
    catch (err: any) { setMsg(err?.message || 'Error al guardar'); }
  };

  const handleSaveCorreo = async () => {
    if (!formCorreo || !/\S+@\S+\.\S+/.test(formCorreo)) { setMsg('Correo electrónico inválido'); return; }
    try { await usuarioService.cambiarCorreo({ nuevoCorreo: formCorreo }); setMsg('Correo actualizado correctamente'); setFormCorreo(''); }
    catch (err: any) { setMsg(err?.message || 'Error al cambiar correo'); }
  };

  const handleChangePass = async () => {
    if (!passForm.actual || !passForm.nueva || passForm.nueva.length < 8) { setPassMsg('Ambos campos obligatorios. Mínimo 8 caracteres.'); return; }
    try { await authService.cambiarPassword({ passwordActual: passForm.actual, nuevaPassword: passForm.nueva }); setPassMsg('Contraseña actualizada'); setPassForm({ actual: '', nueva: '' }); }
    catch (err: any) { setPassMsg(err?.message || 'Error'); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg('La imagen no debe superar 2MB'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try { await usuarioService.subirFoto(base64); setPhotoUrl(reader.result as string); setMsg('Foto actualizada'); }
      catch (err: any) { setMsg(err?.message || 'Error al subir foto'); }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    try { await usuarioService.eliminarCuenta(); logout(); navigate(ROUTES.LOGIN); }
    catch (err: any) { setMsg(err?.message || 'Error al eliminar cuenta'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Ajustes de Cuenta</h1>
      <p className={styles.subtitle}>Configuración de tu perfil · {user?.nombre}</p>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}><Camera size={18} style={{ color: '#2D9CFF' }} /> Foto de Perfil</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: photoUrl ? 'transparent' : 'rgba(45,156,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid rgba(45,156,255,0.2)' }}>
              {photoUrl ? <img src={photoUrl} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={36} style={{ color: '#2D9CFF', opacity: 0.5 }} />}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <Button size="sm" onClick={() => fileRef.current?.click()}>{photoUrl ? 'Cambiar foto' : 'Subir foto'}</Button>
            {msg && msg.includes('Foto') && <span className={msg.includes('Error') ? styles.error : styles.success}>{msg}</span>}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}><User size={18} style={{ color: '#2D9CFF' }} /> Editar Perfil</div>
          <div className={styles.formGroup}>
            <div className={styles.field}><div className={styles.label}>Nombre</div><input className={styles.input} value={formNombre.nombre} onChange={e => setFormNombre({ ...formNombre, nombre: e.target.value })} placeholder="Tu nombre" /></div>
            <div className={styles.field}><div className={styles.label}>Apellido Paterno</div><input className={styles.input} value={formNombre.apellidoPaterno} onChange={e => setFormNombre({ ...formNombre, apellidoPaterno: e.target.value })} placeholder="Apellido paterno" /></div>
            <div className={styles.field}><div className={styles.label}>Apellido Materno</div><input className={styles.input} value={formNombre.apellidoMaterno} onChange={e => setFormNombre({ ...formNombre, apellidoMaterno: e.target.value })} placeholder="Opcional" /></div>
            {msg && !msg.includes('Foto') && !msg.includes('correo') && !msg.includes('Contra') && <span className={msg.includes('Error') || msg.includes('obligatorios') ? styles.error : styles.success}>{msg}</span>}
            <Button size="sm" onClick={handleSavePerfil}>Guardar cambios</Button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}><Mail size={18} style={{ color: '#2D9CFF' }} /> Cambiar Correo</div>
          <div className={styles.formGroup}>
            <div className={styles.field}><div className={styles.label}>Correo actual</div><input className={styles.input} value={perfil?.correo || ''} disabled /></div>
            <div className={styles.field}><div className={styles.label}>Nuevo correo</div><input className={styles.input} value={formCorreo} onChange={e => { setFormCorreo(e.target.value); setMsg(''); }} placeholder="nuevo@correo.com" type="email" /></div>
            {msg && msg.includes('correo') && <span className={msg.includes('Error') || msg.includes('invalido') ? styles.error : styles.success}>{msg}</span>}
            <Button size="sm" onClick={handleSaveCorreo}>Cambiar correo</Button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}><Lock size={18} style={{ color: '#2D9CFF' }} /> Cambiar Contraseña</div>
          <div className={styles.formGroup}>
            <div className={styles.field}><div className={styles.label}>Contraseña actual</div><input className={styles.input} type="password" value={passForm.actual} onChange={e => { setPassForm({ ...passForm, actual: e.target.value }); setPassMsg(''); }} placeholder="........" /></div>
            <div className={styles.field}><div className={styles.label}>Nueva contraseña</div><input className={styles.input} type="password" value={passForm.nueva} onChange={e => { setPassForm({ ...passForm, nueva: e.target.value }); setPassMsg(''); }} placeholder="Minimo 8 caracteres" /></div>
            {passMsg && <span className={passMsg.includes('Error') || passMsg.includes('obligatorios') ? styles.error : styles.success}>{passMsg}</span>}
            <Button size="sm" onClick={handleChangePass}>Actualizar contraseña</Button>
          </div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.dangerZone}`}>
        <div className={styles.cardTitle} style={{ color: '#ff5252' }}><AlertTriangle size={18} /> Zona de Peligro</div>
        <p style={{ fontSize: '0.85rem', color: '#8E9CB8', marginBottom: 16, lineHeight: 1.5 }}>
          Eliminar tu cuenta es permanente. Perderás acceso a todos tus datos, pacientes y configuración.
        </p>
        <button className={styles.deleteBtn} onClick={() => setShowDelete(true)}>Eliminar mi cuenta</button>
      </div>

      {showDelete && (
        <div className={styles.modalOverlay} onClick={() => setShowDelete(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <AlertTriangle size={20} style={{ color: '#ff5252' }} /><h3 className={styles.modalTitle}>Eliminar cuenta</h3>
            </div>
            <p className={styles.modalText}>Esta acción eliminará permanentemente tu cuenta, pacientes, datos biométricos y configuración.</p>
            {msg && <p className={styles.error} style={{ marginBottom: 12 }}>{msg}</p>}
            <div className={styles.modalActions}>
              <Button variant="secondary" size="sm" onClick={() => setShowDelete(false)}>Cancelar</Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>Eliminar definitivamente</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
