import httpClient from '../utils/httpClient';
import { PlanResponse, CrearSesionPagoRequest, CrearSesionPagoResponse, PagoResponse, ReciboResponse, MessageResponse } from '../types';

export const planService = {
  listar: async (): Promise<PlanResponse[]> => {
    const { data } = await httpClient.get<PlanResponse[]>('/api/Planes');
    return data;
  },

  getById: async (id: string): Promise<PlanResponse> => {
    const { data } = await httpClient.get<PlanResponse>(`/api/Planes/${id}`);
    return data;
  },
};

export const pagoService = {
  crearSesion: async (data: CrearSesionPagoRequest): Promise<CrearSesionPagoResponse> => {
    const { data: res } = await httpClient.post<CrearSesionPagoResponse>('/api/Pagos/crear-sesion', { ...data, metodoPago: 'stripe' });
    return res;
  },

  historial: async (): Promise<PagoResponse[]> => {
    const { data } = await httpClient.get<PagoResponse[]>('/api/Pagos/historial');
    return data;
  },

  recibo: async (id: string): Promise<ReciboResponse> => {
    const { data } = await httpClient.get<ReciboResponse>(`/api/Pagos/${id}/recibo`);
    return data;
  },

  cancelar: async (): Promise<MessageResponse> => {
    const { data } = await httpClient.post<MessageResponse>('/api/Pagos/cancelar');
    return data;
  },
};
