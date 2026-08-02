import httpClient from '../utils/httpClient';
import { PacienteResponse, CrearPacienteRequest, UpdateBiometriaRequest, UpdateNombreRequest, MessageResponse, DispositivoResponse } from '../types';

export const pacienteService = {
  miPaciente: async (): Promise<PacienteResponse> => {
    const { data } = await httpClient.get<PacienteResponse>('/api/Pacientes/mi-paciente');
    return data;
  },

  getById: async (id: string): Promise<PacienteResponse> => {
    const { data } = await httpClient.get<PacienteResponse>(`/api/Pacientes/${id}`);
    return data;
  },

  getByUsuario: async (usuarioWebId: string): Promise<PacienteResponse[]> => {
    const { data } = await httpClient.get<PacienteResponse[]>(`/api/Pacientes/by-usuario/${usuarioWebId}`);
    return data;
  },

  crear: async (dto: CrearPacienteRequest): Promise<{ message: string; codigoAccesoQr: string }> => {
    const { data } = await httpClient.post('/api/Pacientes', dto);
    return data;
  },

  editar: async (id: string, dto: UpdateNombreRequest): Promise<MessageResponse> => {
    const { data } = await httpClient.put<MessageResponse>(`/api/Pacientes/${id}`, dto);
    return data;
  },

  eliminar: async (id: string): Promise<void> => {
    await httpClient.delete(`/api/Pacientes/${id}`);
  },

  updateBiometria: async (id: string, dto: UpdateBiometriaRequest): Promise<MessageResponse> => {
    const { data } = await httpClient.put<MessageResponse>(`/api/Pacientes/${id}/biometria`, dto);
    return data;
  },

  getDispositivo: async (id: string): Promise<DispositivoResponse> => {
    const { data } = await httpClient.get<DispositivoResponse>(`/api/Pacientes/${id}/dispositivo`);
    return data;
  },

  obtenerQR: async (id: string): Promise<{ codigoAccesoQr: string }> => {
    const { data } = await httpClient.get(`/api/Pacientes/${id}/qr`);
    return data;
  },
};
