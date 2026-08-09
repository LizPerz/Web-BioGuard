import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import './modal.css';

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, subtitle, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal__overlay" onClick={onClose} />
      <div className="modal__panel">
        <div className="modal__header">
          <div>
            <h3 className="modal__title">{title}</h3>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
