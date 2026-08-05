import { useCallback, useEffect, useState } from 'react';
import { UserRound, UserPlus, Pencil, Trash2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  crearCuidador,
  actualizarCuidador,
  eliminarCuidador as apiEliminarCuidador,
  actualizarPaciente,
  actualizarBiometriaPaciente,
  eliminarPaciente as apiEliminarPaciente,
  ApiError,
  type PacienteResponse,
  type CuidadorResponse,
} from '../../lib/api';
import './Pacientes.css';

const soloLetras = (value: string) => value.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '');

export function Pacientes() {
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<PacienteResponse | null>(null);
  const [cuidadores, setCuidadores] = useState<CuidadorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [crearPacienteOpen, setCrearPacienteOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [peso, setPeso] = useState('');
  const [estatura, setEstatura] = useState('');
  const [esDiabetico, setEsDiabetico] = useState(false);
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
    setEdad(paciente.edad != null && paciente.edad > 0 ? String(paciente.edad) : '');
    setPeso(paciente.pesoKg != null && paciente.pesoKg > 0 ? String(paciente.pesoKg) : '');
    setEstatura(paciente.estaturaCm != null && paciente.estaturaCm > 0 ? String(paciente.estaturaCm) : '');
    setEsDiabetico(paciente.esDiabetico ?? false);
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
      await actualizarBiometriaPaciente(paciente.id, {
        Edad: edad ? Number(edad) : undefined,
        PesoKg: peso ? Number(peso) : undefined,
        EstaturaCm: estatura ? Number(estatura) : undefined,
        EsDiabetico: esDiabetico,
      });
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
    setCuidadorTelefono('');
    setCuidadorCorreo('');
    setCuidadorError('');
    setCuidadorOpen(true);
  };

  const guardarCuidador = async () => {
    if (!cuidadorNombre.trim() || !cuidadorParentesco.trim()) {
      setCuidadorError('Nombre y parentesco son obligatorios');
      return;
    }
    setCuidadorGuardando(true);
    setCuidadorError('');
    try {
      if (cuidadorEditId) {
        await actualizarCuidador(cuidadorEditId, {
          Nombre: cuidadorNombre.trim(),
          Parentesco: cuidadorParentesco.trim(),
        });
      } else if (paciente) {
        await crearCuidador({
          PacienteId: paciente.id,
          Nombre: cuidadorNombre.trim(),
          Parentesco: cuidadorParentesco.trim(),
          Telefono: cuidadorTelefono.trim() || undefined,
          Correo: cuidadorCorreo.trim() || undefined,
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

  return (
    <DashboardLayout>
      <PageHeader
        title="Pacientes y Cuidadores"
        subtitle="Gestiona el paciente vinculado y las personas autorizadas a monitorearlo"
        onBack={() => navigate('/dashboard')}
        action={
          paciente ? (
            <PrimaryButton onClick={abrirNuevoCuidador}>
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
              <div className="pacientes__patient-icon">
                <UserRound size={26} strokeWidth={1.6} />
              </div>
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
              <span className="pacientes__count">{cuidadores.length}</span>
            </div>
            {paciente && (
              <SecondaryButton onClick={abrirNuevoCuidador}>
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
                  <div className="pacientes__caregiver-avatar">
                    <UserRound size={20} strokeWidth={1.6} />
                  </div>
                  <div className="pacientes__caregiver-info">
                    <span className="pacientes__caregiver-name">{c.nombre}</span>
                    <span className="pacientes__caregiver-relation">{c.parentesco}</span>
                  </div>
                  <div className="pacientes__caregiver-actions">
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
        subtitle="Actualiza los datos del paciente vinculado"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label="Nombre completo"
            name="editNombre"
            value={nombre}
            onChange={(e) => setNombre(soloLetras(e.target.value))}
          />
          <TextInput
            label="Edad (años)"
            name="editEdad"
            value={edad}
            onChange={(e) => setEdad(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <TextInput
            label="Peso (kg)"
            name="editPeso"
            value={peso}
            onChange={(e) => setPeso(e.target.value.replace(/[^0-9.]/g, ''))}
          />
          <TextInput
            label="Estatura (cm)"
            name="editEstatura"
            value={estatura}
            onChange={(e) => setEstatura(e.target.value.replace(/[^0-9.]/g, ''))}
          />
          <label className="pacientes__check">
            <input
              type="checkbox"
              checked={esDiabetico}
              onChange={(e) => setEsDiabetico(e.target.checked)}
            />
            <span>¿Es diabético?</span>
          </label>
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
            label="Teléfono (opcional)"
            name="cuidadorTelefono"
            value={cuidadorTelefono}
            onChange={(e) => setCuidadorTelefono(e.target.value)}
            placeholder="+52…"
          />
          <TextInput
            label="Correo (opcional)"
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
    </DashboardLayout>
  );
}
