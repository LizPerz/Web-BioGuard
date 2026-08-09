import { createContext, useEffect, type ReactNode } from 'react';
import { useWearableSimulation } from './useWearableSimulation';
import type { BiometricReading, SimulatedEvent } from './types';

interface SimulationContextValue {
  latest: BiometricReading | null;
  readings: BiometricReading[];
  events: SimulatedEvent[];
  isRunning: boolean;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { latest, readings, events, isRunning, startSimulation, stopSimulation } = useWearableSimulation();

  useEffect(() => {
    startSimulation();
    return () => stopSimulation();
  }, [startSimulation, stopSimulation]);

  return (
    <SimulationContext.Provider value={{ latest, readings, events, isRunning }}>
      {children}
    </SimulationContext.Provider>
  );
}

export { SimulationContext };
