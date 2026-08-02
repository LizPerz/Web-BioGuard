import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { pacienteService } from '../../services';
import styles from './PacienteModal.module.css';

interface PacienteModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function PacienteModal({ open, onClose, onCreated }: PacienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !loading) onClose();
  }, [loading, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setNombre('');
      setError('');
      setSuccess(false);
      setQrCode('');
    }
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleKeyDown]);

  const handleSave = async () => {
    if (!nombre.trim()) { setError('El nombre es obligatorio'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await pacienteService.crear({ nombre: nombre.trim() });
      setSuccess(true);
      if (res.codigoAccesoQr) setQrCode(res.codigoAccesoQr);
      onCreated();
      setTimeout(() => { onClose(); setSuccess(false); }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Error al crear el paciente');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={loading ? undefined : onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nuevo Paciente</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={loading} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          {success ? (
            <div>
              <div className={styles.successMsg}>Paciente creado exitosamente</div>
              {qrCode && (
                <div className={styles.qrBox}>
                  <div className={styles.qrLabel}>Codigo de acceso QR</div>
                  <div className={styles.qrCode}>{qrCode}</div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.field}>
              <div className={styles.label}>Nombre del paciente</div>
              <input
                ref={inputRef}
                className={styles.input}
                type="text"
                placeholder="Ej. Juan Perez"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                disabled={loading}
              />
              {error && <div className={styles.error}>{error}</div>}
            </div>
          )}
        </div>

        {!success && (
          <div className={styles.footer}>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} loading={loading}>
              Guardar Perfil
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
