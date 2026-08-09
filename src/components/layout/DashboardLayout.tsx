import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import './dashboard-layout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`dashboard-layout ${sidebarOpen ? 'dashboard-layout--sidebar-open' : ''}`}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="dashboard-layout__sidebar-placeholder" />
      <div className="dashboard-layout__right">
        <DashboardHeader onToggleMenu={() => setSidebarOpen((o) => !o)} />
        <main className="dashboard-layout__content">
          {children}
        </main>
      </div>
    </div>
  );
}
