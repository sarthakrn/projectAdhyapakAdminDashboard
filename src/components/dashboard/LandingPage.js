import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './LandingPage.css';

const LandingPage = () => {
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    updateBreadcrumbs(['Dashboard']);
  }, [updateBreadcrumbs]);

  const mainTiles = [
    {
      id: 'ai-management',
      title: "School's AI Management System",
      description: 'Access general school management, academic features, and class-specific tools',
      icon: '🎓',
      color: 'rgba(0, 123, 255, 0.8)',
      route: '/ai-management'
    },
    {
      id: 'evaluation',
      title: 'Evaluation',
      description: 'Comprehensive student evaluation and assessment management system',
      icon: '📝',
      color: 'rgba(40, 167, 69, 0.8)',
      route: '/evaluation'
    }
  ];

  const handleTileClick = (route) => {
    navigate(route);
  };

  return (
    <div className="landing-page-container">
      <div className="landing-page-header">
        <h1 className="landing-page-title">School Management System</h1>
        <p className="landing-page-subtitle">
          Welcome to your comprehensive school management dashboard
        </p>
      </div>

      <div className="main-tiles-grid">
        {mainTiles.map((tile, index) => (
          <button
            key={tile.id}
            className="main-tile"
            onClick={() => handleTileClick(tile.route)}
            style={{
              '--tile-color': tile.color,
              '--animation-delay': `${index * 0.2}s`
            }}
            type="button"
          >
            <div className="tile-icon">{tile.icon}</div>
            <div className="tile-content">
              <h3 className="tile-title">{tile.title}</h3>
              <p className="tile-description">{tile.description}</p>
            </div>
            <div className="tile-arrow">→</div>
          </button>
        ))}
      </div>

      <div className="landing-page-footer">
        <p className="footer-text">
          Select a module above to begin managing your school's operations
        </p>
      </div>
    </div>
  );
};

export default LandingPage;