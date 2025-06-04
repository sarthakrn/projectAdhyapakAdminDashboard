import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './TimetableManagement.css';

const TimetableManagement = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    updateBreadcrumbs(['Class Selector', `Class${cleanClassNumber}`, 'Timetable Management']);
  }, [classNumber, updateBreadcrumbs]);

  const cleanClassNumber = classNumber.replace('class-', '');
  const className = `Class ${cleanClassNumber}`;

  return (
    <div className="timetable-management-container">
      <div className="timetable-management-header">
        <h1 className="timetable-management-title">
          {className} - Timetable Management
        </h1>
        <p className="timetable-management-subtitle">
          Schedule and manage class timetables efficiently
        </p>
      </div>

      <div className="timetable-placeholder-card">
        <div className="placeholder-icon">
          <span className="icon-background">📋</span>
        </div>
        <div className="placeholder-content">
          <h2 className="placeholder-title">Feature Under Development</h2>
          <p className="placeholder-message">
            Timetable creation and management interface for {className} will be available here. 
            This feature is under development.
          </p>
          <div className="placeholder-features">
            <div className="feature-item">
              <span className="feature-icon">⏰</span>
              <span className="feature-text">Schedule Management</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📚</span>
              <span className="feature-text">Subject Allocation</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">👨‍🏫</span>
              <span className="feature-text">Teacher Assignment</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span className="feature-text">Weekly Overview</span>
            </div>
          </div>
        </div>
      </div>

      <div className="coming-soon-features">
        <h3 className="features-title">Coming Soon</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon">🗓️</div>
            <h4 className="card-title">Weekly Timetable</h4>
            <p className="card-description">Create and manage weekly class schedules</p>
          </div>
          <div className="feature-card">
            <div className="card-icon">🔄</div>
            <h4 className="card-title">Schedule Conflicts</h4>
            <p className="card-description">Automatic detection and resolution of scheduling conflicts</p>
          </div>
          <div className="feature-card">
            <div className="card-icon">📱</div>
            <h4 className="card-title">Mobile Access</h4>
            <p className="card-description">Access timetables on mobile devices</p>
          </div>
          <div className="feature-card">
            <div className="card-icon">📄</div>
            <h4 className="card-title">Export Options</h4>
            <p className="card-description">Export timetables as PDF or Excel files</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableManagement;