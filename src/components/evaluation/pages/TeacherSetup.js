import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import './TeacherSetup.css';

const TeacherSetup = () => {
  const { classNumber, subject, termId } = useParams();
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  const [uploadState, setUploadState] = useState({
    masterMarksheet: {
      uploaded: false,
      filename: null
    },
    questionPaper: {
      uploaded: false,
      filename: null
    }
  });

  useEffect(() => {
    const subjectName = subject
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const cleanClassNumber = classNumber.replace('class-', '');
    const termName = termId.charAt(0).toUpperCase() + termId.slice(1);
    updateBreadcrumbs(['Dashboard', "School's AI Management System", `Class ${cleanClassNumber}`, 'Academics', subjectName, 'Evaluation', termName]);
  }, [classNumber, subject, termId, updateBreadcrumbs]);

  const subjectName = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const termName = termId.replace('term', 'Term ');

  const handleFileSelect = (type, event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadState(prev => ({
        ...prev,
        [type]: {
          uploaded: true,
          filename: file.name
        }
      }));
    } else {
      alert('Please select a PDF file only.');
      event.target.value = '';
    }
  };

  const handleContinue = () => {
    if (uploadState.masterMarksheet.uploaded && uploadState.questionPaper.uploaded) {
      navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation/${termId}/students`);
    }
  };

  const canContinue = uploadState.masterMarksheet.uploaded && uploadState.questionPaper.uploaded;

  return (
    <div className="teacher-setup-container">
      <div className="teacher-setup-header">
        <h1 className="teacher-setup-title">
          Teacher Setup - {termName}
        </h1>
        <p className="teacher-setup-subtitle">
          Upload required documents for {subjectName} evaluation in Class{classNumber.replace('class-', '')}
        </p>
      </div>

      <div className="upload-section">
        <div className="upload-cards">
          {/* Master Marksheet Upload */}
          <div className="upload-card">
            <div className="upload-icon-container">
              <div className="upload-icon" style={{'--upload-color': 'rgba(0, 123, 255, 0.8)'}}>
                📋
              </div>
            </div>
            <div className="upload-content">
              <h3 className="upload-title">Master Marksheet</h3>
              <p className="upload-description">
                Upload the master marksheet containing student details and answer key
              </p>
              <div className="upload-status">
                {uploadState.masterMarksheet.uploaded ? (
                  <span className="status-success">
                    ✅ {uploadState.masterMarksheet.filename}
                  </span>
                ) : (
                  <span className="status-pending">📄 Not Uploaded</span>
                )}
              </div>
              <label className="upload-button">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect('masterMarksheet', e)}
                  className="file-input"
                />
                {uploadState.masterMarksheet.uploaded ? 'Change File' : 'Select PDF File'}
              </label>
            </div>
          </div>

          {/* Question Paper Upload */}
          <div className="upload-card">
            <div className="upload-icon-container">
              <div className="upload-icon" style={{'--upload-color': 'rgba(40, 167, 69, 0.8)'}}>
                📝
              </div>
            </div>
            <div className="upload-content">
              <h3 className="upload-title">Question Paper</h3>
              <p className="upload-description">
                Upload the question paper that students need to answer
              </p>
              <div className="upload-status">
                {uploadState.questionPaper.uploaded ? (
                  <span className="status-success">
                    ✅ {uploadState.questionPaper.filename}
                  </span>
                ) : (
                  <span className="status-pending">📄 Not Uploaded</span>
                )}
              </div>
              <label className="upload-button">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => handleFileSelect('questionPaper', e)}
                  className="file-input"
                />
                {uploadState.questionPaper.uploaded ? 'Change File' : 'Select PDF File'}
              </label>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="continue-section">
          <button
            className={`continue-button ${canContinue ? 'active' : 'disabled'}`}
            onClick={handleContinue}
            disabled={!canContinue}
            type="button"
          >
            <span className="continue-icon">🚀</span>
            <span className="continue-text">
              {canContinue ? 'Continue to Student List' : 'Upload Both Files to Continue'}
            </span>
            <span className="continue-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherSetup;