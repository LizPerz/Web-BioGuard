import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BiometricProvider } from './BiometricDataContext';
import { SimDashboard } from './SimDashboard';
import { SimHealth } from './SimHealth';

export function SimApp() {
  return (
    <BiometricProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/sim/dashboard" element={<SimDashboard />} />
          <Route path="/sim/health" element={<SimHealth />} />
        </Routes>
      </BrowserRouter>
    </BiometricProvider>
  );
}
