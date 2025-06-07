import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import evaluationService from '../../../services/evaluationService';
import './EvaluationDashboard.css';

const EvaluationDashboard = () => {
  const { classNumber, termId } = useParams();
  const { updateBreadcrumbs, user } = useApp();
  const navigate = useNavigate();

  const [questionPapers, setQuestionPapers] = useState({});
  const [totalMarks, setTotalMarks] = useState({});
  const [evaluations] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [optedOutStudents, setOptedOutStudents] = useState(new Set());

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

  const handleQuestionPaperUpload = (subjectId, event) => {
    const file = event.target.files[0];
    if (file) {
      setQuestionPapers(prev => ({
        ...prev,
        [subjectId]: file
      }));
    }
  };

  const handleTotalMarksChange = (subjectId, value) => {
    setTotalMarks(prev => ({
      ...prev,
      [subjectId]: value
    }));
  };

  const handleStartEvaluation = (studentId, subjectId) => {
    // Create a hidden file input and trigger it
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (file) {
        // Check file size (20MB limit)
        const maxSize = 20 * 1024 * 1024; // 20MB in bytes
        if (file.size > maxSize) {
          alert('File size exceeds 20MB limit. Please select a smaller file.');
          return;
        }
        
        // TODO: Handle file upload processing here
        console.log('Selected file:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
        alert(`File "${file.name}" selected successfully. Upload processing will be implemented.`);
      }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  };

  const isEvaluationEnabled = (subjectId) => {
    return questionPapers[subjectId] && totalMarks[subjectId];
  };

  const getEvaluationStatus = (studentId, subjectId) => {
    const key = `${studentId}-${subjectId}`;
    return evaluations[key];
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

  const cleanClassNumber = classNumber.replace('class-', '');
  const termName = `Term ${termId.replace('term', '')}`;

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
          <li>Upload the Marking Scheme and set the Maximum Marks for each subject.</li>
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
                        <div className="upload-control">
                          <label className="upload-label">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => handleQuestionPaperUpload(subject.id, e)}
                              className="upload-input"
                            />
                            <span className="upload-button">
                              {questionPapers[subject.id] ? '✓ Uploaded' : '📄 Upload Marking Scheme'}
                            </span>
                          </label>
                        </div>
                        <div className="marks-control">
                          <input
                            type="number"
                            placeholder="Maximum Marks"
                            value={totalMarks[subject.id] || ''}
                            onChange={(e) => handleTotalMarksChange(subject.id, e.target.value)}
                            className="marks-input"
                            min="1"
                            max="100"
                          />
                        </div>
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
                    
                    return (
                      <td key={subject.id} className="evaluation-cell">
                        {evaluationStatus ? (
                          <div className="evaluation-result">
                            <div className="grade-info">
                              <span className="ai-grade">AI: {evaluationStatus.aiGrade}</span>
                              <span className="teacher-grade">Teacher: {evaluationStatus.teacherGrade}</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            className={`start-evaluation-btn ${!isEnabled ? 'disabled' : ''}`}
                            onClick={() => handleStartEvaluation(student.id, subject.id)}
                            disabled={!isEnabled}
                            title={!isEnabled ? 'Upload marking scheme and set maximum marks first' : 'Start evaluation'}
                          >
                            Start Evaluation
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