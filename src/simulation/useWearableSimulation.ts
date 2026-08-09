import { useState, useRef, useCallback, useEffect } from 'react';
import { simulateSensors, resetSimulator } from './sensorSimulator';
import { evaluateRisk, generateEventDescription } from './riskEngine';
import type {
  BiometricReading,
  SimulatedEvent,
  NivelRiesgo,
  WearableSimulationState,
} from './types';

const SENSOR_INTERVAL_MS = 1000;
const RISK_INTERVAL_MS = 3000;
const MAX_READINGS = 8640;
const MAX_EVENTS = 500;

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function useWearableSimulation() {
  const [state, setState] = useState<WearableSimulationState>({
    readings: [],
    latest: null,
    events: [],
    isRunning: false,
  });

  const prevBpmRef = useRef<number | null>(null);
  const prevTempRef = useRef<number | null>(null);
  const sensorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const riskIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    return () => {
      if (sensorIntervalRef.current) clearInterval(sensorIntervalRef.current);
      if (riskIntervalRef.current) clearInterval(riskIntervalRef.current);
    };
  }, []);

  const processReading = useCallback(() => {
    const sensorData = simulateSensors({
      bpm: prevBpmRef.current,
      temp: prevTempRef.current,
    });

    prevBpmRef.current = sensorData.bpm;
    prevTempRef.current = sensorData.temperatureC;

    const riskResult = evaluateRisk(sensorData);

    const reading: BiometricReading = {
      id: generateId(),
      pulsoBpm: sensorData.bpm,
      temperaturaC: sensorData.temperatureC,
      sudoracionGsr: sensorData.gsr,
      probabilidadPico: riskResult.probabilidad,
      timestamp: new Date().toISOString(),
      isSimulated: true,
      stressLevel: sensorData.stressLevel,
      nivelRiesgo: riskResult.nivel,
    };

    setState((prev) => {
      const newReadings = [...prev.readings, reading];
      if (newReadings.length > MAX_READINGS) {
        newReadings.splice(0, newReadings.length - MAX_READINGS);
      }

      let newEvents = prev.events;
      if (riskResult.nivel === 'CRITICO' || riskResult.nivel === 'MODERADO') {
        const event: SimulatedEvent = {
          id: generateId(),
          nivelRiesgo: riskResult.nivel === 'CRITICO' ? 'CRITICO' : 'MODERADO',
          probabilidadMl: riskResult.probabilidad,
          descripcion: generateEventDescription(
            riskResult.nivel,
            sensorData.bpm,
            sensorData.gsr,
            sensorData.temperatureC,
            riskResult.probabilidad,
          ),
          fechaEvento: reading.timestamp,
          atendida: false,
        };
        newEvents = [...prev.events, event];
        if (newEvents.length > MAX_EVENTS) {
          newEvents = newEvents.slice(-MAX_EVENTS);
        }
      }

      return {
        readings: newReadings,
        latest: reading,
        events: newEvents,
        isRunning: true,
      };
    });
  }, []);

  const startSimulation = useCallback((initialBpm?: number) => {
    if (sensorIntervalRef.current) return;

    resetSimulator(initialBpm);
    prevBpmRef.current = null;
    prevTempRef.current = null;

    setState({
      readings: [],
      latest: null,
      events: [],
      isRunning: false,
    });

    processReading();

    sensorIntervalRef.current = setInterval(processReading, SENSOR_INTERVAL_MS);
    riskIntervalRef.current = setInterval(() => {
    }, RISK_INTERVAL_MS);
  }, [processReading]);

  const stopSimulation = useCallback(() => {
    if (sensorIntervalRef.current) {
      clearInterval(sensorIntervalRef.current);
      sensorIntervalRef.current = null;
    }
    if (riskIntervalRef.current) {
      clearInterval(riskIntervalRef.current);
      riskIntervalRef.current = null;
    }
    setState((prev) => ({ ...prev, isRunning: false }));
  }, []);

  return {
    ...state,
    startSimulation,
    stopSimulation,
    processReading,
  };
}

export type { BiometricReading, SimulatedEvent, NivelRiesgo, WearableSimulationState };
