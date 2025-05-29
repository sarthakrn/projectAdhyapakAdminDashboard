import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Header.css';

const Header = () => {
  const { logout, isAuthenticated } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1 className="app-title">School Management System</h1>
        </div>
        <div className="header-right">
          <button 
            className="logout-btn" 
            onClick={handleLogout}
            type="button"
          >
            <span className="logout-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;