import type { LecturaSensores, HeartbeatData } from './types';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function noise(base: number, range: number) {
  return base + (Math.random() - 0.5) * range * 2;
}

let timeOffset = 0;

type SimMode = 'normal' | 'exercise' | 'stress' | 'random';

let currentMode: SimMode = 'normal';
let modeTimer = 0;

export function setSimMode(mode: SimMode) {
  currentMode = mode;
  modeTimer = 0;
}

export function generateLectura(): LecturaSensores {
  timeOffset += 1.5;
  modeTimer++;

  if (currentMode === 'random' && modeTimer > 20) {
    const modes: SimMode[] = ['normal', 'exercise', 'stress'];
    currentMode = modes[Math.floor(Math.random() * modes.length)];
    modeTimer = 0;
  }

  let bpmBase: number;
  let tempBase: number;
  let gsrBase: number;

  switch (currentMode) {
    case 'exercise':
      bpmBase = 120;
      tempBase = 37.2;
      gsrBase = 55;
      break;
    case 'stress':
      bpmBase = 95;
      tempBase = 36.9;
      gsrBase = 70;
      break;
    default:
      bpmBase = 72;
      tempBase = 36.5;
      gsrBase = 18;
  }

  const bpm = clamp(noise(bpmBase, 6), 40, 200);
  const temperatura = clamp(noise(tempBase, 0.3), 35.5, 37.8);
  const sudoracionGsr = clamp(noise(gsrBase, 8), 1, 100);

  let nivelRiesgo: LecturaSensores['nivelRiesgo'];
  if (sudoracionGsr >= 60) nivelRiesgo = 'Estres Alto';
  else if (sudoracionGsr >= 25) nivelRiesgo = 'Estres Moderado';
  else nivelRiesgo = 'Relajado';

  return {
    bpm: Math.round(bpm * 10) / 10,
    temperatura: Math.round(temperatura * 10) / 10,
    sudoracionGsr: Math.round(sudoracionGsr * 10) / 10,
    nivelRiesgo,
    timestamp: Date.now(),
  };
}

export function generateHeartbeat(): HeartbeatData {
  return {
    bateria: clamp(100 - timeOffset * 0.001, 5, 100),
    sensoresActivos: ['HEART_RATE_BPM', 'TEMPERATURE'],
    timestamp: Date.now(),
  };
}

export function calculateRiesgoIA(lectura: LecturaSensores): number {
  const normBpm = (lectura.bpm - 70) / 50;
  const normGsr = (lectura.sudoracionGsr - 25) / 50;
  const normTemp = Math.abs(lectura.temperatura - 36.5) / 2;

  const z = -2.0 + 1.5 * normBpm + 1.0 * normGsr + 1.5 * normTemp;
  const probability = 1 / (1 + Math.exp(-z));

  return Math.round(probability * 1000) / 10;
}

let modeCycleInterval: ReturnType<typeof setInterval> | null = null;

export function startModeCycle() {
  if (modeCycleInterval) return;
  modeCycleInterval = setInterval(() => {
    const modes: SimMode[] = ['normal', 'normal', 'normal', 'exercise', 'stress'];
    setSimMode(modes[Math.floor(Math.random() * modes.length)]);
  }, 15000);
}

export function stopModeCycle() {
  if (modeCycleInterval) {
    clearInterval(modeCycleInterval);
    modeCycleInterval = null;
  }
  setSimMode('normal');
}
