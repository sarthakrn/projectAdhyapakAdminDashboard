import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import evaluationService from '../../../services/evaluationService';
import './EvaluationDashboard.css';

const EvaluationDashboard = () => {
  const { classNumber, termId } = useParams();
  const { updateBreadcrumbs, user, breadcrumbs } = useApp();
  const navigate = useNavigate();

  const [questionPapers, setQuestionPapers] = useState({});
  const [totalMarks, setTotalMarks] = useState({});
  const [savedMaximumMarks, setSavedMaximumMarks] = useState({}); // New state for saved marks
  const [evaluations] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optedOutStudents, setOptedOutStudents] = useState(new Set());
  const [uploadingMarkingScheme, setUploadingMarkingScheme] = useState({});
  const [uploadingAnswerSheet, setUploadingAnswerSheet] = useState({});
  const [answerSheetStatus, setAnswerSheetStatus] = useState({});
  const [apiErrors, setApiErrors] = useState({}); // New state for API errors

  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    const termName = `Term ${termId.replace('term', '')}`;
    updateBreadcrumbs(['Dashboard', 'Evaluation', `Class ${cleanClassNumber}`, termName]);
  }, [classNumber, termId, updateBreadcrumbs]);

  // Fetch students for the selected class
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const result = await evaluationService.getStudentsForEvaluation(classNumber, user);
        
        if (result.success) {
          setStudents(result.students);
        } else {
          setError(result.error || 'Failed to fetch students');
          setStudents([]);
        }
      } catch (err) {
        setError('Network error occurred while fetching students');
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [classNumber, user]);

  // Subject configuration
  const subjects = [
    { id: 'hindi', name: 'Hindi', color: 'rgba(220, 53, 69, 0.8)' },
    { id: 'english', name: 'English', color: 'rgba(0, 123, 255, 0.8)' },
    { id: 'mathematics', name: 'Mathematics', color: 'rgba(40, 167, 69, 0.8)' },
    { id: 'science', name: 'Science', color: 'rgba(253, 126, 20, 0.8)' },
    { id: 'social-science', name: 'Social Science', color: 'rgba(108, 117, 125, 0.8)' }
  ];

  // New function to handle saving maximum marks
  const handleSaveMaximumMarks = (subjectId) => {
    const value = totalMarks[subjectId];
    
    // Validate input
    if (!value || isNaN(value) || parseFloat(value) <= 0) {
      alert('Please enter a valid positive number for maximum marks.');
      return;
    }

    const numericValue = parseFloat(value);
    if (numericValue > 1000) {
      alert('Maximum marks cannot exceed 1000.');
      return;
    }

    // Round to 2 decimal places and convert to standard number to prevent backend Decimal issues
    const roundedValue = Math.round(numericValue * 100) / 100;
    const standardNumber = Number(roundedValue);

    // Save to local state
    setSavedMaximumMarks(prev => ({
      ...prev,
      [subjectId]: standardNumber
    }));

    // Clear any previous API errors for this subject
    setApiErrors(prev => ({
      ...prev,
      [subjectId]: null
    }));
  };

  // Modified function to handle marking scheme upload with maximum marks
  const handleQuestionPaperUpload = async (subjectId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file for the marking scheme.');
      return;
    }

    // Check if maximum marks are saved
    if (!savedMaximumMarks[subjectId]) {
      alert('Please enter and save the maximum marks first.');
      return;
    }

    setUploadingMarkingScheme(prev => ({ ...prev, [subjectId]: true }));
    setApiErrors(prev => ({ ...prev, [subjectId]: null })); // Clear previous errors

    try {
      // Get usernames of all visible students (excluding opted out)
      const visibleStudents = students.filter(student => !optedOutStudents.has(student.id));
      const studentUsernames = visibleStudents.map(student => student.username);

      if (studentUsernames.length === 0) {
        alert('No students available for marking scheme upload.');
        return;
      }

      const subjectName = subjects.find(s => s.id === subjectId)?.name;
      if (!subjectName) {
        throw new Error('Subject not found');
      }

      // Use the modified upload method that includes maximum marks
      const result = await evaluationService.uploadMarkingSchemeWithMaxMarks(
        file,
        breadcrumbs,
        subjectName,
        studentUsernames,
        savedMaximumMarks[subjectId], // Pass the saved maximum marks
        user
      );

      if (result.success) {
        setQuestionPapers(prev => ({
          ...prev,
          [subjectId]: file
        }));
        alert(`Marking scheme uploaded successfully for ${studentUsernames.length} students!`);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Error uploading marking scheme:', error);
      const errorMessage = `Failed to upload marking scheme: ${error.message}`;
      
      // Set error state for this subject
      setApiErrors(prev => ({
        ...prev,
        [subjectId]: errorMessage
      }));
    } finally {
      setUploadingMarkingScheme(prev => ({ ...prev, [subjectId]: false }));
      // Reset file input
      event.target.value = '';
    }
  };

  const handleTotalMarksChange = (subjectId, value) => {
    // Only allow numeric input with decimals, limited to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setTotalMarks(prev => ({
        ...prev,
        [subjectId]: value
      }));
    }
  };

  const handleStartEvaluation = async (studentId, subjectId) => {
    // Create a hidden file input and trigger it
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file for the answer sheet.');
        return;
      }

      // Check file size (20MB limit)
      const maxSize = 20 * 1024 * 1024; // 20MB in bytes
      if (file.size > maxSize) {
        alert('File size exceeds 20MB limit. Please select a smaller file.');
        return;
      }

      const uploadKey = `${studentId}-${subjectId}`;
      setUploadingAnswerSheet(prev => ({ ...prev, [uploadKey]: true }));

      try {
        const student = students.find(s => s.id === studentId);
        if (!student) {
          throw new Error('Student not found');
        }

        const subjectName = subjects.find(s => s.id === subjectId)?.name;
        if (!subjectName) {
          throw new Error('Subject not found');
        }

        const result = await evaluationService.uploadAnswerSheet(
          file,
          breadcrumbs,
          subjectName,
          student.username,
          user
        );

        if (result.success) {
          setAnswerSheetStatus(prev => ({
            ...prev,
            [uploadKey]: {
              uploaded: true,
              fileName: file.name,
              uploadTime: new Date().toISOString()
            }
          }));
          alert(`Answer sheet uploaded successfully for ${student.firstName}!`);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      } catch (error) {
        console.error('Error uploading answer sheet:', error);
        alert(`Failed to upload answer sheet: ${error.message}`);
      } finally {
        setUploadingAnswerSheet(prev => ({ ...prev, [uploadKey]: false }));
      }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const isEvaluationEnabled = (subjectId) => {
    return questionPapers[subjectId] && savedMaximumMarks[subjectId]; // Updated to use savedMaximumMarks
  };

  const isUploadButtonEnabled = (subjectId) => {
    return savedMaximumMarks[subjectId] && !uploadingMarkingScheme[subjectId];
  };

  const getEvaluationStatus = (studentId, subjectId) => {
    const key = `${studentId}-${subjectId}`;
    return evaluations[key] || answerSheetStatus[key];
  };

  const handleOptOut = (studentId) => {
    setOptedOutStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="evaluation-dashboard-container">
        <div className="evaluation-loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Fetching students for evaluation...</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (!loading && students.length === 0) {
    return (
      <div className="evaluation-dashboard-container">
        <div className="evaluation-empty-state">
          <div className="empty-state-icon">👥</div>
          <h3 className="empty-state-title">No Students Found</h3>
          <p className="empty-state-description">
            No students have been configured for this class. Please add students in the Student Management module.
          </p>
          <button 
            className="empty-state-action"
            onClick={() => navigate('/ai-management')}
          >
            Go to Student Management
          </button>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="evaluation-dashboard-container">
        <div className="evaluation-error-state">
          <div className="error-state-icon">⚠️</div>
          <h3 className="error-state-title">Error Loading Students</h3>
          <p className="error-state-description">{error}</p>
          <button 
            className="error-state-action"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-dashboard-container">
      <div className="evaluation-dashboard-header">
        <button 
          className="ai-report-btn disabled"
          disabled={true}
          title="Will be enabled after all evaluations are complete"
        >
          📊 AI Report
        </button>
      </div>

      <div className="evaluation-instructions">
        <h3 className="instructions-title">Evaluation Process</h3>
        <ol className="instructions-list">
          <li>Set the Maximum Marks and click Save for each subject, then upload the Marking Scheme.</li>
          <li>For each student, click "Start Evaluation" to upload their answer sheet. The AI will then perform the initial grading.</li>
          <li>After AI evaluation, the teacher must review the results for each student, verify them, and submit the final grade.</li>
          <li>Once all evaluations are finalized, click the "AI Report" button to generate a comprehensive report, which will be published to students, create personalized practice questions, and update the school's knowledge graph.</li>
        </ol>
      </div>

      <div className="evaluation-table-container">
        <div className="table-wrapper">
          <table className="evaluation-table">
            <thead>
              <tr className="table-header-row">
                <th className="opt-out-header">Opt-Out</th>
                <th className="student-info-header">Roll No.</th>
                <th className="student-info-header">First Name</th>
                <th className="student-info-header">Section</th>
                {subjects.map(subject => (
                  <th key={subject.id} className="subject-header" style={{'--subject-color': subject.color}}>
                    <div className="subject-header-content">
                      <div className="subject-name">{subject.name}</div>
                      <div className="subject-controls">
                        {/* Maximum Marks Control - Now positioned above upload */}
                        <div className="marks-control">
                          <div className="marks-input-wrapper">
                            <input
                              type="text"
                              placeholder="Maximum Marks"
                              value={totalMarks[subject.id] || ''}
                              onChange={(e) => handleTotalMarksChange(subject.id, e.target.value)}
                              className="marks-input"
                              onKeyPress={(e) => {
                                // Allow only numbers, decimal point, and control keys
                                if (!/[\d.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                                  e.preventDefault();
                                }
                                // Allow Enter to save
                                if (e.key === 'Enter') {
                                  handleSaveMaximumMarks(subject.id);
                                }
                              }}
                            />
                            <button
                              className={`save-marks-btn ${savedMaximumMarks[subject.id] ? 'saved' : ''}`}
                              onClick={() => handleSaveMaximumMarks(subject.id)}
                              disabled={!totalMarks[subject.id] || totalMarks[subject.id].trim() === ''}
                              title={savedMaximumMarks[subject.id] ? `Saved: ${savedMaximumMarks[subject.id]} marks` : 'Save maximum marks'}
                            >
                              {savedMaximumMarks[subject.id] ? '✓' : '💾'}
                            </button>
                          </div>
                          {savedMaximumMarks[subject.id] && (
                            <div className="saved-marks-indicator">
                              Saved: {savedMaximumMarks[subject.id]} marks
                            </div>
                          )}
                        </div>
                        
                        {/* Upload Control - Now positioned below marks */}
                        <div className="upload-control">
                          <label className="upload-label">
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => handleQuestionPaperUpload(subject.id, e)}
                              className="upload-input"
                              disabled={!isUploadButtonEnabled(subject.id)}
                            />
                            <span 
                              className={`upload-button ${!isUploadButtonEnabled(subject.id) ? 'disabled' : ''} ${uploadingMarkingScheme[subject.id] ? 'uploading' : ''}`}
                              title={!savedMaximumMarks[subject.id] ? 'Please enter and save the maximum marks first' : ''}
                            >
                              {uploadingMarkingScheme[subject.id] 
                                ? '⏳ Uploading...' 
                                : questionPapers[subject.id] 
                                ? '✓ Uploaded' 
                                : '📄 Upload Marking Scheme'}
                            </span>
                          </label>
                        </div>
                        
                        {/* Error Display */}
                        {apiErrors[subject.id] && (
                          <div className="error-message">
                            {apiErrors[subject.id]}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(student => {
                const isOptedOut = optedOutStudents.has(student.id);
                return (
                  <tr key={student.id} className={`student-row ${isOptedOut ? 'opted-out' : ''}`}>
                    <td className="opt-out-cell">
                      <button
                        className={`opt-out-btn ${isOptedOut ? 'active' : ''}`}
                        onClick={() => handleOptOut(student.id)}
                        title={isOptedOut ? 'Include in evaluation' : 'Exclude from evaluation'}
                      >
                        {isOptedOut ? '↩️' : '❌'}
                      </button>
                    </td>
                    <td className="student-info-cell">{student.rollNumber}</td>
                    <td className="student-info-cell">{student.firstName || student.name}</td>
                    <td className="student-info-cell">{student.section}</td>
                  {subjects.map(subject => {
                    const evaluationStatus = getEvaluationStatus(student.id, subject.id);
                    const isEnabled = isEvaluationEnabled(subject.id);
                    const uploadKey = `${student.id}-${subject.id}`;
                    const isUploading = uploadingAnswerSheet[uploadKey];
                    const answerSheetUploaded = answerSheetStatus[uploadKey]?.uploaded;
                    
                    return (
                      <td key={subject.id} className="evaluation-cell">
                        {evaluationStatus && evaluationStatus.aiGrade ? (
                          <div className="evaluation-result">
                            <div className="grade-info">
                              <span className="ai-grade">AI: {evaluationStatus.aiGrade}</span>
                              <span className="teacher-grade">Teacher: {evaluationStatus.teacherGrade}</span>
                            </div>
                          </div>
                        ) : answerSheetUploaded ? (
                          <div className="answer-sheet-uploaded">
                            <span className="upload-success">✓ Answer Sheet Uploaded</span>
                            <small className="upload-time">
                              {new Date(answerSheetStatus[uploadKey].uploadTime).toLocaleString()}
                            </small>
                          </div>
                        ) : (
                          <button
                            className={`start-evaluation-btn ${!isEnabled || isUploading ? 'disabled' : ''}`}
                            onClick={() => handleStartEvaluation(student.id, subject.id)}
                            disabled={!isEnabled || isUploading}
                            title={!isEnabled ? 'Upload marking scheme and set maximum marks first' : isUploading ? 'Uploading...' : 'Start evaluation'}
                          >
                            {isUploading ? '⏳ Uploading...' : 'Start Evaluation'}
                          </button>
                        )}
                      </td>
                    );
                    })}
                  </tr>
                );
                })}
              </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default EvaluationDashboard;