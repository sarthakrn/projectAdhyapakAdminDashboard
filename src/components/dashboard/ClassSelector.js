import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './ClassSelector.css';

const ClassSelector = () => {
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    updateBreadcrumbs(['Class Selector']);
  }, [updateBreadcrumbs]);

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

  const handleClassClick = (classId) => {
    navigate(`/class-selector/class-${classId}`);
  };

  return (
    <div className="class-selector-container">
      <div className="class-selector-header">
        <h1 className="class-selector-title">Select Class</h1>
        <p className="class-selector-subtitle">
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
              '--animation-delay': `${index * 0.1}s`
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

      <div className="school-wide-section">
        <div className="section-header">
          <h2 className="section-title">School-Wide Features</h2>
          <p className="section-subtitle">
            Access general school information and announcements
          </p>
        </div>
        
        <div className="school-features-grid">
          <button
            className="feature-card"
            onClick={() => navigate('/notifications')}
            style={{
              '--feature-color': 'rgba(253, 126, 20, 0.8)',
              '--animation-delay': '0.3s'
            }}
            type="button"
          >
            <div className="feature-icon">🔔</div>
            <div className="feature-content">
              <h3 className="feature-title">Notification</h3>
              <p className="feature-description">View and manage important announcements and updates</p>
            </div>
            <div className="feature-arrow">→</div>
          </button>
          
          <button
            className="feature-card"
            onClick={() => navigate('/holiday-calendar')}
            style={{
              '--feature-color': 'rgba(220, 53, 69, 0.8)',
              '--animation-delay': '0.4s'
            }}
            type="button"
          >
            <div className="feature-icon">📅</div>
            <div className="feature-content">
              <h3 className="feature-title">Holiday Calendar</h3>
              <p className="feature-description">Check upcoming holidays and important dates</p>
            </div>
            <div className="feature-arrow">→</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassSelector;