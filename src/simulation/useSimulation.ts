import { useContext } from 'react';
import { SimulationContext } from './SimulationProvider';
import type { BiometricReading, SimulatedEvent } from './types';

interface SimulationContextValue {
  latest: BiometricReading | null;
  readings: BiometricReading[];
  events: SimulatedEvent[];
  isRunning: boolean;
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error('useSimulation debe usarse dentro de un SimulationProvider');
  }
  return ctx;
}
