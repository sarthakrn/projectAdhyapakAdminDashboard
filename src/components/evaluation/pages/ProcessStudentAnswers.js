import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import studentApiService from '../../../services/studentApiService';
import './ProcessStudentAnswers.css';

const ProcessStudentAnswers = () => {
  const { classNumber, subject, termId, studentId } = useParams();
  const { updateBreadcrumbs, user } = useApp();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionCompleted, setActionCompleted] = useState(false);
  const [completedAction, setCompletedAction] = useState('');


  // Function to update student status in localStorage
  const updateStudentStatus = useCallback((status) => {
    try {
      const storageKey = `evaluation_status_${classNumber}_${subject}_${termId}`;
      const existingData = localStorage.getItem(storageKey);
      const statusData = existingData ? JSON.parse(existingData) : {};
      
      statusData[studentId] = {
        status,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(statusData));
    } catch (error) {
      console.error('Error updating student status:', error);
    }
  }, [classNumber, subject, termId, studentId]);

  useEffect(() => {
    const loadStudent = async () => {
      if (!user) return;
      
      setLoading(true);
      setError('');
      
      try {
        const cleanClassNumber = classNumber.replace('class-', '');
        const result = await studentApiService.getStudents(cleanClassNumber, user);
        
        if (result.success) {
          const studentsData = result.students || [];
          const studentData = studentsData.find(s => s.username === studentId);
          
          if (studentData) {
            const transformedStudent = {
              id: studentData.username,
              name: `${studentData.firstName} ${studentData.lastName}`,
              rollNumber: studentData.rollNumber || 'N/A',
              section: studentData.section || '',
              username: studentData.username,
              firstName: studentData.firstName,
              lastName: studentData.lastName
            };
            
            setStudent(transformedStudent);
            
            const subjectName = subject
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            const termName = termId.charAt(0).toUpperCase() + termId.slice(1);
            
            updateBreadcrumbs([
              'Dashboard', 
              "School's AI Management System",
              `Class ${cleanClassNumber}`, 
              'Academics', 
              subjectName, 
              'Evaluation', 
              termName, 
              'Students',
              transformedStudent.name
            ]);
          } else {
            setError('Student not found');
          }
        } else {
          setError(result.error || 'Failed to load student data');
        }
      } catch (err) {
        setError(`Network error: ${err.message || 'Unknown error occurred'}`);
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
    
    // Check if coming back from camera capture with completed action
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('captureSuccess') === 'true') {
      setActionCompleted(true);
      setCompletedAction('Image captured successfully via camera simulation');
      updateStudentStatus('Answer Submitted');
      
      // Clean up URL params
      const url = new URL(window.location);
      url.searchParams.delete('captureSuccess');
      window.history.replaceState({}, '', url);
    }
  }, [classNumber, subject, termId, studentId, updateBreadcrumbs, user, updateStudentStatus]);

  const subjectName = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const termName = termId.replace('term', 'Term ');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setActionCompleted(true);
      setCompletedAction(`PDF "${file.name}" selected successfully`);
      updateStudentStatus('Answer Submitted');
    } else {
      alert('Please select a PDF file only.');
      event.target.value = '';
    }
  };

  const handleCameraCapture = () => {
    // Navigate to camera placeholder screen
    navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation/${termId}/students/${studentId}/capture`);
  };

  const handleBackToStudents = () => {
    // If action was completed, ensure status is updated before navigating
    if (actionCompleted) {
      updateStudentStatus('Answer Submitted');
    }
    navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation/${termId}/students`);
  };

  if (loading) {
    return (
      <div className="process-answers-container">
        <div className="loading-state">
          <div className="loading-icon">🔄</div>
          <h3 className="loading-title">Loading Student Data...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="process-answers-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error Loading Student</h3>
          <p className="error-message">{error}</p>
          <button 
            className="back-button"
            onClick={handleBackToStudents}
            type="button"
          >
            ← Back to Student List
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="process-answers-container">
        <div className="loading-state">
          <div className="loading-icon">❌</div>
          <h3 className="loading-title">Student Not Found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="process-answers-container">
      <div className="process-answers-header">
        <div className="student-info-banner">
          <div className="student-avatar-large">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="student-details-large">
            <h1 className="process-answers-title">
              Process Answer Sheet
            </h1>
            <p className="student-info-text">
              <strong>{student.name}</strong> • Roll No: {student.rollNumber} • Section: {student.section}
            </p>
            <p className="process-answers-subtitle">
              {subjectName} • {termName} • Class{classNumber.replace('class-', '')}
            </p>
          </div>
        </div>
      </div>

      {!actionCompleted ? (
        <div className="action-selection">
          <h2 className="selection-title">Choose Action</h2>
          <p className="selection-subtitle">
            Select how you want to process this student's answer sheet
          </p>

          <div className="action-cards">
            <button
              className="action-card camera-card"
              onClick={handleCameraCapture}
              type="button"
            >
              <div className="action-icon camera-icon">📷</div>
              <div className="action-content">
                <h3 className="action-title">Capture with Camera</h3>
                <p className="action-description">
                  Use your device camera to capture the answer sheet
                </p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <div className="action-card upload-card">
              <div className="action-icon upload-icon">📄</div>
              <div className="action-content">
                <h3 className="action-title">Upload Existing PDF</h3>
                <p className="action-description">
                  Select a PDF file of the answer sheet from your device
                </p>
                <label className="upload-file-button">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="file-input-hidden"
                  />
                  <span className="upload-button-text">Select PDF File</span>
                  <span className="upload-button-icon">📁</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="completion-state">
          <div className="success-animation">
            <div className="success-icon">✅</div>
            <h2 className="success-title">Action Completed Successfully!</h2>
            <p className="success-message">{completedAction}</p>
            
            <div className="completion-actions">
              <button
                className="back-button primary"
                onClick={handleBackToStudents}
                type="button"
              >
                <span className="back-icon">← </span>
                <span className="back-text">Back to Student List</span>
              </button>
              
              <button
                className="retry-button secondary"
                onClick={() => {
                  setActionCompleted(false);
                  setCompletedAction('');
                }}
                type="button"
              >
                <span className="retry-icon">🔄</span>
                <span className="retry-text">Process Another File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessStudentAnswers;