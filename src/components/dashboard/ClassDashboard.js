import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './ClassDashboard.css';

const ClassDashboard = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs, selectClass } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (classNumber) {
      const cleanClassNumber = classNumber.replace('class-', '');
      selectClass(cleanClassNumber);
      updateBreadcrumbs(['Class Selector', `Class${cleanClassNumber}`]);
    }
  }, [classNumber, selectClass, updateBreadcrumbs]);

  const modules = [
    {
      id: 'student-management',
      title: 'Student Management',
      description: 'View, edit, and manage student profiles. Includes bulk operations for CSV upload and bulk deletions',
      icon: '👥',
      path: `/class-selector/${classNumber}/student-management`,
      color: 'rgba(0, 123, 255, 0.8)'
    },

    {
      id: 'academics',
      title: 'Academics',
      description: 'Access subjects, syllabus, assignments, and academic materials',
      icon: '📚',
      path: `/class-selector/${classNumber}/academics`,
      color: 'rgba(40, 167, 69, 0.8)'
    },
    {
      id: 'timetable',
      title: 'Timetable',
      description: 'Create and manage class timetables and schedules',
      icon: '📋',
      path: `/class-selector/${classNumber}/timetable`,
      color: 'rgba(156, 39, 176, 0.8)'
    },
    {
      id: 'competency-model',
      title: "School's Competency Model",
      description: 'Explore competency frameworks and assessment criteria',
      icon: '🏆',
      path: `/class-selector/${classNumber}/competency-model`,
      color: 'rgba(111, 66, 193, 0.8)'
    }
  ];

  const handleModuleClick = (module) => {
    try {
      navigate(module.path);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <div className="class-dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Class{classNumber.replace('class-', '')} Dashboard</h1>
        <p className="dashboard-subtitle">
          Welcome to your class management hub. Select a module to get started.
        </p>
      </div>

      <div className="modules-grid">
        {modules.map((module, index) => (
          <button
            key={module.id}
            className="module-card"
            onClick={() => handleModuleClick(module)}
            style={{
              '--module-color': module.color,
              '--animation-delay': `${index * 0.1}s`
            }}
            type="button"
          >
            <div className="module-icon">{module.icon}</div>
            <div className="module-content">
              <h3 className="module-title">{module.title}</h3>
              <p className="module-description">{module.description}</p>
            </div>
            <div className="module-arrow">→</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ClassDashboard;