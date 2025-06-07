import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import './TermSelection.css';

const TermSelection = () => {
  const { classNumber, subject } = useParams();
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const subjectName = subject
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const cleanClassNumber = classNumber.replace('class-', '');
    updateBreadcrumbs(['Dashboard', "School's AI Management System", `Class ${cleanClassNumber}`, 'Academics', subjectName, 'Evaluation']);
  }, [classNumber, subject, updateBreadcrumbs]);

  const subjectName = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const terms = [
    {
      id: 'term1',
      title: 'Term 1',
      description: 'First academic term evaluation',
      icon: '📚',
      color: 'rgba(0, 123, 255, 0.8)'
    },
    {
      id: 'term2',
      title: 'Term 2',
      description: 'Second academic term evaluation',
      icon: '📖',
      color: 'rgba(40, 167, 69, 0.8)'
    },
    {
      id: 'term3',
      title: 'Term 3',
      description: 'Third academic term evaluation',
      icon: '📝',
      color: 'rgba(253, 126, 20, 0.8)'
    },
    {
      id: 'term4',
      title: 'Term 4',
      description: 'Fourth academic term evaluation',
      icon: '🎓',
      color: 'rgba(220, 53, 69, 0.8)'
    }
  ];

  const handleTermClick = (term) => {
    navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation/${term.id}`);
  };

  return (
    <div className="term-selection-container">
      <div className="term-selection-header">
        <h1 className="term-selection-title">
          {subjectName} Evaluation - Class{classNumber.replace('class-', '')}
        </h1>
        <p className="term-selection-subtitle">
          Select the academic term for which you want to conduct evaluation
        </p>
      </div>

      <div className="terms-grid">
        {terms.map((term, index) => (
          <button
            key={term.id}
            className="term-card"
            onClick={() => handleTermClick(term)}
            style={{
              '--term-color': term.color,
              '--animation-delay': `${index * 0.1}s`
            }}
            type="button"
          >
            <div className="term-icon">{term.icon}</div>
            <div className="term-content">
              <h3 className="term-title">{term.title}</h3>
              <p className="term-description">{term.description}</p>
            </div>
            <div className="term-arrow">→</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TermSelection;