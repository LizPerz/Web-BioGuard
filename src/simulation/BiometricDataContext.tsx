import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { LecturaSensores, BiometricSummary, HeartbeatData } from './types';
import { generateLectura, generateHeartbeat, calculateRiesgoIA, startModeCycle, stopModeCycle, setSimMode } from './biometricSimulator';

interface BiometricContextValue {
  summary: BiometricSummary;
  heartbeat: HeartbeatData | null;
  isRunning: boolean;
  modo: string;
  startSimulation: () => void;
  stopSimulation: () => void;
  cambiarModo: (modo: string) => void;
}

function createEmptySummary(): BiometricSummary {
  return {
    pulso: { current: null, avg: null, min: null, max: null, history: [] },
    temperatura: { current: null, avg: null, min: null, max: null, history: [] },
    sudoracion: { current: null, avg: null, min: null, max: null, history: [] },
    riesgoIA: { current: null, history: [] },
    totalLecturas: 0,
    ultimaLectura: null,
    historial: [],
  };
}

function calcStats(arr: number[]) {
  if (!arr.length) return { avg: null, min: null, max: null };
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round((sum / arr.length) * 10) / 10,
    min: Math.min(...arr),
    max: Math.max(...arr),
  };
}

function updateSummary(prev: BiometricSummary, lectura: LecturaSensores): BiometricSummary {
  const riesgo = calculateRiesgoIA(lectura);
  const maxHistory = 200;

  const newPulso = [...prev.pulso.history, lectura.bpm].slice(-maxHistory);
  const newTemp = [...prev.temperatura.history, lectura.temperatura].slice(-maxHistory);
  const newGsr = [...prev.sudoracion.history, lectura.sudoracionGsr].slice(-maxHistory);
  const newRiesgo = [...prev.riesgoIA.history, riesgo].slice(-maxHistory);

  return {
    pulso: {
      current: lectura.bpm,
      ...calcStats(newPulso),
      history: newPulso,
    },
    temperatura: {
      current: lectura.temperatura,
      ...calcStats(newTemp),
      history: newTemp,
    },
    sudoracion: {
      current: lectura.sudoracionGsr,
      ...calcStats(newGsr),
      history: newGsr,
    },
    riesgoIA: {
      current: riesgo,
      history: newRiesgo,
    },
    totalLecturas: prev.totalLecturas + 1,
    ultimaLectura: lectura,
    historial: [...prev.historial, lectura].slice(-maxHistory),
  };
}

const BiometricContext = createContext<BiometricContextValue | null>(null);

export function BiometricProvider({ children }: { children: React.ReactNode }) {
  const [summary, setSummary] = useState<BiometricSummary>(createEmptySummary);
  const [heartbeat, setHeartbeat] = useState<HeartbeatData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [modo, setModo] = useState('normal');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hbIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (hbIntervalRef.current) { clearInterval(hbIntervalRef.current); hbIntervalRef.current = null; }
    stopModeCycle();
  }, []);

  const startSimulation = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    startModeCycle();

    intervalRef.current = setInterval(() => {
      const lectura = generateLectura();
      setSummary(prev => updateSummary(prev, lectura));
    }, 1500);

    hbIntervalRef.current = setInterval(() => {
      setHeartbeat(generateHeartbeat());
    }, 10000);
  }, [isRunning]);

  const stopSimulation = useCallback(() => {
    stopAll();
    setIsRunning(false);
    setSummary(createEmptySummary());
    setHeartbeat(null);
  }, [stopAll]);

  const cambiarModo = useCallback((nuevoModo: string) => {
    setModo(nuevoModo);
    setSimMode(nuevoModo as 'normal' | 'exercise' | 'stress' | 'random');
  }, []);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  return (
    <BiometricContext.Provider
      value={{ summary, heartbeat, isRunning, modo, startSimulation, stopSimulation, cambiarModo }}
    >
      {children}
    </BiometricContext.Provider>
  );
}

export function useBiometricData() {
  const ctx = useContext(BiometricContext);
  if (!ctx) throw new Error('useBiometricData debe usarse dentro de BiometricProvider');
  return ctx;
}
