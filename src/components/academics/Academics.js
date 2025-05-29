import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Academics.css';

const Academics = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    updateBreadcrumbs([`Class ${classNumber}`, 'Academics']);
  }, [classNumber, updateBreadcrumbs]);

  const subjects = [
    {
      id: 'maths',
      name: 'Maths',
      description: 'Mathematics concepts, formulas, and problem-solving techniques',
      icon: '🔢',
      color: 'rgba(0, 123, 255, 0.8)'
    },
    {
      id: 'science',
      name: 'Science',
      description: 'Physics, Chemistry, and Biology fundamentals',
      icon: '🔬',
      color: 'rgba(40, 167, 69, 0.8)'
    },
    {
      id: 'social-science',
      name: 'Social Science',
      description: 'History, Geography, Civics, and Economics',
      icon: '🌍',
      color: 'rgba(253, 126, 20, 0.8)'
    },
    {
      id: 'english',
      name: 'English',
      description: 'Language, literature, grammar, and communication skills',
      icon: '📖',
      color: 'rgba(220, 53, 69, 0.8)'
    },
    {
      id: 'hindi',
      name: 'Hindi',
      description: 'Hindi language, literature, and communication',
      icon: '🇮🇳',
      color: 'rgba(111, 66, 193, 0.8)'
    }
  ];

  const handleSubjectClick = (subject) => {
    navigate(`/dashboard/${classNumber}/academics/${subject.id}`);
  };

  return (
    <div className="academics-container">
      <div className="academics-header">
        <h1 className="academics-title">Class {classNumber} - Academics</h1>
        <p className="academics-subtitle">
          Select a subject to access syllabus, materials, assignments, and more
        </p>
      </div>

      <div className="subjects-grid">
        {subjects.map((subject, index) => (
          <button
            key={subject.id}
            className="subject-card"
            onClick={() => handleSubjectClick(subject)}
            style={{
              '--subject-color': subject.color,
              '--animation-delay': `${index * 0.1}s`
            }}
            type="button"
          >
            <div className="subject-icon">{subject.icon}</div>
            <div className="subject-content">
              <h3 className="subject-name">{subject.name}</h3>
              <p className="subject-description">{subject.description}</p>
            </div>
            <div className="subject-arrow">→</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Academics;