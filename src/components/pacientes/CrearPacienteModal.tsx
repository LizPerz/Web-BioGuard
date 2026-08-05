import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { PrimaryButton, SecondaryButton } from '../ui/buttons';
import { TextInput } from '../ui/inputs';
import { createPaciente, ApiError } from '../../lib/api';

interface CrearPacienteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CrearPacienteModal({ open, onClose, onCreated }: CrearPacienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [peso, setPeso] = useState('');
  const [estatura, setEstatura] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setNombre('');
    setEdad('');
    setPeso('');
    setEstatura('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre del paciente es obligatorio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createPaciente({
        Nombre: nombre.trim(),
        Edad: edad ? Number(edad) : undefined,
        PesoKg: peso ? Number(peso) : undefined,
        EstaturaCm: estatura ? Number(estatura) : undefined,
      });
      reset();
      onClose();
      onCreated();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Ocurrió un error inesperado. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crea tu paciente"
      subtitle="Registra los datos básicos de la persona que vas a monitorear"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label="Nombre completo"
            name="pacienteNombre"
            placeholder="Nombre del paciente"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            icon={<UserRound size={17} strokeWidth={1.8} />}
          />
          <TextInput
            label="Edad (años)"
            name="pacienteEdad"
            placeholder="Ej. 65"
            value={edad}
            onChange={(e) => setEdad(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <TextInput
            label="Peso (kg)"
            name="pacientePeso"
            placeholder="Ej. 70"
            value={peso}
            onChange={(e) => setPeso(e.target.value.replace(/[^0-9.]/g, ''))}
          />
          <TextInput
            label="Estatura (cm)"
            name="pacienteEstatura"
            placeholder="Ej. 170"
            value={estatura}
            onChange={(e) => setEstatura(e.target.value.replace(/[^0-9.]/g, ''))}
          />
          {error && (
            <div className="modal__error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal__actions">
          <SecondaryButton type="button" onClick={onClose}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={loading}>
            {loading ? 'Guardando…' : 'Guardar paciente'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}
