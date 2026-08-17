import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { ForgotPassword } from './pages/ForgotPassword/ForgotPassword';
import { VerifyEmail } from './pages/VerifyEmail/VerifyEmail';
import { Verify2FA } from './pages/Verify2FA/Verify2FA';
import { ResetPassword } from './pages/ResetPassword/ResetPassword';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Health } from './pages/Health/Health';
import { Pacientes } from './pages/Pacientes/Pacientes';
import { Billing } from './pages/Billing/Billing';
import { SelectPlan } from './pages/Plans/SelectPlan';
import { Settings } from './pages/Settings/Settings';
import { BiometricProvider, SimDashboard, SimHealth } from './simulation';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { setOnUnauthorizedHandler } from './lib/api';
import { onLogoutFromOtherTab, clearSession } from './lib/auth';

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect to /login on 401 from any API call
    setOnUnauthorizedHandler(() => navigate('/login', { replace: true }));

    // Sync logout from other tabs
    const unsub = onLogoutFromOtherTab(() => {
      clearSession();
      navigate('/login', { replace: true });
    });

    return () => {
      setOnUnauthorizedHandler(() => {});
      unsub();
    };
  }, [navigate]);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-2fa" element={<Verify2FA />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/health" element={<ProtectedRoute><Health /></ProtectedRoute>} />
      <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/planes" element={<ProtectedRoute><SelectPlan /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route
        path="/sim/dashboard"
        element={<ProtectedRoute><BiometricProvider><SimDashboard /></BiometricProvider></ProtectedRoute>}
      />
      <Route
        path="/sim/health"
        element={<ProtectedRoute><BiometricProvider><SimHealth /></BiometricProvider></ProtectedRoute>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
