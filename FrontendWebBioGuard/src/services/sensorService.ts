import httpClient from '../utils/httpClient';
import {
  LecturaSensorResponse,
  EstadisticasResponse,
  TendenciaItem,
  EventoMetabolicoResponse,
  TrackingResponse,
} from '../types';

export const sensorService = {
  getLecturas: async (pacienteId: string, limite = 100): Promise<LecturaSensorResponse[]> => {
    const { data } = await httpClient.get<LecturaSensorResponse[]>(
      `/api/Sensores/lecturas/${pacienteId}?limite=${limite}`
    );
    return data;
  },

  getLecturasRango: async (pacienteId: string, desde: string, hasta: string): Promise<LecturaSensorResponse[]> => {
    const { data } = await httpClient.get<LecturaSensorResponse[]>(
      `/api/Sensores/lecturas/${pacienteId}/rango?desde=${desde}&hasta=${hasta}`
    );
    return data;
  },

  getEstadisticas: async (pacienteId: string): Promise<EstadisticasResponse> => {
    const { data } = await httpClient.get<EstadisticasResponse>(
      `/api/Sensores/estadisticas/${pacienteId}`
    );
    return data;
  },

  getTendencia: async (pacienteId: string, periodo = 'semanal'): Promise<TendenciaItem[]> => {
    const { data } = await httpClient.get<TendenciaItem[]>(
      `/api/Sensores/estadisticas/${pacienteId}/tendencia?periodo=${periodo}`
    );
    return data;
  },

  getEventos: async (pacienteId: string, limite = 50): Promise<EventoMetabolicoResponse[]> => {
    const { data } = await httpClient.get<EventoMetabolicoResponse[]>(
      `/api/Sensores/eventos/${pacienteId}?limite=${limite}`
    );
    return data;
  },

  getEventosResumen: async (pacienteId: string): Promise<{ total: number; criticos: number; prePico: number; normal: number; atendidos: number }> => {
    const { data } = await httpClient.get(
      `/api/Sensores/eventos/${pacienteId}/resumen`
    );
    return data;
  },

  getTrackingActual: async (pacienteId: string): Promise<TrackingResponse> => {
    const { data } = await httpClient.get<TrackingResponse>(
      `/api/Sensores/tracking/${pacienteId}/actual`
    );
    return data;
  },

  getTrackingRuta: async (pacienteId: string, desde: string, hasta: string): Promise<TrackingResponse[]> => {
    const { data } = await httpClient.get<TrackingResponse[]>(
      `/api/Sensores/tracking/${pacienteId}/ruta?desde=${desde}&hasta=${hasta}`
    );
    return data;
  },

  exportarPDF: async (pacienteId: string): Promise<{ message: string; descargaUrl: string }> => {
    const { data } = await httpClient.get(
      `/api/Sensores/lecturas/${pacienteId}/exportar-pdf`
    );
    return data;
  },
};

export const reporteService = {
  getResumen: async (pacienteId: string) => {
    const { data } = await httpClient.get(`/api/Reportes/resumen/${pacienteId}`);
    return data;
  },

  getHistorialAlertas: async (pacienteId: string, limite = 100) => {
    const { data } = await httpClient.get(`/api/Reportes/historial-alertas/${pacienteId}?limite=${limite}`);
    return data;
  },

  getHistorialEventos: async (pacienteId: string, limite = 100) => {
    const { data } = await httpClient.get(`/api/Reportes/historial-eventos/${pacienteId}?limite=${limite}`);
    return data;
  },

  getHistorialMedicamentos: async (pacienteId: string) => {
    const { data } = await httpClient.get(`/api/Reportes/historial-medicamentos/${pacienteId}`);
    return data;
  },

  getHistorialLecturas: async (pacienteId: string, limite = 500) => {
    const { data } = await httpClient.get(`/api/Reportes/historial-lecturas/${pacienteId}?limite=${limite}`);
    return data;
  },
};

export const mlService = {
  getPredicciones: async (pacienteId: string) => {
    const { data } = await httpClient.get(`/api/ML/predicciones/${pacienteId}`);
    return data;
  },

  getPrediccionActual: async (pacienteId: string) => {
    const { data } = await httpClient.get(`/api/ML/predicciones/${pacienteId}/actual`);
    return data;
  },

  getRecomendaciones: async (pacienteId: string) => {
    const { data } = await httpClient.get(`/api/ML/recomendaciones/${pacienteId}`);
    return data;
  },

  getModelos: async () => {
    const { data } = await httpClient.get('/api/ML/modelos');
    return data;
  },

  diagnosticar: async (pacienteId: string) => {
    const { data } = await httpClient.post('/api/ML/diagnosticar', { pacienteId });
    return data;
  },
};
