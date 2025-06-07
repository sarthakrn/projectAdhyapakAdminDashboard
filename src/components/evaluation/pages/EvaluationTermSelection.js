import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import './EvaluationTermSelection.css';

const EvaluationTermSelection = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    updateBreadcrumbs(['Dashboard', 'Evaluation', `Class ${cleanClassNumber}`]);
  }, [classNumber, updateBreadcrumbs]);

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
    navigate(`/evaluation/${classNumber}/${term.id}`);
  };

  const cleanClassNumber = classNumber.replace('class-', '');

  return (
    <div className="evaluation-term-selection-container">
      <div className="evaluation-term-selection-header">
        <h1 className="evaluation-term-selection-title">
          Class {cleanClassNumber} - Term Selection
        </h1>
        <p className="evaluation-term-selection-subtitle">
          Select the academic term for student evaluation and assessment
        </p>
      </div>

      <div className="evaluation-terms-grid">
        {terms.map((term, index) => (
          <button
            key={term.id}
            className="evaluation-term-card"
            onClick={() => handleTermClick(term)}
            style={{
              '--term-color': term.color,
              '--animation-delay': `${index * 0.1}s`
            }}
            type="button"
          >
            <div className="evaluation-term-icon">{term.icon}</div>
            <div className="evaluation-term-content">
              <h3 className="evaluation-term-title">{term.title}</h3>
              <p className="evaluation-term-description">{term.description}</p>
            </div>
            <div className="evaluation-term-arrow">→</div>
          </button>
        ))}
      </div>

      <div className="evaluation-term-info">
        <div className="term-info-card">
          <div className="term-info-icon">📊</div>
          <div className="term-info-content">
            <h4 className="term-info-title">What happens next?</h4>
            <p className="term-info-description">
              After selecting a term, you'll access the evaluation dashboard where you can upload question papers, manage total marks, and conduct student assessments
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationTermSelection;