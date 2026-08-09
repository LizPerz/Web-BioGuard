export { useWearableSimulation } from './useWearableSimulation';
export { SimulationProvider } from './SimulationProvider';
export { useSimulation } from './useSimulation';
export { simulateSensors, simulateBpm, simulateTemperature, calculateGsrFromHrv, resetSimulator } from './sensorSimulator';
export { evaluateRisk, generateEventDescription } from './riskEngine';
export type {
  SensorData,
  StressLevel,
  BiometricReading,
  SimulatedEvent,
  NivelRiesgo,
  RiskResult,
  WearableSimulationState,
} from './types';
