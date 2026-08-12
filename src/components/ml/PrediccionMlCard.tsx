import { TrendingUp, AlertCircle, CheckCircle2, Brain, Gauge, Zap } from 'lucide-react';
import type { PrediccionMlResponse } from '../../lib/api';
import './PrediccionMlCard.css';

interface PrediccionMlCardProps {
  prediccion: PrediccionMlResponse;
}

export function PrediccionMlCard({ prediccion }: PrediccionMlCardProps) {
  const getRiskColor = (nivel: string): string => {
    switch (nivel.toLowerCase()) {
      case 'bajo':
        return 'var(--green)';
      case 'moderado':
      case 'moderado alto':
        return 'var(--orange)';
      case 'crítico':
      case 'crítico alto':
        return 'var(--red)';
      default:
        return 'var(--blue)';
    }
  };

  const getRiskIcon = (nivel: string) => {
    switch (nivel.toLowerCase()) {
      case 'bajo':
        return <CheckCircle2 size={20} strokeWidth={2} />;
      case 'crítico':
      case 'crítico alto':
        return <AlertCircle size={20} strokeWidth={2} />;
      default:
        return <TrendingUp size={20} strokeWidth={2} />;
    }
  };

  const formateoFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const probabilidadPorcentaje = Math.round(prediccion.pPico * 100);

  return (
    <div className="prediccion-ml-card">
      <div className="prediccion-ml-card__header">
        <div className="prediccion-ml-card__title-section">
          <div className="prediccion-ml-card__icon">
            <Brain size={24} strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="prediccion-ml-card__title">Análisis ML - Pico Glucémico</h4>
            <p className="prediccion-ml-card__timestamp">{formateoFecha(prediccion.fechaPrediccion)}</p>
          </div>
        </div>
        <div
          className="prediccion-ml-card__risk-badge"
          style={{ borderColor: getRiskColor(prediccion.nivelRiesgo), color: getRiskColor(prediccion.nivelRiesgo) }}
        >
          <div className="prediccion-ml-card__risk-icon">{getRiskIcon(prediccion.nivelRiesgo)}</div>
          <span className="prediccion-ml-card__risk-text">{prediccion.nivelRiesgo}</span>
        </div>
      </div>

      {/* Caso Clínico */}
      <div className="prediccion-ml-card__caso-clinico">
        <h5 className="prediccion-ml-card__subtitled">Caso Clínico</h5>
        <p className="prediccion-ml-card__caso-text">{prediccion.casoClinico}</p>
      </div>

      {/* Métricas ML */}
      <div className="prediccion-ml-card__metrics">
        <div className="prediccion-ml-card__metric-group">
          <div className="prediccion-ml-card__metric">
            <span className="prediccion-ml-card__metric-label">
              <Gauge size={16} /> IMC
            </span>
            <span className="prediccion-ml-card__metric-value">{prediccion.imc.toFixed(1)}</span>
          </div>
          <div className="prediccion-ml-card__metric">
            <span className="prediccion-ml-card__metric-label">
              <Zap size={16} /> Z-Score
            </span>
            <span className="prediccion-ml-card__metric-value">{prediccion.z.toFixed(2)}</span>
          </div>
          <div className="prediccion-ml-card__metric">
            <span className="prediccion-ml-card__metric-label">
              <TrendingUp size={16} /> P(Pico)
            </span>
            <span className="prediccion-ml-card__metric-value">{probabilidadPorcentaje}%</span>
          </div>
        </div>
      </div>

      {/* Barra de progreso de P(Pico) */}
      <div className="prediccion-ml-card__probability">
        <div className="prediccion-ml-card__progress-header">
          <span className="prediccion-ml-card__progress-label">Probabilidad de Pico Glucémico</span>
          <span className="prediccion-ml-card__progress-value">{probabilidadPorcentaje}%</span>
        </div>
        <div className="prediccion-ml-card__progress-bar">
          <div
            className="prediccion-ml-card__progress-fill"
            style={{
              width: `${probabilidadPorcentaje}%`,
              backgroundColor:
                probabilidadPorcentaje < 30 ? 'var(--green)' : probabilidadPorcentaje < 70 ? 'var(--orange)' : 'var(--red)',
            }}
          />
        </div>
      </div>

      {/* Acción Automatizada */}
      {prediccion.accionAutomatizada && (
        <div className="prediccion-ml-card__action">
          <div className="prediccion-ml-card__action-icon">ℹ️</div>
          <p className="prediccion-ml-card__action-text">{prediccion.accionAutomatizada}</p>
        </div>
      )}

      {/* Footer con versión del modelo */}
      <div className="prediccion-ml-card__footer">
        <span className="prediccion-ml-card__model-version">Modelo: {prediccion.modeloVersion}</span>
      </div>
    </div>
  );
}
