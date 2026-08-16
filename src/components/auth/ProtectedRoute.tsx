import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '../../lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Barrera de autenticación: solo permite renderizar los hijos si existe una
 * sesión activa (access token). De lo contrario redirige a /login conservando
 * la ruta de origen para poder volver tras iniciar sesión.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
