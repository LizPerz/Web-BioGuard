import { Lock, User, UserPlus } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageHeader } from '../../components/ui/PageHeader';
import { ContentCard } from '../../components/ui/ContentCard';
import { EmptyState } from '../../components/ui/EmptyState';
import './Security.css';

export function Security() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Consola de Seguridad y Vinculación Activa"
        subtitle="Gestión de identidad, cifrado, pacientes vinculados y registro de actividad"
      />

      <div className="security__row">
        <ContentCard className="security__encryption">
          <div className="security__encrypt-icon">
            <Lock size={28} strokeWidth={1.6} />
          </div>
          <span className="security__encrypt-badge">CIFRADO DE EXTREMO A EXTREMO</span>
          <div className="security__encrypt-bits">256-bit</div>
          <p className="security__encrypt-desc">
            Protocolo AES-256 con intercambio de claves HMAC-SHA256. Todos los datos
            biométricos están protegidos con cifrado de grado militar.
          </p>
          <div className="security__encrypt-bar" />
          <p className="security__encrypt-status">Conexión segura activa</p>
        </ContentCard>

        <div className="security__right">
          <ContentCard>
            <EmptyState
              icon={<User size={24} strokeWidth={1.6} />}
              title="Sin paciente vinculado"
              description="Ve al Dashboard para crear uno"
            />
          </ContentCard>

          <div className="security__caregiver-row">
            <ContentCard>
              <EmptyState
                icon={<User size={24} strokeWidth={1.6} />}
                title="Sin cuidador asignado"
                description="Añade cuidadores desde el perfil"
              />
            </ContentCard>

            <ContentCard variant="dashed">
              <div className="security__add-caregiver">
                <div className="security__add-icon">
                  <UserPlus size={20} strokeWidth={1.6} />
                </div>
                <span className="security__add-label">Añadir Cuidador</span>
              </div>
            </ContentCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
