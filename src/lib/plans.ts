import type { PlanResponse } from './api';

export interface FeatureItem {
  label: string;
  value: string;
}

export const featuresDe = (p: PlanResponse): FeatureItem[] => [
  { label: 'Pacientes incluidos', value: String(p.limitePacientes) },
  { label: 'Cuidadores permitidos', value: String(p.limiteCuidadores) },
  { label: 'Reporte diario', value: 'Incluido' },
  { label: 'Historial de datos', value: `${p.diasHistorial} días` },
  { label: 'GPS Continuo', value: p.gpsContinuo ? 'Incluido' : 'No incluido' },
  { label: 'Consola IA', value: p.aiConsole ? 'Incluida' : 'No incluida' },
];

export const precioTexto = (p: PlanResponse): string =>
  p.precio <= 0 ? 'Gratis' : `$${p.precio} ${p.precioMoneda}`;

export const beneficiosDe = (p: PlanResponse): string[] => [
  `${p.limitePacientes} paciente${p.limitePacientes === 1 ? '' : 's'}`,
  `${p.limiteCuidadores} cuidador${p.limiteCuidadores === 1 ? '' : 'es'}`,
  'Reporte diario',
  `Historial ${p.diasHistorial} días`,
  p.gpsContinuo ? 'GPS continuo' : 'Sin GPS continuo',
  p.aiConsole ? 'Consola IA' : 'Sin Consola IA',
];

export const beneficiosCompletos = (p: PlanResponse): string[] =>
  featuresDe(p).map((f) => `${f.label}: ${f.value}`);
