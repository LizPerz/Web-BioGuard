import { Bell, User } from 'lucide-react';
import { mockUser } from '../../data/mockData';
import { pageTitles } from '../../data/mockData';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import './dashboard-header.css';

export function DashboardHeader() {
  const location = useLocation();
  const currentTitle = pageTitles[location.pathname] || 'Panel Principal';
  const fullName = `${mockUser.firstName} ${mockUser.lastName}`;

  return (
    <header className="dashboard-header">
      <div className="dashboard-header__left">
        <Sidebar />
        <h1 className="dashboard-header__title">{currentTitle}</h1>
      </div>
      <div className="dashboard-header__right">
        <button className="dashboard-header__bell" aria-label="Notificaciones">
          <Bell size={20} strokeWidth={1.8} />
        </button>
        <div className="dashboard-header__user">
          <div className="dashboard-header__avatar">
            <User size={17} strokeWidth={1.8} />
          </div>
          <span className="dashboard-header__name">{fullName}</span>
        </div>
      </div>
    </header>
  );
}
