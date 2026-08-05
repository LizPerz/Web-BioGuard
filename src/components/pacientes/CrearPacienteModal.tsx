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

const soloLetras = (value: string) => value.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/g, '');

export function CrearPacienteModal({ open, onClose, onCreated }: CrearPacienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setNombre('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre) {
      setError('El nombre del paciente es obligatorio');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createPaciente({ Nombre: nombre.trim() });
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
      subtitle="Registra el nombre de la persona que vas a monitorear"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextInput
            label="Nombre completo"
            name="pacienteNombre"
            placeholder="Nombre del paciente"
            value={nombre}
            onChange={(e) => setNombre(soloLetras(e.target.value))}
            icon={<UserRound size={17} strokeWidth={1.8} />}
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
