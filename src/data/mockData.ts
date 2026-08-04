export interface UserData {
  firstName: string;
  lastName: string;
  maternalLastName: string;
  email: string;
  plan: 'Gratis' | 'Familiar' | 'Pro';
}

export const mockUser: UserData = {
  firstName: 'Lizeth',
  lastName: 'Atanacacio',
  maternalLastName: '',
  email: 'lizeth@bioguard.com',
  plan: 'Gratis',
};

export interface Plan {
  id: string;
  label: string;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  benefits: string[];
  recommended: boolean;
}

export const plans: Plan[] = [
  {
    id: 'basic',
    label: 'BÁSICO',
    name: 'Gratis',
    monthlyPrice: 'Gratis',
    yearlyPrice: 'Gratis',
    benefits: [
      '1 paciente',
      '0 cuidadores',
      'Historial 30 días',
      'Alertas inteligentes',
    ],
    recommended: false,
  },
  {
    id: 'family',
    label: 'FAMILIAR',
    name: 'Familiar',
    monthlyPrice: '$10',
    yearlyPrice: '$8',
    benefits: [
      '1 paciente',
      '3 cuidadores',
      'Historial 15 días',
      'Alertas inteligentes',
    ],
    recommended: false,
  },
  {
    id: 'pro',
    label: 'PROFESIONAL',
    name: 'Pro',
    monthlyPrice: '$20',
    yearlyPrice: '$16',
    benefits: [
      '1 paciente',
      '6 cuidadores',
      'Historial 30 días',
      'GPS continuo',
      'Consola IA',
      'Alertas inteligentes',
    ],
    recommended: true,
  },
];

export interface MetricData {
  label: string;
  value: string;
  unit: string;
  iconBg: string;
  iconColor: string;
  hasData: boolean;
}

export const dashboardMetrics: MetricData[] = [
  { label: 'PULSO CARDÍACO', value: '--', unit: 'BPM', iconBg: 'var(--icon-bg-pulse)', iconColor: 'var(--danger)', hasData: false },
  { label: 'TEMPERATURA', value: '--', unit: '°C', iconBg: 'var(--icon-bg-temp)', iconColor: 'var(--cyan)', hasData: false },
  { label: 'SUDORACIÓN', value: '--', unit: 'µS', iconBg: 'var(--icon-bg-sweat)', iconColor: 'var(--purple)', hasData: false },
  { label: 'RIESGO IA', value: '--', unit: '%', iconBg: 'var(--icon-bg-ai)', iconColor: 'var(--success)', hasData: false },
];

export const subscriptionFeatures = [
  { label: 'Pacientes incluidos', value: '1' },
  { label: 'Cuidadores permitidos', value: '0' },
  { label: 'Historial de datos', value: '30 días' },
  { label: 'GPS Continuo', value: 'No incluido' },
  { label: 'Consola IA', value: 'No incluida' },
];

export const navItems = [
  { path: '/dashboard', label: 'Panel', icon: 'LayoutGrid' },
  { path: '/health', label: 'Salud', icon: 'Heart' },
  { path: '/security', label: 'Seguridad', icon: 'Lock' },
  { path: '/billing', label: 'Facturación', icon: 'CreditCard' },
] as const;

export const pageTitles: Record<string, string> = {
  '/dashboard': 'Panel Principal',
  '/health': 'Análisis Clínico y Reportes',
  '/security': 'Centro de Seguridad',
  '/billing': 'Centro de Facturación',
  '/settings': 'Ajustes',
};
