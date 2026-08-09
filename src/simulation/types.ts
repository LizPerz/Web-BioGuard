export interface LecturaSensores {
  bpm: number;
  temperatura: number;
  sudoracionGsr: number;
  nivelRiesgo: 'Relajado' | 'Estres Moderado' | 'Estres Alto';
  timestamp: number;
}

export interface LecturaBatch {
  lecturas: LecturaSensores[];
}

export interface HeartbeatData {
  bateria: number;
  sensoresActivos: string[];
  timestamp: number;
}

export interface BiometricSummary {
  pulso: { current: number | null; avg: number | null; min: number | null; max: number | null; history: number[] };
  temperatura: { current: number | null; avg: number | null; min: number | null; max: number | null; history: number[] };
  sudoracion: { current: number | null; avg: number | null; min: number | null; max: number | null; history: number[] };
  riesgoIA: { current: number | null; history: number[] };
  totalLecturas: number;
  ultimaLectura: LecturaSensores | null;
  historial: LecturaSensores[];
}
