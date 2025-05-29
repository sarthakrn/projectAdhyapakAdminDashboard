import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './ClassSelection.css';

const ClassSelection = () => {
  const { selectClass } = useApp();
  const navigate = useNavigate();

  const handleClassSelection = (classNumber) => {
    selectClass(classNumber);
    navigate(`/dashboard/${classNumber}`);
  };

  return (
    <div className="class-selection-container">
      <div className="class-selection-content">
        <div className="selection-header">
          <h1 className="selection-title">Select Your Class</h1>
          <p className="selection-subtitle">Choose the class you want to manage</p>
        </div>
        
        <div className="class-options">
          <button 
            className="class-option-card"
            onClick={() => handleClassSelection('9th')}
            type="button"
          >
            <div className="class-icon">🎓</div>
            <h2 className="class-title">Class 9th</h2>
            <p className="class-description">
              Manage students, academics, and activities for Class 9th
            </p>
            <div className="class-arrow">→</div>
          </button>

          <button 
            className="class-option-card"
            onClick={() => handleClassSelection('10th')}
            type="button"
          >
            <div className="class-icon">🎓</div>
            <h2 className="class-title">Class 10th</h2>
            <p className="class-description">
              Manage students, academics, and activities for Class 10th
            </p>
            <div className="class-arrow">→</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassSelection;