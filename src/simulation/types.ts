export interface SensorData {
  bpm: number;
  temperatureC: number;
  gsr: number;
  isSimulated: boolean;
  stressLevel: StressLevel;
}

export type StressLevel = 'Relajado' | 'Moderado' | 'Alto';

export interface BiometricReading {
  id: string;
  pulsoBpm: number;
  temperaturaC: number;
  sudoracionGsr: number;
  probabilidadPico: number;
  timestamp: string;
  isSimulated: boolean;
  stressLevel: StressLevel;
  nivelRiesgo: NivelRiesgo;
}

export type NivelRiesgo = 'OPTIMO' | 'MODERADO' | 'CRITICO';

export interface SimulatedEvent {
  id: string;
  nivelRiesgo: NivelRiesgo;
  probabilidadMl: number;
  descripcion: string;
  fechaEvento: string;
  atendida: boolean;
}

export interface RiskResult {
  nivel: NivelRiesgo;
  probabilidad: number;
  bpmWeight: number;
  gsrWeight: number;
  tempWeight: number;
}

export interface WearableSimulationState {
  readings: BiometricReading[];
  latest: BiometricReading | null;
  events: SimulatedEvent[];
  isRunning: boolean;
}
