import httpClient from '../utils/httpClient';
import {
  UsuarioPerfilResponse,
  UpdatePerfilRequest,
  CambiarCorreoRequest,
  CambiarPlanRequest,
  PlanResponse,
  MessageResponse,
} from '../types';

export const usuarioService = {
  miPerfil: async (): Promise<UsuarioPerfilResponse> => {
    const { data } = await httpClient.get<UsuarioPerfilResponse>('/api/UsuariosWeb/mi-perfil');
    return data;
  },

  editarPerfil: async (dto: UpdatePerfilRequest): Promise<MessageResponse> => {
    const { data } = await httpClient.put<MessageResponse>('/api/UsuariosWeb/mi-perfil', dto);
    return data;
  },

  cambiarCorreo: async (dto: CambiarCorreoRequest): Promise<MessageResponse> => {
    const { data } = await httpClient.put<MessageResponse>('/api/UsuariosWeb/mi-perfil/correo', dto);
    return data;
  },

  miPlan: async (): Promise<PlanResponse> => {
    const { data } = await httpClient.get<PlanResponse>('/api/UsuariosWeb/mi-plan');
    return data;
  },

  cambiarPlan: async (dto: CambiarPlanRequest): Promise<MessageResponse> => {
    const { data } = await httpClient.put<MessageResponse>('/api/UsuariosWeb/cambiar-plan', dto);
    return data;
  },

  eliminarCuenta: async (): Promise<void> => {
    await httpClient.delete('/api/UsuariosWeb/mi-cuenta');
  },

  subirFoto: async (fotoBase64: string): Promise<MessageResponse> => {
    const { data } = await httpClient.put<MessageResponse>('/api/UsuariosWeb/mi-perfil/foto', { fotoBase64 });
    return data;
  },
};
