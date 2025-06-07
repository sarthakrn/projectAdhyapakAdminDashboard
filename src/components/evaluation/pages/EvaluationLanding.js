import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import './EvaluationLanding.css';

const EvaluationLanding = () => {
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    updateBreadcrumbs(['Dashboard', 'Evaluation']);
  }, [updateBreadcrumbs]);

  const availableClasses = [
    {
      id: '9',
      title: 'Class 9',
      description: 'Student evaluation and assessment for Class 9',
      icon: '📚',
      color: 'rgba(0, 123, 255, 0.8)'
    },
    {
      id: '10',
      title: 'Class 10',
      description: 'Student evaluation and assessment for Class 10',
      icon: '📖',
      color: 'rgba(40, 167, 69, 0.8)'
    }
  ];

  const handleClassClick = (classId) => {
    navigate(`/evaluation/class-${classId}`);
  };

  return (
    <div className="evaluation-landing-container">
      <div className="evaluation-landing-header">
        <h1 className="evaluation-landing-title">Student Evaluation System</h1>
        <p className="evaluation-landing-subtitle">
          Select a class to begin the comprehensive student evaluation and assessment process
        </p>
      </div>

      <div className="evaluation-classes-grid">
        {availableClasses.map((classItem, index) => (
          <button
            key={classItem.id}
            className="evaluation-class-card"
            onClick={() => handleClassClick(classItem.id)}
            style={{
              '--class-color': classItem.color,
              '--animation-delay': `${index * 0.1}s`
            }}
            type="button"
          >
            <div className="evaluation-class-icon">{classItem.icon}</div>
            <div className="evaluation-class-content">
              <h3 className="evaluation-class-title">{classItem.title}</h3>
              <p className="evaluation-class-description">{classItem.description}</p>
            </div>
            <div className="evaluation-class-arrow">→</div>
          </button>
        ))}
      </div>

      <div className="evaluation-landing-info">
        <div className="info-card">
          <div className="info-icon">📝</div>
          <div className="info-content">
            <h4 className="info-title">Comprehensive Assessment</h4>
            <p className="info-description">
              Upload question papers, capture answer sheets, and manage AI-powered evaluation with teacher oversight
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationLanding;