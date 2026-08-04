import { Camera, User, Mail, LockKeyhole, TriangleAlert, Eye, EyeOff, Check, X } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { ContentCard } from '../../components/ui/ContentCard';
import { PrimaryButton, DangerButton, SecondaryButton } from '../../components/ui/buttons';
import { TextInput, PasswordInput } from '../../components/ui/inputs';
import { mockUser } from '../../data/mockData';
import { getUser } from '../../lib/auth';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './Settings.css';

interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  noSpaces: boolean;
}

export function Settings() {
  const location = useLocation();
  const session = getUser();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const sessionName = session?.nombre ?? `${mockUser.firstName} ${mockUser.lastName}`.trim();

  const [firstName, setFirstName] = useState(session?.nombre ?? mockUser.firstName);
  const [lastName, setLastName] = useState(mockUser.lastName);
  const [maternalLastName, setMaternalLastName] = useState(mockUser.maternalLastName);
  const [newEmail, setNewEmail] = useState('');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

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
    hasNumber: /[0-9]/.test(newPass),
    hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPass),
    noSpaces: newPass.length > 0 && !/\s/.test(newPass),
  };

  const allPassChecks = Object.values(passChecks).every(Boolean);

  const passCheckItems: { key: keyof PasswordChecks; label: string }[] = [
    { key: 'minLength', label: 'Mínimo 8 caracteres' },
    { key: 'hasUpper', label: 'Al menos una mayúscula' },
    { key: 'hasNumber', label: 'Al menos un número' },
    { key: 'hasSymbol', label: 'Al menos un símbolo' },
    { key: 'noSpaces', label: 'Sin espacios' },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="Ajustes de Cuenta"
        subtitle={`Configuración de tu perfil · ${sessionName}`}
      />

      <div className="settings__row settings__row--three">
        <ContentCard id="avatar" className="settings__avatar-card" style={{ scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Camera size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Foto de Perfil</h3>
          </div>
          <div className="settings__avatar-circle">
            <User size={36} strokeWidth={1.4} />
          </div>
          <SecondaryButton fullWidth>
            <Camera size={14} strokeWidth={1.8} />
            Cambiar foto
          </SecondaryButton>
        </ContentCard>

        <ContentCard id="perfil" style={{ scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <User size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Editar Perfil</h3>
          </div>
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
          <div style={{ marginTop: 20 }}>
            <PrimaryButton fullWidth>Guardar cambios</PrimaryButton>
          </div>
        </ContentCard>

        <ContentCard id="correo" style={{ scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Mail size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Cambiar Correo</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextInput label="Correo actual" name="currentEmail" defaultValue={mockUser.email} disabled />
            <TextInput label="Nuevo correo" name="newEmail" placeholder="nuevo@correo.com" value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => blockSpaceKey(e, 'newEmail')}
              error={fieldErrors['newEmail']}
            />
          </div>
          <div style={{ marginTop: 20 }}>
            <PrimaryButton fullWidth>Cambiar correo</PrimaryButton>
          </div>
        </ContentCard>
      </div>

      <div className="settings__row settings__row--bottom">
        <ContentCard id="password" style={{ flex: 1, maxWidth: 420, scrollMarginTop: 88 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <LockKeyhole size={iconSize} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
            <h3 className="settings__card-title">Cambiar Contraseña</h3>
          </div>
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
          <div style={{ marginTop: 20 }}>
            <PrimaryButton fullWidth disabled={newPass.length > 0 && !allPassChecks}>
              Actualizar contraseña
            </PrimaryButton>
          </div>
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
            <DangerButton>Eliminar mi cuenta</DangerButton>
          </div>
        </ContentCard>
      </div>
    </DashboardLayout>
  );
}
