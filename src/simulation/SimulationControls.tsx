import { useBiometricData } from './BiometricDataContext';
import './simulation.css';

const modes = [
  { value: 'normal', label: 'Normal' },
  { value: 'exercise', label: 'Ejercicio' },
  { value: 'stress', label: 'Estrés' },
  { value: 'random', label: 'Aleatorio' },
];

export function SimulationControls() {
  const { isRunning, modo, startSimulation, stopSimulation, cambiarModo } = useBiometricData();

  return (
    <div className="sim-controls">
      <div className="sim-controls__status">
        <span className={`sim-controls__dot ${isRunning ? 'sim-controls__dot--live' : 'sim-controls__dot--off'}`} />
        <span className="sim-controls__label">
          {isRunning ? 'Simulación activa' : 'Simulación detenida'}
        </span>
      </div>
      <div className="sim-controls__actions">
        {isRunning ? (
          <button className="sim-btn sim-btn--stop" onClick={stopSimulation}>
            Detener
          </button>
        ) : (
          <button className="sim-btn sim-btn--start" onClick={startSimulation}>
            Iniciar simulación
          </button>
        )}
      </div>
      {isRunning && (
        <div className="sim-controls__modes">
          {modes.map((m) => (
            <button
              key={m.value}
              className={`sim-btn sim-btn--mode ${modo === m.value ? 'sim-btn--active' : ''}`}
              onClick={() => cambiarModo(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
