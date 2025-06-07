import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import studentApiService from '../../../services/studentApiService';
import './StudentList.css';

const StudentList = () => {
  const { classNumber, subject, termId } = useParams();
  const { updateBreadcrumbs, user } = useApp();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const subjectName = subject
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    const cleanClassNumber = classNumber.replace('class-', '');
    const termName = termId.charAt(0).toUpperCase() + termId.slice(1);
    updateBreadcrumbs(['Dashboard', "School's AI Management System", `Class ${cleanClassNumber}`, 'Academics', subjectName, 'Evaluation', termName, 'Students']);
  }, [classNumber, subject, termId, updateBreadcrumbs]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!user) return;
      
      setLoading(true);
      setError('');
      
      try {
        const cleanClassNumber = classNumber.replace('class-', '');
        const result = await studentApiService.getStudents(cleanClassNumber, user);
        
        if (result.success) {
          const studentsData = result.students || [];
          
          // Get saved statuses from localStorage
          const getStudentStatus = (studentId) => {
            try {
              const storageKey = `evaluation_status_${classNumber}_${subject}_${termId}`;
              const statusData = localStorage.getItem(storageKey);
              if (statusData) {
                const parsed = JSON.parse(statusData);
                return parsed[studentId]?.status || 'Pending Evaluation';
              }
              return 'Pending Evaluation';
            } catch (error) {
              console.error('Error getting student status:', error);
              return 'Pending Evaluation';
            }
          };
          
          // Transform API data to include evaluation status and combine name
          const transformedStudents = studentsData.map((student, index) => {
            const studentId = student.username || `student_${index + 1}`;
            return {
              id: studentId,
              name: `${student.firstName} ${student.lastName}`,
              rollNumber: student.rollNumber || 'N/A',
              section: student.section || 'N/A',
              status: getStudentStatus(studentId),
              username: student.username,
              firstName: student.firstName,
              lastName: student.lastName
            };
          });
          
          setStudents(transformedStudents);
        } else {
          setError(result.error || 'Failed to load students');
          setStudents([]);
        }
      } catch (err) {
        setError(`Network error: ${err.message || 'Unknown error occurred'}`);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [classNumber, subject, termId, user]);

  const subjectName = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const termName = termId.replace('term', 'Term ');

  const handleProcessAnswers = (student) => {
    navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation/${termId}/students/${student.id}/process`);
  };

  const pendingCount = students.filter(s => s.status === 'Pending Evaluation').length;
  const submittedCount = students.filter(s => s.status === 'Answer Submitted').length;

  return (
    <div className="student-list-container">
      <div className="student-list-header">
        <h1 className="student-list-title">
          Student Evaluation - {termName}
        </h1>
        <p className="student-list-subtitle">
          {subjectName} evaluation for Class{classNumber.replace('class-', '')}
        </p>
        <div className="stats-container">
          <div className="stat-card">
            <span className="stat-number">{students.length}</span>
            <span className="stat-label">Total Students</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{submittedCount}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{pendingCount}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="students-grid">
        {students.map((student, index) => (
          <div
            key={student.id}
            className="student-card"
            style={{
              '--animation-delay': `${index * 0.1}s`
            }}
          >
            <div className="student-info">
              <div className="student-avatar">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div className="student-details">
                <h3 className="student-name">{student.name}</h3>
                <p className="student-roll">Roll No: {student.rollNumber}</p>
                <p className="student-section">Section: {student.section}</p>
                <div className={`student-status ${student.status === 'Answer Submitted' ? 'completed' : 'pending'}`}>
                  <span className="status-indicator"></span>
                  <span className="status-text">{student.status}</span>
                </div>
              </div>
            </div>
            <button
              className="process-button"
              onClick={() => handleProcessAnswers(student)}
              type="button"
            >
              <span className="process-icon">📋</span>
              <span className="process-text">Process Answers</span>
              <span className="process-arrow">→</span>
            </button>
          </div>
        ))}
      </div>

      {loading && (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h3 className="empty-title">Loading Students...</h3>
          <p className="empty-description">
            Fetching student data for evaluation.
          </p>
        </div>
      )}

      {error && (
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <h3 className="empty-title">Error Loading Students</h3>
          <p className="empty-description">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '16px'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && students.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h3 className="empty-title">No Students Found</h3>
          <p className="empty-description">
            No student data available for Class {classNumber.replace('class-', '')}. 
            Please check if students are enrolled or try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '16px'
            }}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentList;