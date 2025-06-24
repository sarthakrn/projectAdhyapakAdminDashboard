import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import './GradingResults.css';

const GradingResults = () => {
  const { classNumber, termId, studentId, subjectId } = useParams();
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [gradingData, setGradingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Extract grading data from navigation state or URL params
  useEffect(() => {
    if (location.state && location.state.gradingData) {
      setGradingData(location.state.gradingData);
      setLoading(false);
    } else {
      setError('No grading data available. Please return to the evaluation dashboard.');
      setLoading(false);
    }
  }, [location.state]);

  // Update breadcrumbs
  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    const termName = `Term ${termId.replace('term', '')}`;
    const studentName = location.state?.studentName || `Student ${studentId}`;
    const subjectName = subjectId.charAt(0).toUpperCase() + subjectId.slice(1);
    
    updateBreadcrumbs([
      'Dashboard', 
      'Evaluation', 
      `Class ${cleanClassNumber}`, 
      termName,
      studentName,
      `${subjectName} - Grading Results`
    ]);
  }, [classNumber, termId, studentId, subjectId, updateBreadcrumbs, location.state]);

  // Parse evaluation matrix if it's a string
  const parseEvaluationData = (data) => {
    if (typeof data.body === 'string') {
      try {
        const parsedBody = JSON.parse(data.body);
        return {
          ...data,
          ...parsedBody
        };
      } catch (error) {
        console.error('Error parsing evaluation data:', error);
        return data;
      }
    }
    return data;
  };

  // Get grade color based on percentage
  const getGradeColor = (percentage) => {
    if (percentage >= 90) return '#28a745'; // Green
    if (percentage >= 75) return '#17a2b8'; // Blue
    if (percentage >= 60) return '#ffc107'; // Yellow
    if (percentage >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };

  // Get grade letter based on percentage
  const getGradeLetter = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    return 'F';
  };

  const handleBackToDashboard = () => {
    navigate(`/evaluation/${classNumber}/${termId}`);
  };

  if (loading) {
    return (
      <div className="grading-results-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading grading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grading-results-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Results</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={handleBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const parsedData = parseEvaluationData(gradingData);
  const evaluationMatrix = parsedData.evaluationMatrix || {};
  const totalGrade = evaluationMatrix.total_grade || parsedData.totalScore || {};
  const questions = evaluationMatrix.questions || [];
  const evaluationSummary = evaluationMatrix.evaluation_summary || {};
  const unevaluatedQuestions = evaluationMatrix.unevaluated_questions || {};

  const percentage = totalGrade.percentage || 0;
  const earned = totalGrade.earned || 0;
  const max = totalGrade.max || 0;

  return (
    <div className="grading-results-container">
      <div className="results-header">
        <div className="header-content">
          <h1>Grading Results</h1>
          <div className="result-meta">
            <span className="grade-id">Grade ID: {parsedData.gradeID}</span>
            <span className="timestamp">
              {parsedData.timestamp && new Date(parsedData.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
        <button className="btn btn-secondary" onClick={handleBackToDashboard}>
          Back to Dashboard
        </button>
      </div>

      {/* Overall Score Card */}
      <div className="score-card">
        <div className="score-display">
          <div className="score-circle" style={{ '--grade-color': getGradeColor(percentage) }}>
            <span className="percentage">{percentage.toFixed(1)}%</span>
            <span className="grade-letter">{getGradeLetter(percentage)}</span>
          </div>
          <div className="score-details">
            <div className="score-fraction">
              <span className="earned">{earned}</span>
              <span className="separator">/</span>
              <span className="max">{max}</span>
            </div>
            <div className="score-label">Total Score</div>
            {totalGrade.has_unevaluated && (
              <div className="unevaluated-notice">
                ⚠️ Some questions remain unevaluated
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Question-wise Breakdown */}
      <div className="questions-section">
        <h2>Question-wise Breakdown</h2>
        <div className="questions-grid">
          {questions.map((question, index) => (
            <div key={question.question_id || index} className="question-card">
              <div className="question-header">
                <span className="question-id">Q{question.question_id}</span>
                <div className="question-score">
                  <span className="earned">{question.grade?.earned || 0}</span>
                  <span className="separator">/</span>
                  <span className="max">{question.grade?.max || 0}</span>
                </div>
              </div>
              <div className="question-content">
                <p className="question-brief">{question.question_brief}</p>
                <div className="reasoning">
                  <strong>Feedback:</strong>
                  <p>{question.reasoning}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Summary */}
      {evaluationSummary.overall_assessment && (
        <div className="summary-section">
          <h2>Evaluation Summary</h2>
          
          <div className="summary-card overall-assessment">
            <h3>Overall Assessment</h3>
            <p>{evaluationSummary.overall_assessment}</p>
          </div>

          <div className="summary-grid">
            {evaluationSummary.key_strengths && evaluationSummary.key_strengths.length > 0 && (
              <div className="summary-card strengths">
                <h3>✅ Key Strengths</h3>
                <ul>
                  {evaluationSummary.key_strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluationSummary.key_weaknesses && evaluationSummary.key_weaknesses.length > 0 && (
              <div className="summary-card weaknesses">
                <h3>⚠️ Areas for Improvement</h3>
                <ul>
                  {evaluationSummary.key_weaknesses.map((weakness, index) => (
                    <li key={index}>{weakness}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluationSummary.suggestions_for_improvement && evaluationSummary.suggestions_for_improvement.length > 0 && (
              <div className="summary-card suggestions">
                <h3>💡 Suggestions for Improvement</h3>
                <ul>
                  {evaluationSummary.suggestions_for_improvement.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unevaluated Questions */}
      {unevaluatedQuestions.count > 0 && (
        <div className="unevaluated-section">
          <h2>Unevaluated Questions</h2>
          <div className="unevaluated-notice">
            <p>
              <strong>{unevaluatedQuestions.count}</strong> questions could not be evaluated automatically.
            </p>
            {unevaluatedQuestions.questions && unevaluatedQuestions.questions.length > 0 && (
              <ul>
                {unevaluatedQuestions.questions.map((question, index) => (
                  <li key={index}>Q{question.question_id}: {question.question_brief}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="results-actions">
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print Results
        </button>
        <button className="btn btn-secondary" onClick={handleBackToDashboard}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default GradingResults;