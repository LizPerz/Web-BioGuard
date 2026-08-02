import httpClient from '../utils/httpClient';
import { CuidadorResponse, CrearCuidadorRequest, ActualizarCuidadorRequest, MessageResponse } from '../types';

export const cuidadorService = {
  listar: async (): Promise<CuidadorResponse[]> => {
    const { data } = await httpClient.get<CuidadorResponse[]>('/api/Cuidadores');
    return data;
  },

  getByPaciente: async (pacienteId: string): Promise<CuidadorResponse[]> => {
    const { data } = await httpClient.get<CuidadorResponse[]>(`/api/Cuidadores/by-paciente/${pacienteId}`);
    return data;
  },

  getById: async (id: string): Promise<CuidadorResponse> => {
    const { data } = await httpClient.get<CuidadorResponse>(`/api/Cuidadores/${id}`);
    return data;
  },

  crear: async (dto: CrearCuidadorRequest): Promise<{ cuidadorId: string; codigoAccesoQr: string; message: string }> => {
    const { data } = await httpClient.post('/api/Cuidadores', dto);
    return data;
  },

  editar: async (id: string, dto: ActualizarCuidadorRequest): Promise<MessageResponse> => {
    const { data } = await httpClient.put<MessageResponse>(`/api/Cuidadores/${id}`, dto);
    return data;
  },

  eliminar: async (id: string): Promise<void> => {
    await httpClient.delete(`/api/Cuidadores/${id}`);
  },
};
