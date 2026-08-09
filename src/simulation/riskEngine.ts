import type { SensorData, NivelRiesgo, RiskResult } from './types';

const BMI_DEFAULT = 25;

const BPM_MEAN = 75;
const TEMP_MEAN = 36.7;

const BETA_0 = -4.5;
const BETA_BPM = 3.8;
const BETA_GSR = 3.2;
const BETA_TEMP = -1.5;
const BETA_BMI = 0.4;

const CRITICAL_THRESHOLD = 0.85;
const MODERATE_THRESHOLD = 0.5;

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function normalizeBpm(bpm: number): number {
  return (bpm - BPM_MEAN) / 25;
}

function normalizeGsr(gsr: number): number {
  return (gsr - 50) / 50;
}

function normalizeTemp(temp: number): number {
  return (temp - TEMP_MEAN) / 1.0;
}

function normalizeBmi(bmi: number): number {
  return (bmi - 25) / 10;
}

export function evaluateRisk(sensorData: SensorData, bmi: number = BMI_DEFAULT): RiskResult {
  const { bpm, temperatureC: temp, gsr } = sensorData;

  const bpmNorm = normalizeBpm(bpm);
  const gsrNorm = normalizeGsr(gsr);
  const tempNorm = normalizeTemp(temp);
  const bmiNorm = normalizeBmi(bmi);

  const z = BETA_0 + BETA_BPM * bpmNorm + BETA_GSR * gsrNorm + BETA_TEMP * tempNorm + BETA_BMI * bmiNorm;
  const logisticProbability = sigmoid(z);

  let nivel: NivelRiesgo;
  let adjustedProbability = logisticProbability;

  if (bpm > 110 || temp < 35 || gsr > 80) {
    nivel = 'CRITICO';
    adjustedProbability = Math.max(logisticProbability, 0.90);
  } else if (logisticProbability >= CRITICAL_THRESHOLD) {
    nivel = 'CRITICO';
  } else if (
    bpm > 95 ||
    temp > 37.5 ||
    gsr > 65 ||
    logisticProbability >= MODERATE_THRESHOLD
  ) {
    nivel = 'MODERADO';
  } else if (bpm > 85 || gsr > 48) {
    nivel = 'MODERADO';
    adjustedProbability = Math.min(logisticProbability + 0.1, CRITICAL_THRESHOLD - 0.01);
  } else {
    nivel = 'OPTIMO';
  }

  return {
    nivel,
    probabilidad: Math.round(adjustedProbability * 1000) / 1000,
    bpmWeight: BETA_BPM * bpmNorm,
    gsrWeight: BETA_GSR * gsrNorm,
    tempWeight: BETA_TEMP * tempNorm,
  };
}

export function generateEventDescription(
  nivel: NivelRiesgo,
  bpm: number,
  gsr: number,
  temp: number,
  probability: number,
): string {
  const pct = Math.round(probability * 100);

  switch (nivel) {
    case 'CRITICO':
      if (bpm > 110) {
        return `Taquicardia detectada (${bpm} BPM). GSR: ${gsr} µS. Riesgo de pico glucémico.`;
      }
      if (temp < 35) {
        return `Hipotermia detectada (${temp}°C). Posible descompensación metabólica.`;
      }
      return `Alerta crítica: probabilidad de evento del ${pct}%. BPM: ${bpm}, GSR: ${gsr} µS.`;
    case 'MODERADO':
      return `Niveles elevados: pulso ${bpm} BPM, estrés ${gsr} µS. Probabilidad de pico: ${pct}%.`;
    case 'OPTIMO':
      return `Parámetros normales. Pulso ${bpm} BPM, temperatura ${temp}°C.`;
  }
}
