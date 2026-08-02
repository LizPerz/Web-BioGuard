import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AuthResponse, LoginWebRequest, RegisterWebRequest } from '../types';
import { TOKEN_KEY, USER_KEY, REFRESH_TOKEN_KEY } from '../constants';
import { authService } from '../services/authService';
import { usuarioService } from '../services/usuarioService';

interface AuthContextType {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginWebRequest) => Promise<void>;
  register: (data: RegisterWebRequest) => Promise<AuthResponse>;
  logout: () => void;
  updateUser: (data: Partial<AuthResponse>) => void;
  refreshPlan: () => Promise<void>;
  photoUrl: string;
  setPhotoUrl: (url: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState(localStorage.getItem('bioguard_photo') || '');

  useEffect(() => {
    const stored = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (data: LoginWebRequest) => {
    const response = await authService.login(data);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response));
    setUser(response);
  }, []);

  const register = useCallback(async (data: RegisterWebRequest): Promise<AuthResponse> => {
    const response = await authService.register(data);
    if (response.token && response.token !== 'pending_verification' && !(response as any).requiresVerification) {
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response));
      setUser(response);
    }
    return response;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const updateUser = useCallback((data: Partial<AuthResponse>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshPlan = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    try {
      const plan = await usuarioService.miPlan();
      updateUser({ plan: plan.nombre });
    } catch {
      // token inválido o sin sesión: ignorar silenciosamente
    }
  }, [updateUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        refreshPlan,
        photoUrl,
        setPhotoUrl: (url: string) => { localStorage.setItem('bioguard_photo', url); setPhotoUrl(url); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
