import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';
import './dashboard-layout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-layout__sidebar-placeholder" />
      <div className="dashboard-layout__right">
        <DashboardHeader />
        <main className="dashboard-layout__content">
          {children}
        </main>
      </div>
    </div>
  );
}
