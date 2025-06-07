import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './AIManagementSystem.css';

const AIManagementSystem = () => {
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    updateBreadcrumbs(['Dashboard', "School's AI Management System"]);
  }, [updateBreadcrumbs]);

  const schoolWideFeatures = [
    {
      id: 'notifications',
      title: 'Notification',
      description: 'View and manage important announcements and updates',
      icon: '🔔',
      color: 'rgba(253, 126, 20, 0.8)',
      route: '/notifications'
    },
    {
      id: 'holiday-calendar',
      title: 'Holiday Calendar',
      description: 'Check upcoming holidays and important dates',
      icon: '📅',
      color: 'rgba(220, 53, 69, 0.8)',
      route: '/holiday-calendar'
    }
  ];

  const availableClasses = [
    {
      id: '9',
      title: 'Class 9',
      description: 'Class 9 academic materials and administration',
      icon: '📚',
      color: 'rgba(0, 123, 255, 0.8)'
    },
    {
      id: '10',
      title: 'Class 10',
      description: 'Class 10 academic materials and administration',
      icon: '📖',
      color: 'rgba(40, 167, 69, 0.8)'
    }
  ];

  const handleFeatureClick = (route) => {
    navigate(route);
  };

  const handleClassClick = (classId) => {
    navigate(`/class-selector/class-${classId}`);
  };

  return (
    <div className="ai-management-container">
      <div className="ai-management-header">
        <h1 className="ai-management-title">School's AI Management System</h1>
        <p className="ai-management-subtitle">
          Comprehensive school management and academic administration
        </p>
      </div>

      {/* School-Wide Features Section */}
      <div className="school-wide-section">
        <div className="section-header">
          <h2 className="section-title">School-Wide Features</h2>
          <p className="section-subtitle">
            Access general school information and announcements
          </p>
        </div>
        
        <div className="school-features-grid">
          {schoolWideFeatures.map((feature, index) => (
            <button
              key={feature.id}
              className="feature-card"
              onClick={() => handleFeatureClick(feature.route)}
              style={{
                '--feature-color': feature.color,
                '--animation-delay': `${index * 0.1}s`
              }}
              type="button"
            >
              <div className="feature-icon">{feature.icon}</div>
              <div className="feature-content">
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
              <div className="feature-arrow">→</div>
            </button>
          ))}
        </div>
      </div>

      {/* Select Class Section */}
      <div className="select-class-section">
        <div className="section-header">
          <h2 className="section-title">Select Class</h2>
          <p className="section-subtitle">
            Choose a class to manage academic content and student information
          </p>
        </div>

        <div className="classes-grid">
          {availableClasses.map((classItem, index) => (
            <button
              key={classItem.id}
              className="class-card"
              onClick={() => handleClassClick(classItem.id)}
              style={{
                '--class-color': classItem.color,
                '--animation-delay': `${0.2 + (index * 0.1)}s`
              }}
              type="button"
            >
              <div className="class-icon">{classItem.icon}</div>
              <div className="class-content">
                <h3 className="class-title">{classItem.title}</h3>
                <p className="class-description">{classItem.description}</p>
              </div>
              <div className="class-arrow">→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIManagementSystem;