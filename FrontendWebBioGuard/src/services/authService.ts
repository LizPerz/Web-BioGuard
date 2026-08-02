import httpClient from '../utils/httpClient';
import {
  AuthResponse,
  LoginWebRequest,
  RegisterWebRequest,
  Enviar2FARequest,
  Verificar2FARequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  CambiarPasswordRequest,
  MessageResponse,
} from '../types';

export const authService = {
  login: async (data: LoginWebRequest): Promise<AuthResponse> => {
    const { data: res } = await httpClient.post<AuthResponse>('/api/Auth/login-web', data);
    return res;
  },

  register: async (data: RegisterWebRequest): Promise<AuthResponse> => {
    const { data: res } = await httpClient.post<AuthResponse>('/api/Auth/register', data);
    return res;
  },

  enviar2FA: async (data: Enviar2FARequest): Promise<MessageResponse> => {
    const { data: res } = await httpClient.post<MessageResponse>('/api/Auth/2FA/enviar', data);
    return res;
  },

  verificar2FA: async (data: Verificar2FARequest): Promise<AuthResponse> => {
    const { data: res } = await httpClient.post<AuthResponse>('/api/Auth/2FA/verificar', data);
    return res;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<MessageResponse> => {
    const { data: res } = await httpClient.post<MessageResponse>('/api/Auth/forgot-password', data);
    return res;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<MessageResponse> => {
    const { data: res } = await httpClient.post<MessageResponse>('/api/Auth/reset-password', data);
    return res;
  },

  cambiarPassword: async (data: CambiarPasswordRequest): Promise<MessageResponse> => {
    const { data: res } = await httpClient.put<MessageResponse>('/api/Auth/cambiar-password', data);
    return res;
  },

  loginCodigo: async (codigoAcceso: string): Promise<AuthResponse> => {
    const { data: res } = await httpClient.post<AuthResponse>('/api/Auth/login-codigo', { codigoAcceso });
    return res;
  },
};
