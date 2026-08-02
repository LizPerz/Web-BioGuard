import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Sun, Moon } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';
import { Button, LoadingSpinner, EmptyState } from '../../components/ui';
import { useTheme } from '../../context';
import { planService } from '../../services';
import { PlanResponse, BillingPeriod } from '../../types';
import { ROUTES, ANNUAL_DISCOUNT, PERIOD_LABELS } from '../../constants';
import styles from './Licenciamientos.module.css';

export default function LicenciamientosPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [plans, setPlans] = useState<PlanResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanResponse | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>('mensual');

  useEffect(() => {
    planService
      .listar()
      .then(setPlans)
      .catch((err: any) => {
        if (err?.message?.includes('Network Error') || err?.status === undefined) {
          setError('No se puede conectar al servidor. Asegúrate de que el backend esté corriendo en http://localhost:5057');
        } else {
          setError(err?.message || 'Error al cargar los planes. Intenta de nuevo.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const getDisplayPrice = (plan: PlanResponse) => {
    if (plan.nombre === 'Gratis') return 0;
    if (period === 'anual') {
      return Math.round(plan.precio * 12 * (1 - ANNUAL_DISCOUNT));
    }
    return plan.precio;
  };

  const handleContinue = () => {
    if (!selectedPlan) return;
    navigate(ROUTES.CHECKOUT, { state: { plan: selectedPlan, period } });
  };

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to={ROUTES.HOME} className={styles.logo}>
          BioGuard
        </Link>
        <div className={styles.navActions}>
          <Link to={ROUTES.LOGIN}>
            <Button variant="ghost" size="sm" style={{ border: '1px dashed var(--color-border-light)' }}>
              Iniciar sesion
            </Button>
          </Link>
          <button onClick={toggleTheme} className={styles.themeBtn}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.hero}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Logo size={220} showText={false} />
          </div>
          <h1 className={styles.heroTitle}>
            Bienvenido a la Élite de la
          </h1>
          <h1 className={styles.heroTitle}>
            Bioseguridad
          </h1>
          <p className={styles.heroText}>
            Tu salud y datos biomedicos protegidos bajo los protocolos mas estrictos del<br />
            mundo. Selecciona el nivel de blindaje que mejor se adapte a tus necesidades.
          </p>
        </div>

        <p className={styles.chooseTitle}>Elige tu nivel de proteccion</p>

        <div className={styles.periodSwitch}>
          <button
            className={`${styles.periodBtn} ${period === 'mensual' ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod('mensual')}
          >
            Mensual
          </button>
          <button
            className={`${styles.periodBtn} ${period === 'anual' ? styles.periodBtnActive : ''}`}
            onClick={() => setPeriod('anual')}
          >
            Anual (15% off)
          </button>
        </div>

        {loading && <LoadingSpinner />}

        {error && <div className={styles.errorBox}>{error}</div>}

        {!loading && !error && plans.length === 0 && (
          <EmptyState title="No hay planes disponibles" description="Intenta de nuevo más tarde." />
        )}

        {!loading && plans.length > 0 && (
          <>
            <div className={styles.plansGrid}>
              {plans.map((plan, idx) => {
                const price = getDisplayPrice(plan);
                const isRecommended = idx === 2;
                return (
                  <div
                    key={plan.id}
                    className={`${styles.planCard} ${
                      selectedPlan?.id === plan.id ? styles.planCardSelected : ''
                    } ${isRecommended ? styles.planCardRecommended : ''}`}
                    onClick={() => setSelectedPlan(plan)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedPlan(plan)}
                  >
                    {isRecommended && (
                      <div className={styles.recommendedBadge}>Recomendado</div>
                    )}
                    <div className={styles.planCategory}>
                      {plan.nombre === 'Gratis' ? 'Básico' : plan.nombre === 'Familiar' ? 'Familiar' : 'Profesional'}
                    </div>
                    <div className={styles.planName}>{plan.nombre}</div>
                    <div className={styles.planPrice}>
                      <span className={styles.planAmount}>
                        {price === 0 ? 'Gratis' : `$${price}`}
                      </span>
                      {price > 0 && (
                        <span className={styles.planPeriod}>
                          {PERIOD_LABELS[period]}
                        </span>
                      )}
                    </div>
                    <ul className={styles.planFeatures}>
                      <li className={styles.planFeature}>
                        <Check className={styles.planFeatureIcon} size={16} />
                        {plan.limitePacientes} paciente{plan.limitePacientes !== 1 ? 's' : ''}
                      </li>
                      <li className={styles.planFeature}>
                        <Check className={styles.planFeatureIcon} size={16} />
                        {plan.limiteCuidadores} cuidadores
                      </li>
                      <li className={styles.planFeature}>
                        <Check className={styles.planFeatureIcon} size={16} />
                        Historial {plan.diasHistorial} días
                      </li>
                      {plan.gpsContinuo && (
                        <li className={styles.planFeature}>
                          <Check className={styles.planFeatureIcon} size={16} />
                          GPS continuo
                        </li>
                      )}
                      {plan.aiConsole && (
                        <li className={styles.planFeature}>
                          <Check className={styles.planFeatureIcon} size={16} />
                          Consola IA
                        </li>
                      )}
                      <li className={styles.planFeature}>
                        <Check className={styles.planFeatureIcon} size={16} />
                        Alertas inteligentes
                      </li>
                    </ul>
                  </div>
                );
              })}
            </div>

            {selectedPlan && (
              <div className={`${styles.summary} animate-slide-up`}>
                <div className={styles.summaryInfo}>
                  <span className={styles.summaryLabel}>Plan seleccionado</span>
                  <span className={styles.summaryPlan}>{selectedPlan.nombre}</span>
                </div>
                <div className={styles.summaryPrice}>
                  {getDisplayPrice(selectedPlan) === 0
                    ? 'Gratis'
                    : `$${getDisplayPrice(selectedPlan)}${PERIOD_LABELS[period]}`}
                </div>
                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={!selectedPlan}
                >
                  Continuar al pago
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
