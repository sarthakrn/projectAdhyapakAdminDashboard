import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Subject.css';

const Subject = () => {
  const { classNumber, subject } = useParams();
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const subjectName = subject
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const cleanClassNumber = classNumber.replace('class-', '');
    updateBreadcrumbs(['Class Selector', `Class${cleanClassNumber}`, 'Academics', subjectName]);
  }, [classNumber, subject, updateBreadcrumbs]);

  const subjectName = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const subModules = [
    {
      id: 'syllabus',
      title: 'Syllabus',
      description: `Complete syllabus and curriculum for ${subjectName}`,
      icon: '📋',
      color: 'rgba(0, 123, 255, 0.8)'
    },
    {
      id: 'academic-material',
      title: 'Academic Material',
      description: `Study materials and resources for ${subjectName}`,
      icon: '📚',
      color: 'rgba(40, 167, 69, 0.8)'
    },
    {
      id: 'assignments',
      title: 'Assignments',
      description: `Practice assignments and homework for ${subjectName}`,
      icon: '📝',
      color: 'rgba(253, 126, 20, 0.8)'
    },
    {
      id: 'notes',
      title: 'Notes',
      description: `Study notes and important points for ${subjectName}`,
      icon: '📖',
      color: 'rgba(220, 53, 69, 0.8)'
    },
    {
      id: 'sample-papers',
      title: 'Sample Papers',
      description: `Previous year papers and sample tests for ${subjectName}`,
      icon: '📄',
      color: 'rgba(111, 66, 193, 0.8)'
    },
    {
      id: 'evaluation',
      title: 'Evaluation',
      description: `Student answer sheet evaluation and grading for ${subjectName}`,
      icon: '📊',
      color: 'rgba(156, 39, 176, 0.8)'
    }
  ];

  const handleSubModuleClick = (subModule) => {
    if (subModule.id === 'evaluation') {
      navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation`);
    } else {
      navigate(`/class-selector/${classNumber}/academics/${subject}/${subModule.id}`);
    }
  };

  return (
    <div className="subject-container">
      <div className="subject-header">
        <h1 className="subject-title">Class{classNumber.replace('class-', '')} - {subjectName}</h1>
        <p className="subject-subtitle">
          Select a category to access {subjectName} content and materials
        </p>
      </div>

      <div className="sub-modules-grid">
        {subModules.map((subModule, index) => (
          <button
            key={subModule.id}
            className="sub-module-card"
            onClick={() => handleSubModuleClick(subModule)}
            style={{
              '--sub-module-color': subModule.color,
              '--animation-delay': `${index * 0.1}s`
            }}
            type="button"
          >
            <div className="sub-module-icon">{subModule.icon}</div>
            <div className="sub-module-content">
              <h3 className="sub-module-title">{subModule.title}</h3>
              <p className="sub-module-description">{subModule.description}</p>
            </div>
            <div className="sub-module-arrow">→</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Subject;