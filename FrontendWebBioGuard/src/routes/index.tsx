import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { AppLayout } from '../components/layout';
import { ProtectedRoute } from './guards';

import LicenciamientosPage from '../pages/public/Licenciamientos';
import CheckoutPage from '../pages/public/Checkout';
import SetupCompletePage from '../pages/public/SetupComplete';
import PagoExitoPage from '../pages/public/PagoExito';
import PagoCanceladoPage from '../pages/public/PagoCancelado';
import LoginPage from '../pages/auth/Login';
import RegisterPage from '../pages/auth/Register';
import VerifyEmailPage from '../pages/auth/VerifyEmail';
import ForgotPasswordPage from '../pages/auth/ForgotPassword';
import ResetPasswordPage from '../pages/auth/ResetPassword';
import DashboardPage from '../pages/app/Dashboard';
import SaludPage from '../pages/app/Salud';
import SeguridadPage from '../pages/app/Seguridad';
import FacturacionPage from '../pages/app/Facturacion';
import AjustesPage from '../pages/app/Ajustes';

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <Navigate to={ROUTES.LICENCIAMIENTOS} replace />,
  },
  {
    path: ROUTES.LICENCIAMIENTOS,
    element: <LicenciamientosPage />,
  },
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: ROUTES.REGISTRO,
    element: <RegisterPage />,
  },
  {
    path: ROUTES.CONFIRMAR_CORREO,
    element: <VerifyEmailPage />,
  },
  {
    path: ROUTES.OLVIDE_CONTRASENA,
    element: <ForgotPasswordPage />,
  },
  {
    path: ROUTES.REESTABLECER_CONTRASENA,
    element: <ResetPasswordPage />,
  },
  {
    path: ROUTES.PAGO_EXITO,
    element: <PagoExitoPage />,
  },
  {
    path: ROUTES.PAGO_CANCELADO,
    element: <PagoCanceladoPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: ROUTES.CHECKOUT, element: <CheckoutPage /> },
      { path: ROUTES.CONFIGURACION_COMPLETADA, element: <SetupCompletePage /> },
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
          { path: ROUTES.SALUD, element: <SaludPage /> },
          { path: ROUTES.SEGURIDAD, element: <SeguridadPage /> },
          { path: ROUTES.FACTURACION, element: <FacturacionPage /> },
          { path: ROUTES.AJUSTES, element: <AjustesPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 800, background: 'var(--gradient-cyan-blue)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Página no encontrada</p>
        </div>
      </div>
    ),
  },
]);
