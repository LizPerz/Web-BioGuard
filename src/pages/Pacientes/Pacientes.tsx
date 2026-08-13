import { useCallback, useEffect, useState } from 'react';
import { UserRound, UserPlus, Pencil, Trash2, Users, QrCode, RefreshCw, Copy, Check as CheckIcon, Loader2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { PrimaryButton, SecondaryButton, DangerButton } from '../../components/ui/buttons';
import { ContentCard } from '../../components/ui/ContentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { TextInput } from '../../components/ui/inputs';
import { CrearPacienteModal } from '../../components/pacientes/CrearPacienteModal';
import {
  getMiPaciente,
  getCuidadores,
  getMiPlan,
  crearCuidador,
  actualizarCuidador,
  eliminarCuidador as apiEliminarCuidador,
  actualizarPaciente,
  eliminarPaciente as apiEliminarPaciente,
  getQrPaciente,
  regenerarQrPaciente,
  getQrCuidador,
  regenerarQrCuidador,
  ApiError,
  fotoSrc,
  type PacienteResponse,
  type CuidadorResponse,
} from '../../lib/api';
import './Pacientes.css';

const soloLetras = (value: string) =>
  value.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ ]/g, '').replace(/\s+/g, ' ');

const soloDigitos = (value: string) => value.replace(/\D/g, '').slice(0, 10);

export function Pacientes() {
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [cuidadores, setCuidadores] = useState<CuidadorResponse[]>([]);
  const [limiteCuidadores, setLimiteCuidadores] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [crearPacienteOpen, setCrearPacienteOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [errorPaciente, setErrorPaciente] = useState('');

  const [cuidadorOpen, setCuidadorOpen] = useState(false);
  const [cuidadorEditId, setCuidadorEditId] = useState<string | null>(null);
  const [cuidadorNombre, setCuidadorNombre] = useState('');
  const [cuidadorParentesco, setCuidadorParentesco] = useState('');
  const [cuidadorTelefono, setCuidadorTelefono] = useState('');
  const [cuidadorCorreo, setCuidadorCorreo] = useState('');
  const [cuidadorError, setCuidadorError] = useState('');
  const [cuidadorGuardando, setCuidadorGuardando] = useState(false);
  const [confirmEliminarCuidador, setConfirmEliminarCuidador] = useState<string | null>(null);

  const [qrTarget, setQrTarget] = useState<{ tipo: 'paciente' | 'cuidador'; id: string; nombre: string } | null>(null);
  const [qrCodigo, setQrCodigo] = useState('');
  const [qrRestante, setQrRestante] = useState(0);
  const [qrCargando, setQrCargando] = useState(false);
  const [qrRegenerando, setQrRegenerando] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrMensaje, setQrMensaje] = useState('');
  const [qrCopiado, setQrCopiado] = useState(false);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const p = await getMiPaciente();
      setPaciente(p);
      if (p) {
        try {
          setCuidadores(await getCuidadores());
        } catch {
          setCuidadores([]);
        }
      } else {
        setCuidadores([]);
      }
      try {
        const plan = await getMiPlan();
        setLimiteCuidadores(plan.limiteCuidadores > 0 ? plan.limiteCuidadores : null);
      } catch {
        setLimiteCuidadores(null);
      }
    } catch (err) {
      if (err instanceof ApiError) setPageError(err.message);
      else setPageError('Ocurrió un error al cargar la información.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const abrirEditar = () => {
    if (!paciente) return;
    setNombre(paciente.nombre);
    setErrorPaciente('');
    setEditarOpen(true);
  };

  const guardarPaciente = async () => {
    if (!paciente) return;
    if (!nombre.trim()) {
      setErrorPaciente('El nombre es obligatorio');
      return;
    }
    setGuardando(true);
    setErrorPaciente('');
    try {
      if (nombre.trim() !== paciente.nombre) {
        await actualizarPaciente(paciente.id, { Nombre: nombre.trim() });
      }
      setEditarOpen(false);
      await cargarTodo();
    } catch (err) {
      if (err instanceof ApiError) setErrorPaciente(err.message);
      else setErrorPaciente('Ocurrió un error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPaciente = async () => {
    if (!paciente) return;
    setGuardando(true);
    try {
      await apiEliminarPaciente(paciente.id);
      setConfirmEliminarOpen(false);
      await cargarTodo();
    } catch (err) {
      if (err instanceof ApiError) setPageError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const abrirQr = async (tipo: 'paciente' | 'cuidador', id: string, nombre: string) => {
    setQrTarget({ tipo, id, nombre });
    setQrCargando(true);
    setQrError('');
    setQrMensaje('');
    setQrCopiado(false);
    try {
      const fn = tipo === 'paciente' ? getQrPaciente : getQrCuidador;
      const res = await fn(id);
      const expira = new Date(res.codigoExpira ?? new Date(Date.now() + 5 * 60 * 1000).toISOString());
      setQrCodigo(res.codigoAccesoQr ?? '');
      setQrRestante(Math.max(0, Math.round((expira.getTime() - Date.now()) / 1000)));
    } catch (err) {
      setQrError(errMsg(err));
    } finally {
      setQrCargando(false);
    }
  };

  const regenerarQr = async () => {
    if (!qrTarget || qrRegenerando) return;
    setQrRegenerando(true);
    setQrError('');
    setQrMensaje('');
    try {
      const fn = qrTarget.tipo === 'paciente' ? regenerarQrPaciente : regenerarQrCuidador;
      const res = await fn(qrTarget.id);
      const expira = new Date(res.codigoExpira ?? new Date(Date.now() + 5 * 60 * 1000).toISOString());
      setQrCodigo(res.codigoAccesoQr ?? '');
      setQrRestante(Math.max(0, Math.round((expira.getTime() - Date.now()) / 1000)));
      setQrMensaje('Se generó un nuevo código');
    } catch (err) {
      setQrError(errMsg(err));
    } finally {
      setQrRegenerando(false);
    }
  };

  const copiarCodigo = async () => {
    if (!qrCodigo) return;
    try {
      await navigator.clipboard.writeText(qrCodigo);
      setQrCopiado(true);
      setTimeout(() => setQrCopiado(false), 2000);
    } catch {
      setQrCopiado(false);
    }
  };

  useEffect(() => {
    if (!qrTarget) return;
    const tick = setInterval(() => {
      setQrRestante((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [qrTarget]);

  useEffect(() => {
    if (qrTarget && qrRestante <= 0 && !qrCargando && !qrRegenerando) {
      regenerarQr();
    }
  }, [qrRestante, qrTarget, qrCargando, qrRegenerando]);

  const formatearRestante = (s: number) => {
    const m = Math.floor(s / 60);
    const seg = s % 60;
    return `${m}:${String(seg).padStart(2, '0')}`;
  };

  function errMsg(err: unknown, fallback = 'Ocurrió un error inesperado. Intenta de nuevo.') {
    return err instanceof ApiError ? err.message : fallback;
  }

  const abrirNuevoCuidador = () => {
    setCuidadorEditId(null);
    setCuidadorNombre('');
    setCuidadorParentesco('');
    setCuidadorTelefono('');
    setCuidadorCorreo('');
    setCuidadorError('');
    setCuidadorOpen(true);
  };

  const abrirEditarCuidador = (c: CuidadorResponse) => {
    setCuidadorEditId(c.id);
    setCuidadorNombre(c.nombre);
    setCuidadorParentesco(c.parentesco);
    setCuidadorTelefono(c.telefono ?? '');
    setCuidadorCorreo(c.correo ?? '');
    setCuidadorError('');
    setCuidadorOpen(true);
  };

  const guardarCuidador = async () => {
    if (!cuidadorNombre.trim() || !cuidadorParentesco.trim()) {
      setCuidadorError('Nombre y parentesco son obligatorios');
      return;
    }
    if (cuidadorTelefono.length !== 10) {
      setCuidadorError('El teléfono debe tener exactamente 10 dígitos numéricos');
      return;
    }
    if (!cuidadorCorreo.trim()) {
      setCuidadorError('El correo es obligatorio');
      return;
    }
    setCuidadorGuardando(true);
    setCuidadorError('');
    try {
      if (cuidadorEditId) {
        await actualizarCuidador(cuidadorEditId, {
          Nombre: cuidadorNombre.trim(),
          Parentesco: cuidadorParentesco.trim(),
          Telefono: cuidadorTelefono,
          Correo: cuidadorCorreo.trim(),
        });
      } else if (paciente) {
        await crearCuidador({
          PacienteId: paciente.id,
          Nombre: cuidadorNombre.trim(),
          Parentesco: cuidadorParentesco.trim(),
          Telefono: cuidadorTelefono,
          Correo: cuidadorCorreo.trim(),
        });
      }
      setCuidadorOpen(false);
      await cargarTodo();
    } catch (err) {
      if (err instanceof ApiError) setCuidadorError(err.message);
      else setCuidadorError('Ocurrió un error al guardar el cuidador.');
    } finally {
      setCuidadorGuardando(false);
    }
  };

  const eliminarCuidador = async () => {
    if (!confirmEliminarCuidador) return;
    setCuidadorGuardando(true);
    try {
      await apiEliminarCuidador(confirmEliminarCuidador);
      setConfirmEliminarCuidador(null);
      await cargarTodo();
    } catch (err) {
      if (err instanceof ApiError) setPageError(err.message);
    } finally {
      setCuidadorGuardando(false);
    }
  };

  const iconSize = 16;

  const limiteAlcanzado =
    limiteCuidadores != null && cuidadores.length >= limiteCuidadores;

  return (
    <DashboardLayout>
      <PageHeader
        title="Pacientes y Cuidadores"
        subtitle="Gestiona el paciente vinculado y las personas autorizadas a monitorearlo"
        onBack={() => navigate('/dashboard')}
        action={
          paciente ? (
            <PrimaryButton onClick={abrirNuevoCuidador} disabled={limiteAlcanzado}>
              <UserPlus size={16} strokeWidth={2} />
              Añadir Cuidador
            </PrimaryButton>
          ) : undefined
        }
      />

      {pageError && (
        <div className="modal__error" style={{ marginBottom: 20 }} role="alert">
          {pageError}
        </div>
      )}

      <div className="pacientes__row">
        <ContentCard className="pacientes__patient">
          <div className="pacientes__card-header">
            <div className="pacientes__card-title-row">
              <UserRound size={iconSize} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
              <h3 className="pacientes__card-title">Paciente</h3>
            </div>
            {paciente && (
              <div className="pacientes__card-actions">
                <SecondaryButton onClick={() => abrirQr('paciente', paciente.id, paciente.nombre)}>
                  <QrCode size={13} strokeWidth={1.8} />
                  Código de acceso
                </SecondaryButton>
                <SecondaryButton onClick={abrirEditar}>
                  <Pencil size={13} strokeWidth={1.8} />
                  Editar
                </SecondaryButton>
                <DangerButton onClick={() => setConfirmEliminarOpen(true)}>
                  <Trash2 size={13} strokeWidth={1.8} />
                  Eliminar
                </DangerButton>
              </div>
            )}
          </div>

          {loading ? (
            <p className="pacientes__loading">Cargando…</p>
          ) : paciente ? (
            <div className="pacientes__patient-info">
              {paciente.foto ? (
                <img
                  className="pacientes__patient-photo"
                  src={fotoSrc(paciente.foto)}
                  alt={`Foto de ${paciente.nombre}`}
                />
              ) : (
                <div className="pacientes__patient-icon">
                  <UserRound size={26} strokeWidth={1.6} />
                </div>
              )}
              <div className="pacientes__patient-details">
                <span className="pacientes__patient-name">{paciente.nombre}</span>
                {paciente.esDiabetico && (
                  <span className="pacientes__diabetic-badge">Paciente diabético</span>
                )}
                <div className="pacientes__patient-grid">
                  {paciente.edad != null && paciente.edad > 0 && (
                    <div className="pacientes__stat">
                      <span className="pacientes__stat-value">{paciente.edad}</span>
                      <span className="pacientes__stat-label">Años</span>
                    </div>
                  )}
                  {paciente.pesoKg != null && paciente.pesoKg > 0 && (
                    <div className="pacientes__stat">
                      <span className="pacientes__stat-value">{paciente.pesoKg}</span>
                      <span className="pacientes__stat-label">kg</span>
                    </div>
                  )}
                  {paciente.estaturaCm != null && paciente.estaturaCm > 0 && (
                    <div className="pacientes__stat">
                      <span className="pacientes__stat-value">{paciente.estaturaCm}</span>
                      <span className="pacientes__stat-label">cm</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<UserRound size={24} strokeWidth={1.6} />}
              title="Sin paciente vinculado"
              description="Crea el paciente que vas a monitorear"
              action={
                <PrimaryButton onClick={() => setCrearPacienteOpen(true)}>
                  <UserPlus size={16} strokeWidth={2} />
                  Crear Paciente
                </PrimaryButton>
              }
            />
          )}
        </ContentCard>
      </div>

      <div className="pacientes__row">
        <ContentCard className="pacientes__caregivers">
          <div className="pacientes__card-header">
            <div className="pacientes__card-title-row">
              <Users size={iconSize} strokeWidth={1.8} style={{ color: 'var(--cyan)' }} />
              <h3 className="pacientes__card-title">Cuidadores</h3>
              <span className="pacientes__count">
                {cuidadores.length}
                {limiteCuidadores != null ? `/${limiteCuidadores}` : ''}
              </span>
            </div>
            {paciente && (
              <SecondaryButton
                onClick={abrirNuevoCuidador}
                disabled={limiteAlcanzado}
                title={
                  limiteAlcanzado
                    ? `Alcanzaste el límite de ${limiteCuidadores} cuidadores de tu plan`
                    : undefined
                }
              >
                <UserPlus size={13} strokeWidth={1.8} />
                Añadir
              </SecondaryButton>
            )}
          </div>

          {loading ? (
            <p className="pacientes__loading">Cargando…</p>
          ) : !paciente ? (
            <EmptyState
              icon={<Users size={24} strokeWidth={1.6} />}
              title="Crea primero un paciente"
              description="Los cuidadores se asignan a un paciente"
            />
          ) : cuidadores.length === 0 ? (
            <EmptyState
              icon={<Users size={24} strokeWidth={1.6} />}
              title="Sin cuidadores asignados"
              description="Añade personas autorizadas a monitorear al paciente"
            />
          ) : (
            <div className="pacientes__caregiver-grid">
              {cuidadores.map((c) => (
                <ContentCard key={c.id} className="pacientes__caregiver">
                  {c.foto ? (
                    <img
                      className="pacientes__caregiver-photo"
                      src={fotoSrc(c.foto)}
                      alt={`Foto de ${c.nombre}`}
                    />
                  ) : (
                    <div className="pacientes__caregiver-avatar">
                      <UserRound size={20} strokeWidth={1.6} />
                    </div>
                  )}
                  <div className="pacientes__caregiver-info">
                    <span className="pacientes__caregiver-name">{c.nombre}</span>
                    <span className="pacientes__caregiver-relation">{c.parentesco}</span>
                  </div>
                  <div className="pacientes__caregiver-actions">
                    <button
                      className="pacientes__icon-btn"
                      onClick={() => abrirQr('cuidador', c.id, c.nombre)}
                      aria-label={`Código de acceso de ${c.nombre}`}
                      title="Código de acceso"
                    >
                      <QrCode size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      className="pacientes__icon-btn"
                      onClick={() => abrirEditarCuidador(c)}
                      aria-label={`Editar a ${c.nombre}`}
                    >
                      <Pencil size={15} strokeWidth={1.8} />
                    </button>
                    <button
                      className="pacientes__icon-btn pacientes__icon-btn--danger"
                      onClick={() => setConfirmEliminarCuidador(c.id)}
                      aria-label={`Eliminar a ${c.nombre}`}
                    >
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                </ContentCard>
              ))}
            </div>
          )}
        </ContentCard>
      </div>

      <CrearPacienteModal
        open={crearPacienteOpen}
        onClose={() => setCrearPacienteOpen(false)}
        onCreated={cargarTodo}
      />

      <Modal
        open={editarOpen}
        onClose={() => setEditarOpen(false)}
        title="Editar paciente"
        subtitle="Actualiza el nombre del paciente vinculado"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label="Nombre completo"
            name="editNombre"
            value={nombre}
            onChange={(e) => setNombre(soloLetras(e.target.value))}
            placeholder="Nombre y apellido del paciente"
          />
          {errorPaciente && (
            <div className="modal__error" role="alert">
              {errorPaciente}
            </div>
          )}
        </div>
        <div className="modal__actions">
          <SecondaryButton type="button" onClick={() => setEditarOpen(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="button" onClick={guardarPaciente} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </PrimaryButton>
        </div>
      </Modal>

      <Modal
        open={confirmEliminarOpen}
        onClose={() => setConfirmEliminarOpen(false)}
        title="Eliminar paciente"
        subtitle="Esta acción eliminará al paciente y sus cuidadores. No se puede deshacer."
      >
        <div className="modal__actions">
          <SecondaryButton type="button" onClick={() => setConfirmEliminarOpen(false)}>
            Cancelar
          </SecondaryButton>
          <DangerButton type="button" onClick={eliminarPaciente} disabled={guardando}>
            {guardando ? 'Eliminando…' : 'Sí, eliminar'}
          </DangerButton>
        </div>
      </Modal>

      <Modal
        open={cuidadorOpen}
        onClose={() => setCuidadorOpen(false)}
        title={cuidadorEditId ? 'Editar cuidador' : 'Añadir cuidador'}
        subtitle={
          cuidadorEditId
            ? 'Actualiza la información del cuidador'
            : 'Autoriza a una persona a monitorear al paciente'
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label="Nombre"
            name="cuidadorNombre"
            value={cuidadorNombre}
            onChange={(e) => setCuidadorNombre(soloLetras(e.target.value))}
            placeholder="Nombre completo"
          />
          <TextInput
            label="Parentesco"
            name="cuidadorParentesco"
            value={cuidadorParentesco}
            onChange={(e) => setCuidadorParentesco(soloLetras(e.target.value))}
            placeholder="Ej. Hijo, Esposa, Enfermero…"
          />
          <TextInput
            label="Teléfono (10 dígitos)"
            name="cuidadorTelefono"
            value={cuidadorTelefono}
            onChange={(e) => setCuidadorTelefono(soloDigitos(e.target.value))}
            placeholder="Ej. 5512345678"
            maxLength={10}
          />
          <TextInput
            label="Correo"
            name="cuidadorCorreo"
            type="email"
            value={cuidadorCorreo}
            onChange={(e) => setCuidadorCorreo(e.target.value)}
            placeholder="cuidador@correo.com"
          />
          {cuidadorError && (
            <div className="modal__error" role="alert">
              {cuidadorError}
            </div>
          )}
        </div>
        <div className="modal__actions">
          <SecondaryButton type="button" onClick={() => setCuidadorOpen(false)}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="button" onClick={guardarCuidador} disabled={cuidadorGuardando}>
            {cuidadorGuardando ? 'Guardando…' : cuidadorEditId ? 'Guardar cambios' : 'Añadir cuidador'}
          </PrimaryButton>
        </div>
      </Modal>

      <Modal
        open={confirmEliminarCuidador !== null}
        onClose={() => setConfirmEliminarCuidador(null)}
        title="Eliminar cuidador"
        subtitle="El cuidador perderá el acceso al monitoreo. Esta acción no se puede deshacer."
      >
        <div className="modal__actions">
          <SecondaryButton type="button" onClick={() => setConfirmEliminarCuidador(null)}>
            Cancelar
          </SecondaryButton>
          <DangerButton type="button" onClick={eliminarCuidador} disabled={cuidadorGuardando}>
            {cuidadorGuardando ? 'Eliminando…' : 'Sí, eliminar'}
          </DangerButton>
        </div>
      </Modal>

      <Modal
        open={qrTarget !== null}
        onClose={() => setQrTarget(null)}
        title="Código de acceso"
        subtitle={
          qrTarget
            ? `${qrTarget.tipo === 'paciente' ? 'Paciente' : 'Cuidador'}: ${qrTarget.nombre} · escanéalo con la App Móvil`
            : 'Escanéalo con la App Móvil'
        }
      >
        <div className="pacientes__qr">
          {qrCargando ? (
            <div className="pacientes__qr-loading">
              <Loader2 size={22} strokeWidth={1.8} className="pacientes__spin" />
              Cargando código…
            </div>
          ) : qrError ? (
            <div className="modal__error" role="alert">
              {qrError}
            </div>
          ) : (
            <>
              <div className="pacientes__qr-box">
                {qrCodigo ? (
                  <QRCodeSVG value={qrCodigo} size={180} includeMargin={false} />
                ) : (
                  <span className="pacientes__qr-box-empty">—</span>
                )}
              </div>
              <div className="pacientes__qr-code-block">
                <span className="pacientes__qr-code-label">Código de acceso (escríbelo o escanéalo)</span>
                <div className="pacientes__qr-code" onClick={copiarCodigo} title="Copiar código">
                  <span>{qrCodigo ? qrCodigo.replace(/(\d{4})(?=\d)/g, '$1 ') : '—'}</span>
                  <button
                    className="pacientes__icon-btn"
                    onClick={copiarCodigo}
                    aria-label="Copiar código"
                  >
                    {qrCopiado ? <CheckIcon size={15} strokeWidth={1.8} /> : <Copy size={15} strokeWidth={1.8} />}
                  </button>
                </div>
                <p className="pacientes__qr-copy-hint">
                  {qrCopiado ? '¡Código copiado! Puedes compartirlo o escribirlo en la App Móvil.' : 'Toca el código para copiarlo. No necesitas escanear: puedes escribir los 8 dígitos en la App Móvil.'}
                </p>
              </div>
              <p className="pacientes__qr-hint">
                El código se renueva cada 5 minutos. Introdúcelo o escanéalo en la App Móvil para vincular este dispositivo.
              </p>

              <div className="pacientes__qr-timer">
                <div className="pacientes__qr-timer-row">
                  <Clock size={15} strokeWidth={1.8} />
                  <span className={qrRestante <= 30 ? 'pacientes__qr-timer--warn' : ''}>
                    {qrRestante > 0 ? `Nuevo código en ${formatearRestante(qrRestante)}` : 'Generando nuevo código…'}
                  </span>
                  {qrRegenerando && <Loader2 size={14} strokeWidth={1.8} className="pacientes__spin" />}
                </div>
                <div className="pacientes__qr-progress">
                  <div
                    className="pacientes__qr-progress-bar"
                    style={{ width: `${Math.min(100, (qrRestante / 300) * 100)}%` }}
                  />
                </div>
              </div>

              {qrMensaje && <p className="pacientes__qr-msg">{qrMensaje}</p>}

              <SecondaryButton fullWidth onClick={regenerarQr} disabled={qrRegenerando}>
                <RefreshCw size={14} strokeWidth={1.8} />
                {qrRegenerando ? 'Generando…' : 'Generar nuevo código'}
              </SecondaryButton>
            </>
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
