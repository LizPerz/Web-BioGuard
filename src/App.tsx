import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing/Landing';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { ForgotPassword } from './pages/ForgotPassword/ForgotPassword';
import { VerifyEmail } from './pages/VerifyEmail/VerifyEmail';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Health } from './pages/Health/Health';
import { Security } from './pages/Security/Security';
import { Billing } from './pages/Billing/Billing';
import { Settings } from './pages/Settings/Settings';
import { BiometricProvider, SimDashboard, SimHealth } from './simulation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/health" element={<Health />} />
        <Route path="/security" element={<Security />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/sim/dashboard"
          element={<BiometricProvider><SimDashboard /></BiometricProvider>}
        />
        <Route
          path="/sim/health"
          element={<BiometricProvider><SimHealth /></BiometricProvider>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
