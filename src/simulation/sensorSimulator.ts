import type { SensorData, StressLevel } from './types';

const BPM_MIN = 55;
const BPM_MAX = 100;
const BPM_DEFAULT = 75;
const TEMP_MIN = 35.5;
const TEMP_MAX = 37.8;
const TEMP_BASE = 36.7;
const IBI_BUFFER_SIZE = 60;

let ibiBuffer: number[] = [];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function gaussianRandom(mean = 0, stdev = 1): number {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

export function resetSimulator(initialBpm = BPM_DEFAULT): void {
  ibiBuffer = [];
  const baseIbi = 60000 / initialBpm;
  for (let i = 0; i < IBI_BUFFER_SIZE; i++) {
    ibiBuffer.push(baseIbi + gaussianRandom(0, baseIbi * 0.05));
  }
}

export function simulateBpm(previousBpm: number | null): number {
  const base = previousBpm ?? BPM_DEFAULT;
  const stepMagnitude = 2 + Math.random() * 3;
  const step = (Math.random() - 0.5) * 2 * stepMagnitude;

  let newBpm = base + step;

  if (newBpm > BPM_MAX) {
    newBpm = BPM_MAX - Math.random() * 3;
  } else if (newBpm < BPM_MIN) {
    newBpm = BPM_MIN + Math.random() * 3;
  }

  const smoothed = base * 0.7 + newBpm * 0.3;

  return Math.round(clamp(smoothed, BPM_MIN, BPM_MAX));
}

export function simulateTemperature(bpm: number, previousTemp: number | null): number {
  const timeMs = Date.now();
  const sine = Math.sin((timeMs / 1000) * Math.PI * 2 / 15);

  const bpmFactor = (bpm - 75) / 25;
  const noise = gaussianRandom(0, 0.08);

  const baseTemp = previousTemp ?? TEMP_BASE;
  const sineComponent = sine * 0.15;
  const bpmComponent = bpmFactor * 0.1;
  const noiseComponent = noise;

  const targetTemp = TEMP_BASE + sineComponent + bpmComponent + noiseComponent;
  const smoothed = baseTemp * 0.85 + targetTemp * 0.15;

  return parseFloat(clamp(smoothed, TEMP_MIN, TEMP_MAX).toFixed(1));
}

export function calculateGsrFromHrv(bpm: number): { gsr: number; stressLevel: StressLevel } {
  const ibi = 60000 / bpm;

  ibiBuffer.push(ibi);
  if (ibiBuffer.length > IBI_BUFFER_SIZE) {
    ibiBuffer = ibiBuffer.slice(-IBI_BUFFER_SIZE);
  }

  if (ibiBuffer.length < 2) {
    return { gsr: 25, stressLevel: 'Relajado' };
  }

  let ssd = 0;
  for (let i = 1; i < ibiBuffer.length; i++) {
    const diff = ibiBuffer[i] - ibiBuffer[i - 1];
    ssd += diff * diff;
  }
  const rmssd = Math.sqrt(ssd / (ibiBuffer.length - 1));

  const meanIbi = ibiBuffer.reduce((a, b) => a + b, 0) / ibiBuffer.length;
  let variance = 0;
  for (let i = 0; i < ibiBuffer.length; i++) {
    variance += (ibiBuffer[i] - meanIbi) ** 2;
  }
  const sdnn = Math.sqrt(variance / ibiBuffer.length);

  const rmssdNormalized = clamp(rmssd / 100, 0, 1);
  const sdnnNormalized = clamp(sdnn / 80, 0, 1);
  const hrvIndex = 1 - (rmssdNormalized * 0.4 + sdnnNormalized * 0.3);

  const hrvNoise = gaussianRandom(0, 0.05);
  const bpmStress = clamp((bpm - 55) / 45, 0, 1);
  const compositeStress = hrvIndex * 0.5 + bpmStress * 0.3 + hrvNoise * 0.2;

  const gsr = clamp(compositeStress, 0.05, 0.95);
  const gsrValue = parseFloat((gsr * 100).toFixed(1));

  let stressLevel: StressLevel;
  if (gsr > 0.6) {
    stressLevel = 'Alto';
  } else if (gsr > 0.3) {
    stressLevel = 'Moderado';
  } else {
    stressLevel = 'Relajado';
  }

  return { gsr: gsrValue, stressLevel };
}

export function simulateSensors(previous: { bpm: number | null; temp: number | null }): SensorData {
  const bpm = simulateBpm(previous.bpm);
  const temperatureC = simulateTemperature(bpm, previous.temp);
  const { gsr, stressLevel } = calculateGsrFromHrv(bpm);

  return {
    bpm,
    temperatureC,
    gsr,
    isSimulated: true,
    stressLevel,
  };
}

resetSimulator();
