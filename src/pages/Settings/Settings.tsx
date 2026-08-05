import { Camera, User, Mail, LockKeyhole, TriangleAlert, Eye, EyeOff, Check, X, ReceiptText, Sun, Moon, Loader2, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { ContentCard } from '../../components/ui/ContentCard';
import { Modal } from '../../components/ui/Modal';
import { PrimaryButton, DangerButton, SecondaryButton } from '../../components/ui/buttons';
import { TextInput, PasswordInput } from '../../components/ui/inputs';
import { getUser, updateSessionUser, clearSession } from '../../lib/auth';
import { useTheme } from '../../lib/use-theme';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getMiPerfil,
  actualizarPerfil,
  cambiarCorreo,
  subirFoto,
  eliminarFoto,
  cambiarPassword,
  eliminarMiCuenta,
  ApiError,
} from '../../lib/api';
import './Settings.css';

interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  noSpaces: boolean;
}

type SectionStatus = 'idle' | 'success' | 'error';

interface SectionFeedback {
  status: SectionStatus;
  message: string;
}

const feedbackStyles: Record<SectionStatus, React.CSSProperties> = {
  idle: {},
  success: {
    marginBottom: 14,
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(22, 163, 74, 0.12)',
    border: '1px solid rgba(22, 163, 74, 0.35)',
    color: 'var(--success, #16a34a)',
    fontSize: 13,
  },
  error: {
    marginBottom: 14,
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(220, 38, 38, 0.12)',
    border: '1px solid rgba(220, 38, 38, 0.35)',
    color: 'var(--danger, #dc2626)',
    fontSize: 13,
  },
};

function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
  return err instanceof ApiError ? err.message : fallback;
}

function Feedback({ status, message }: SectionFeedback) {
  if (status === 'idle' || !message) return null;
  return <div style={feedbackStyles[status]}>{message}</div>;
}

export function Settings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const session = getUser();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [firstName, setFirstName] = useState(session?.nombre?.split(' ')[0] ?? '');
  const [lastName, setLastName] = useState('');
  const [maternalLastName, setMaternalLastName] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(session?.fotoPerfil ?? null);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [perfilFeed, setPerfilFeed] = useState<SectionFeedback>({ status: 'idle', message: '' });
  const [correoFeed, setCorreoFeed] = useState<SectionFeedback>({ status: 'idle', message: '' });
  const [fotoFeed, setFotoFeed] = useState<SectionFeedback>({ status: 'idle', message: '' });
  const [passFeed, setPassFeed] = useState<SectionFeedback>({ status: 'idle', message: '' });

  const [savingPerfil, setSavingPerfil] = useState(false);
  const [savingCorreo, setSavingCorreo] = useState(false);
  const [savingFoto, setSavingFoto] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionName = session?.nombre || `${firstName} ${lastName}`.trim() || 'Mi cuenta';

  useEffect(() => {
    let active = true;
    getMiPerfil()
      .then((perfil) => {
        if (!active) return;
        const nombre = perfil.nombre ?? '';
        const apellido = perfil.apellidoPaterno ?? '';
        setFirstName(nombre.split(' ')[0] ?? '');
        setLastName(apellido);
        setMaternalLastName(perfil.apellidoMaterno ?? '');
        setCurrentEmail(perfil.correo ?? '');
        setFotoPerfil(perfil.fotoPerfil ?? null);
        updateSessionUser({
          nombre: `${nombre} ${apellido}`.trim(),
          correo: perfil.correo,
          fotoPerfil: perfil.fotoPerfil ?? null,
        });
      })
      .catch(() => { /* si no hay sesión válida, se dejan los valores actuales */ })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const flashError = useCallback((key: string, msg: string) => {
    if (timers.current[key]) clearTimeout(timers.current[key]);
    setFieldErrors(prev => ({ ...prev, [key]: msg }));
    timers.current[key] = setTimeout(() => {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2000);
  }, []);

  const blockNameKey = (e: React.KeyboardEvent, field: string) => {
    if (e.key === ' ') { e.preventDefault(); flashError(field, 'No se permiten espacios'); }
    if (/[0-9]/.test(e.key)) { e.preventDefault(); flashError(field, 'No se permiten números'); }
  };

  const blockSpaceKey = (e: React.KeyboardEvent, field: string) => {
    if (e.key === ' ') { e.preventDefault(); flashError(field, 'No se permiten espacios'); }
  };

  const iconSize = 16;

  const passChecks: PasswordChecks = {
    minLength: newPass.length >= 8,
    hasUpper: /[A-Z]/.test(newPass),
    hasLower: /[a-z]/.test(newPass),
    hasNumber: /[0-9]/.test(newPass),
    hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPass),
    noSpaces: newPass.length > 0 && !/\s/.test(newPass),
  };

  const allPassChecks = Object.values(passChecks).every(Boolean);
  const canSavePass = allPassChecks && currentPass.length > 0 && newPass.length >= 8;

  const passCheckItems: { key: keyof PasswordChecks; label: string }[] = [
    { key: 'minLength', label: 'Mínimo 8 caracteres' },
    { key: 'hasUpper', label: 'Al menos una mayúscula' },
    { key: 'hasLower', label: 'Al menos una minúscula' },
    { key: 'hasNumber', label: 'Al menos un número' },
    { key: 'hasSymbol', label: 'Al menos un símbolo' },
    { key: 'noSpaces', label: 'Sin espacios' },
  ];

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setPerfilFeed({ status: 'error', message: 'Nombre y apellido paterno son obligatorios' });
      return;
    }
    setSavingPerfil(true);
    setPerfilFeed({ status: 'idle', message: '' });
    try {
      await actualizarPerfil({
        Nombre: firstName.trim(),
        ApellidoPaterno: lastName.trim(),
        ApellidoMaterno: maternalLastName.trim(),
      });
      const nombreCompleto = `${firstName.trim()} ${lastName.trim()}`.trim();
      updateSessionUser({ nombre: nombreCompleto });
      setPerfilFeed({ status: 'success', message: 'Perfil actualizado correctamente' });
    } catch (err) {
      setPerfilFeed({ status: 'error', message: errMsg(err) });
    } finally {
      setSavingPerfil(false);
    }
  };

  const guardarCorreo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSavingCorreo(true);
    setCorreoFeed({ status: 'idle', message: '' });
    try {
      await cambiarCorreo({ NuevoCorreo: newEmail.trim() });
      const correoNuevo = newEmail.trim();
      setCurrentEmail(correoNuevo);
      setNewEmail('');
      updateSessionUser({ correo: correoNuevo });
      setCorreoFeed({ status: 'success', message: 'Correo actualizado correctamente' });
    } catch (err) {
      setCorreoFeed({ status: 'error', message: errMsg(err) });
    } finally {
      setSavingCorreo(false);
    }
  };

  const handleFotoClick = () => fileInputRef.current?.click();

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFotoFeed({ status: 'error', message: 'Solo se permiten imágenes (JPG, PNG, WEBP…)' });
      return;
    }
    if (file.size > 900 * 1024) {
      setFotoFeed({ status: 'error', message: 'La imagen es demasiado grande (máx. 900 KB)' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result);
      setSavingFoto(true);
      setFotoFeed({ status: 'idle', message: '' });
      try {
        await subirFoto({ FotoBase64: base64 });
        setFotoPerfil(base64);
        updateSessionUser({ fotoPerfil: base64 });
        setFotoFeed({ status: 'success', message: 'Foto actualizada correctamente' });
      } catch (err) {
        setFotoFeed({ status: 'error', message: errMsg(err) });
      } finally {
        setSavingFoto(false);
      }
    };
    reader.onerror = () => setFotoFeed({ status: 'error', message: 'No se pudo leer la imagen' });
    reader.readAsDataURL(file);
  };

  const eliminarFotoPerfil = async () => {
    setSavingFoto(true);
    setFotoFeed({ status: 'idle', message: '' });
    try {
      await eliminarFoto();
      setFotoPerfil(null);
      updateSessionUser({ fotoPerfil: null });
      setFotoFeed({ status: 'success', message: 'Foto eliminada correctamente' });
    } catch (err) {
      setFotoFeed({ status: 'error', message: errMsg(err) });
    } finally {
      setSavingFoto(false);
    }
  };

  const guardarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSavePass) {
      setPassFeed({ status: 'error', message: 'Revisa que todos los requisitos de contraseña se cumplan' });
      return;
    }
    setSavingPass(true);
    setPassFeed({ status: 'idle', message: '' });
    try {
      await cambiarPassword({ PasswordActual: currentPass, NuevaPassword: newPass });
      setCurrentPass('');
      setNewPass('');
      setPassFeed({ status: 'success', message: 'Contraseña actualizada correctamente' });
    } catch (err) {
      setPassFeed({ status: 'error', message: errMsg(err) });
    } finally {
      setSavingPass(false);
    }
  };

  const eliminarCuenta = () => {
    setConfirmDeleteOpen(true);
  };

  const confirmarEliminarCuenta = async () => {
    setSavingDelete(true);
    try {
      await eliminarMiCuenta();
      clearSession();
      navigate('/login');
    } catch (err) {
      setConfirmDeleteOpen(false);
      window.alert(errMsg(err, 'No se pudo eliminar la cuenta. Intenta de nuevo.'));
      setSavingDelete(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Ajustes de Cuenta"
        subtitle={`Configuración de tu perfil · ${sessionName}`}
        onBack={() => navigate('/dashboard')}
      />

      <div className="settings__row settings__row--prefs">
        <ContentCard className="settings__pref-card" onClick={() => navigate('/billing')}>
          <div className="settings__pref-row">
            <div className="settings__pref-icon">
              <ReceiptText size={18} strokeWidth={1.8} />
            </div>
            <div className="settings__pref-text">
              <h3 className="settings__card-title">Facturación</h3>
              <p className="settings__pref-desc">Gestiona tu plan y suscripción</p>
            </div>
            <span className="settings__pref-arrow">→</span>
          </div>
        </ContentCard>

        <ContentCard className="settings__pref-card">
          <div className="settings__pref-row">
            <div className="settings__pref-icon">
              {theme === 'light' ? <Moon size={18} strokeWidth={1.8} /> : <Sun size={18} strokeWidth={1.8} />}
            </div>
            <div className="settings__pref-text">
              <h3 className="settings__card-title">Apariencia</h3>
              <p className="settings__pref-desc">Actualmente en modo {theme === 'light' ? 'claro' : 'oscuro'}</p>
            </div>
            <SecondaryButton onClick={toggleTheme}>
              {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            </SecondaryButton>
          </div>
        </ContentCard>
      </div>

      <div className="settings__row settings__row--three">
        <ContentCard id="avatar" className="settings__avatar-card" style={{ scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Camera size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Foto de Perfil</h3>
          </div>
          <div className="settings__avatar-circle">
            {fotoPerfil
              ? <img src={fotoPerfil} alt="Foto de perfil" className="settings__avatar-img" />
              : <User size={36} strokeWidth={1.4} />}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFotoChange}
          />
          <SecondaryButton fullWidth onClick={handleFotoClick} disabled={savingFoto || loadingProfile}>
            {savingFoto ? <Loader2 size={14} strokeWidth={1.8} className="settings__spin" /> : <Camera size={14} strokeWidth={1.8} />}
            {savingFoto ? 'Subiendo…' : 'Cambiar foto'}
          </SecondaryButton>
          {fotoPerfil && (
            <SecondaryButton fullWidth onClick={eliminarFotoPerfil} disabled={savingFoto || loadingProfile} style={{ marginTop: 10 }}>
              <Trash2 size={14} strokeWidth={1.8} />
              Eliminar foto
            </SecondaryButton>
          )}
          <div style={{ marginTop: 10 }}>
            <Feedback {...fotoFeed} />
          </div>
        </ContentCard>

        <ContentCard id="perfil" style={{ scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <User size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Editar Perfil</h3>
          </div>
          <form onSubmit={guardarPerfil}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TextInput label="Nombre" name="firstName" value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => blockNameKey(e, 'profile-firstName')}
                error={fieldErrors['profile-firstName']}
              />
              <TextInput label="Apellido Paterno" name="lastName" value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onKeyDown={(e) => blockNameKey(e, 'profile-lastName')}
                error={fieldErrors['profile-lastName']}
              />
              <TextInput label="Apellido Materno" name="maternalLastName" value={maternalLastName}
                onChange={(e) => setMaternalLastName(e.target.value)}
                onKeyDown={(e) => blockNameKey(e, 'profile-maternal')}
                error={fieldErrors['profile-maternal']}
              />
            </div>
            <Feedback {...perfilFeed} />
            <div style={{ marginTop: 20 }}>
              <PrimaryButton type="submit" fullWidth disabled={savingPerfil || loadingProfile}>
                {savingPerfil ? 'Guardando…' : 'Guardar cambios'}
              </PrimaryButton>
            </div>
          </form>
        </ContentCard>

        <ContentCard id="correo" style={{ scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Mail size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Cambiar Correo</h3>
          </div>
          <form onSubmit={guardarCorreo}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TextInput label="Correo actual" name="currentEmail" value={currentEmail} disabled />
              <TextInput label="Nuevo correo" name="newEmail" placeholder="nuevo@correo.com" value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => blockSpaceKey(e, 'newEmail')}
                error={fieldErrors['newEmail']}
              />
            </div>
            <Feedback {...correoFeed} />
            <div style={{ marginTop: 20 }}>
              <PrimaryButton type="submit" fullWidth disabled={!newEmail.trim() || savingCorreo}>
                {savingCorreo ? 'Guardando…' : 'Cambiar correo'}
              </PrimaryButton>
            </div>
          </form>
        </ContentCard>
      </div>

      <div className="settings__row settings__row--bottom">
        <ContentCard id="password" style={{ flex: 1, maxWidth: 420, scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <LockKeyhole size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Cambiar Contraseña</h3>
          </div>
          <form onSubmit={guardarPassword}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PasswordInput
                label="Contraseña actual" name="currentPassword" placeholder="••••••••"
                showPassword={showCurrent}
                onToggleVisibility={() => setShowCurrent(!showCurrent)}
                eyeIcon={<Eye size={17} strokeWidth={1.8} />}
                eyeOffIcon={<EyeOff size={17} strokeWidth={1.8} />}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
              />
              <PasswordInput
                label="Nueva contraseña" name="newPass" placeholder="Mínimo 8 caracteres"
                showPassword={showNewPass}
                onToggleVisibility={() => setShowNewPass(!showNewPass)}
                eyeIcon={<Eye size={17} strokeWidth={1.8} />}
                eyeOffIcon={<EyeOff size={17} strokeWidth={1.8} />}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                onKeyDown={(e) => blockSpaceKey(e, 'newPass')}
                error={fieldErrors['newPass']}
              />
              {newPass.length > 0 && (
                <div className="register__checks">
                  {passCheckItems.map((item) => (
                    <div key={item.key} className={`register__check ${passChecks[item.key] ? 'register__check--pass' : 'register__check--fail'}`}>
                      {passChecks[item.key] ? <Check size={14} /> : <X size={14} />}
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Feedback {...passFeed} />
            <div style={{ marginTop: 20 }}>
              <PrimaryButton type="submit" fullWidth disabled={!canSavePass || savingPass}>
                {savingPass ? 'Guardando…' : 'Actualizar contraseña'}
              </PrimaryButton>
            </div>
          </form>
        </ContentCard>
      </div>

      <div style={{ marginTop: 32 }}>
        <ContentCard id="peligro" variant="danger" style={{ scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <TriangleAlert size={iconSize} strokeWidth={1.8} style={{ color: 'var(--danger)' }} />
            <h3 className="settings__card-title" style={{ color: 'var(--danger)' }}>Zona de Peligro</h3>
          </div>
          <p className="settings__danger-text">
            Eliminar tu cuenta es permanente. Perderás acceso a todos tus datos, pacientes y configuración.
          </p>
          <div style={{ marginTop: 16 }}>
            <DangerButton onClick={eliminarCuenta} disabled={savingDelete}>
              {savingDelete ? 'Eliminando…' : 'Eliminar mi cuenta'}
            </DangerButton>
          </div>
        </ContentCard>
      </div>

      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Eliminar tu perfil"
        subtitle="Esta acción es permanente y no se puede deshacer"
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.55 }}>
          ¿Estás seguro de que quieres eliminar tu perfil? Se borrarán permanentemente tu cuenta,
          tus datos personales, pacientes, cuidadores, lecturas, eventos y configuración.
        </p>
        <div className="modal__actions">
          <SecondaryButton type="button" onClick={() => setConfirmDeleteOpen(false)} disabled={savingDelete}>
            Cancelar
          </SecondaryButton>
          <DangerButton type="button" onClick={confirmarEliminarCuenta} disabled={savingDelete}>
            {savingDelete ? 'Eliminando…' : 'Sí, eliminar mi perfil'}
          </DangerButton>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
