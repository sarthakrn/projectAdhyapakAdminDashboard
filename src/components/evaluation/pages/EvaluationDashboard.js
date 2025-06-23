import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import evaluationService from '../../../services/evaluationService';
import markingSchemeService from '../../../services/markingSchemeService';
import './EvaluationDashboard.css';

const EvaluationDashboard = () => {
  const { classNumber, termId } = useParams();
  const { updateBreadcrumbs, user } = useApp();
  const navigate = useNavigate();

  // Core state
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('Loading student data...');

  // Marking scheme state - proper state management
  const [markingSchemeStatus, setMarkingSchemeStatus] = useState({});
  const [loadingMarkingSchemes, setLoadingMarkingSchemes] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubject, setUploadSubject] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSubject, setResetSubject] = useState(null);
  const [resetFile, setResetFile] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetProgress, setResetProgress] = useState(0);
  const [resetError, setResetError] = useState('');

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Subject configuration - hardcoded as per requirements
  const subjects = useMemo(() => [
    { id: 'hindi', name: 'Hindi', color: 'rgba(220, 53, 69, 0.8)' },
    { id: 'english', name: 'English', color: 'rgba(0, 123, 255, 0.8)' },
    { id: 'mathematics', name: 'Mathematics', color: 'rgba(40, 167, 69, 0.8)' },
    { id: 'social-science', name: 'Social Science', color: 'rgba(253, 126, 20, 0.8)' },
    { id: 'science', name: 'Science', color: 'rgba(108, 117, 125, 0.8)' }
  ], []);

  // Format class and term names for API calls
  const formattedClassName = useMemo(() => {
    return markingSchemeService.formatClassName(classNumber);
  }, [classNumber]);

  const formattedTermName = useMemo(() => {
    return markingSchemeService.formatTermName(termId);
  }, [termId]);

  // Extract school code
  const schoolCode = useMemo(() => {
    return markingSchemeService.extractSchoolCode(user);
  }, [user]);

  // Update breadcrumbs
  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    const termName = `Term ${termId.replace('term', '')}`;
    updateBreadcrumbs(['Dashboard', 'Evaluation', `Class ${cleanClassNumber}`, termName]);
  }, [classNumber, termId, updateBreadcrumbs]);

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  }, []);

  // Fetch students using existing function
  const fetchStudents = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingStatus('Loading student data...');
      const studentsResult = await evaluationService.getStudentsForEvaluation(classNumber, user);
      
      if (!studentsResult.success) {
        throw new Error(studentsResult.error || 'Failed to fetch students');
      }

      setStudents(studentsResult.students || []);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to fetch students');
    }
  }, [classNumber, user]);

  // Check marking scheme status for a single subject - PROPER STATE MANAGEMENT
  const checkMarkingSchemeStatus = useCallback(async (subject) => {
    if (!user || !user.id_token) return { exists: false, data: null, error: 'No authentication' };

    try {
      // Use corrected API call with query parameters
      const queryParams = new URLSearchParams({
        schoolCode: schoolCode,
        className: formattedClassName,
        term: formattedTermName,
        subject: subject.id.toUpperCase()
      });

      console.log('📤 Checking marking scheme for:', subject.name, {
        endpoint: `${markingSchemeService.baseUrl}/students/update_marking_scheme?${queryParams}`
      });

      const response = await fetch(`${markingSchemeService.baseUrl}/students/update_marking_scheme?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': user.id_token,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        throw new Error('Session expired. Please log in again.');
      }

      if (response.status === 404) {
        console.log('📭 No marking scheme found for:', subject.name);
        return { exists: false, data: null, error: null };
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('✅ Marking scheme found for:', subject.name, responseData);

      return { exists: true, data: responseData, error: null };

    } catch (error) {
      console.error('❌ Error checking marking scheme for', subject.name, ':', error);
      return { exists: false, data: null, error: error.message };
    }
  }, [user, schoolCode, formattedClassName, formattedTermName]);

  // Fetch marking scheme status for all subjects - CRITICAL IMPLEMENTATION
  const fetchMarkingSchemeStatus = useCallback(async () => {
    if (!user) return;

    setLoadingMarkingSchemes(true);
    const status = {};

    try {
      // Check each subject independently with proper async handling
      for (const subject of subjects) {
        const result = await checkMarkingSchemeStatus(subject);
        status[subject.id] = result;
      }

      setMarkingSchemeStatus(status);
      console.log('📋 Final marking scheme status:', status);
    } catch (error) {
      console.error('Error fetching marking scheme status:', error);
      showToast('Error checking marking scheme status', 'error');
    } finally {
      setLoadingMarkingSchemes(false);
    }
  }, [user, subjects, checkMarkingSchemeStatus, showToast]);

  // Main initialization effect
  useEffect(() => {
    const initializePage = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Step 1: Fetch students
        await fetchStudents();

        // Step 2: Check marking scheme status for all subjects
        setLoadingStatus('Checking marking scheme status...');
        await fetchMarkingSchemeStatus();

        setLoadingStatus('');
      } catch (err) {
        console.error('Error initializing evaluation page:', err);
        setError(err.message || 'Failed to initialize evaluation page');
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, [user, fetchStudents, fetchMarkingSchemeStatus]);

  // Handle upload marking scheme
  const handleUploadMarkingScheme = (subject) => {
    setUploadSubject(subject);
    setSelectedFile(null);
    setUploadError('');
    setUploadProgress(0);
    setShowUploadModal(true);
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validation = markingSchemeService.validateMarkingSchemeFile(file);
      if (validation.isValid) {
        setSelectedFile(file);
        setUploadError('');
      } else {
        setUploadError(validation.errors.join(', '));
        setSelectedFile(null);
      }
    }
  };

  // Handle file upload with proper state update
  const handleFileUpload = async () => {
    if (!selectedFile || !uploadSubject) return;

    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    try {
      // Upload PDF and create database record using existing service
      const result = await markingSchemeService.uploadAndCreateMarkingScheme(
        selectedFile,
        formattedClassName,
        formattedTermName,
        uploadSubject.id,
        user,
        (progress) => setUploadProgress(progress)
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // CRITICAL: Update state to reflect successful upload
      const updatedStatus = await checkMarkingSchemeStatus(uploadSubject);
      setMarkingSchemeStatus(prev => ({
        ...prev,
        [uploadSubject.id]: updatedStatus
      }));

      // Close modal and show success
      setShowUploadModal(false);
      showToast('Marking scheme uploaded successfully!', 'success');

    } catch (error) {
      console.error('Error uploading marking scheme:', error);
      setUploadError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle view marking scheme - COMPREHENSIVE DEBUGGING AND FALLBACK
  const handleViewMarkingScheme = async (subject) => {
    const status = markingSchemeStatus[subject.id];
    console.log('🔍 DEBUG: View marking scheme called for:', subject.name);
    console.log('🔍 DEBUG: Status object:', status);
    
    if (status && status.exists && status.data && status.data.s3_path) {
      try {
        console.log('📤 Generating view URL for:', subject.name);
        console.log('📤 Status data:', JSON.stringify(status.data, null, 2));
        console.log('📤 Original s3_path:', status.data.s3_path);
        
        // CRITICAL FIX: Ensure S3 client is properly initialized before generating URL
        const { default: s3Service } = await import('../../../services/s3Service');
        
        // Initialize S3 client if not already initialized
        try {
          await s3Service.initializeS3Client(user.id_token);
        } catch (initError) {
          console.log('S3 client already initialized or reinitializing...');
        }
        
        // Try primary path first
        let viewUrl = await markingSchemeService.getMarkingSchemeViewUrl(status.data, user);
        
        // FALLBACK: If primary path fails, try with regenerated uppercase path
        if (!viewUrl) {
          console.log('🔄 Primary path failed, trying fallback with regenerated path...');
          
          // Generate the expected uppercase S3 path
          const expectedS3Path = markingSchemeService.generateMarkingSchemeS3Path(
            user, 
            formattedClassName, 
            formattedTermName, 
            subject.id
          );
          
          console.log('🔄 Fallback expected S3 key:', expectedS3Path);
          
          // Create fallback data object with corrected path
          const fallbackData = {
            ...status.data,
            s3_path: `s3://${s3Service.bucketName}/${expectedS3Path}`
          };
          
          console.log('🔄 Fallback data:', JSON.stringify(fallbackData, null, 2));
          
          // Try with fallback path
          viewUrl = await markingSchemeService.getMarkingSchemeViewUrl(fallbackData, user);
        }
        
        if (viewUrl) {
          console.log('✅ Opening marking scheme in new tab:', viewUrl);
          window.open(viewUrl, '_blank');
          showToast('Opening marking scheme...', 'success');
        } else {
          console.error('❌ Both primary and fallback paths failed');
          console.error('❌ Debug info:', {
            subject: subject.name,
            originalPath: status.data.s3_path,
            schoolCode: schoolCode,
            className: formattedClassName,
            term: formattedTermName,
            subjectId: subject.id
          });
          showToast('Unable to generate view URL. Please check console for details.', 'error');
        }
      } catch (error) {
        console.error('❌ Error generating view URL:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          subject: subject.name,
          statusData: status.data
        });
        showToast('Failed to open marking scheme', 'error');
      }
    } else {
      console.error('❌ Invalid marking scheme data for:', subject.name);
      console.error('❌ Status details:', {
        exists: status?.exists,
        hasData: !!status?.data,
        hasS3Path: !!status?.data?.s3_path,
        fullStatus: status
      });
      showToast('No marking scheme data available', 'error');
    }
  };

  // Handle reset marking scheme
  const handleResetMarkingScheme = (subject) => {
    setResetSubject(subject);
    setResetFile(null);
    setResetError('');
    setResetProgress(0);
    setShowResetModal(true);
  };

  // Handle reset file selection
  const handleResetFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validation = markingSchemeService.validateMarkingSchemeFile(file);
      if (validation.isValid) {
        setResetFile(file);
        setResetError('');
      } else {
        setResetError(validation.errors.join(', '));
        setResetFile(null);
      }
    }
  };

  // Handle reset file upload (replace existing marking scheme)
  const handleResetFileUpload = async () => {
    if (!resetFile || !resetSubject) return;

    setResetting(true);
    setResetError('');
    setResetProgress(0);

    try {
      // Use the replace functionality to overwrite existing file
      const result = await markingSchemeService.replaceMarkingSchemePDF(
        resetFile,
        formattedClassName,
        formattedTermName,
        resetSubject.id,
        user,
        (progress) => setResetProgress(progress)
      );

      if (!result.success) {
        throw new Error(result.error || 'Reset failed');
      }

      // Refresh marking scheme status for this subject to ensure UI stays consistent
      const updatedStatus = await checkMarkingSchemeStatus(resetSubject);
      setMarkingSchemeStatus(prev => ({
        ...prev,
        [resetSubject.id]: updatedStatus
      }));

      // Close modal and show success
      setShowResetModal(false);
      showToast('Marking scheme has been replaced successfully!', 'success');

    } catch (error) {
      console.error('Error resetting marking scheme:', error);
      setResetError(error.message || 'Reset failed');
    } finally {
      setResetting(false);
      setResetProgress(0);
    }
  };

  // Handle start evaluation (placeholder)
  const handleStartEvaluation = (student, subject) => {
    console.log(`Start Evaluation clicked for ${student.name} in ${subject.name}`);
  };

  // Close upload modal
  const closeModal = () => {
    setShowUploadModal(false);
    setUploadSubject(null);
    setSelectedFile(null);
    setUploading(false);
    setUploadError('');
    setUploadProgress(0);
  };

  // Close reset modal
  const closeResetModal = () => {
    setShowResetModal(false);
    setResetSubject(null);
    setResetFile(null);
    setResetting(false);
    setResetError('');
    setResetProgress(0);
  };

  if (loading) {
    return (
      <div className="evaluation-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{loadingStatus || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="evaluation-dashboard">
        <div className="error-container">
          <div className="error-message">
            <h3>Error Loading Evaluation Dashboard</h3>
            <p>{error}</p>
            <button 
              className="btn btn-retry"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-dashboard">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* FIXED: Removed redundant dashboard-info section */}
      <div className="dashboard-header">
        <h1>Evaluation Dashboard</h1>
      </div>

      {/* Table-based Layout with FIXED alignment and styling */}
      <div className="evaluation-table-container">
        <table className="evaluation-table">
          <thead>
            <tr>
              <th className="name-column">NAME</th>
              {subjects.map(subject => (
                <th key={subject.id} className="subject-column">
                  <div className="subject-header">
                    <span className="subject-name">{subject.name}</span>
                    {loadingMarkingSchemes ? (
                      <div className="loading-spinner-small">Loading...</div>
                    ) : (
                      <div className="subject-actions">
                        {/* CRITICAL: Proper conditional rendering based on state */}
                        {markingSchemeStatus[subject.id]?.exists ? (
                          // Marking scheme exists - show VIEW button and RESET icon
                          <div className="scheme-actions-container">
                            <button
                              className="btn btn-view"
                              onClick={() => handleViewMarkingScheme(subject)}
                              title="View Marking Scheme"
                            >
                              View Marking Scheme
                            </button>
                            <button
                              className="btn btn-reset"
                              onClick={() => handleResetMarkingScheme(subject)}
                              title="Reset Marking Scheme"
                            >
                              ↻
                            </button>
                          </div>
                        ) : (
                          // No marking scheme - show only UPLOAD button
                          <button
                            className="btn btn-upload"
                            onClick={() => handleUploadMarkingScheme(subject)}
                          >
                            Upload Marking Scheme
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id || student.username}>
                <td className="name-cell">
                  <div className="student-info">
                    <span className="student-name">{student.name}</span>
                    <span className="student-roll">Roll: {student.rollNumber}</span>
                  </div>
                </td>
                {subjects.map(subject => (
                  <td key={subject.id} className="subject-cell">
                    <button
                      className="btn btn-start-evaluation"
                      disabled={!markingSchemeStatus[subject.id]?.exists}
                      onClick={() => handleStartEvaluation(student, subject)}
                    >
                      Start Evaluation
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="no-students">
          <p>No students found for this class.</p>
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/class-selector/${classNumber}/student-management`)}
          >
            Manage Students
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Marking Scheme</h3>
              <span className="subject-name">{uploadSubject?.name}</span>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              {uploadError && (
                <div className="error-message">{uploadError}</div>
              )}

              <div className="file-upload-section">
                <label htmlFor="marking-scheme-file" className="file-upload-label">
                  Select PDF File (Max 20MB)
                </label>
                <input
                  id="marking-scheme-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {selectedFile && (
                  <div className="selected-file-info">
                    <span>📄 {selectedFile.name}</span>
                    <span className="file-size">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              {uploadProgress > 0 && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span>{uploadProgress}%</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-cancel"
                onClick={closeModal}
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleFileUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={closeResetModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset Marking Scheme</h3>
              <span className="subject-name">{resetSubject?.name}</span>
              <button className="modal-close" onClick={closeResetModal}>×</button>
            </div>

            <div className="modal-body">
              {resetError && (
                <div className="error-message">{resetError}</div>
              )}

              <div className="file-upload-section">
                <label htmlFor="reset-scheme-file" className="file-upload-label">
                  Select New PDF File (Max 20MB)
                </label>
                <input
                  id="reset-scheme-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleResetFileSelect}
                  disabled={resetting}
                />
                {resetFile && (
                  <div className="selected-file-info">
                    <span>📄 {resetFile.name}</span>
                    <span className="file-size">
                      ({(resetFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                )}
              </div>

              {resetProgress > 0 && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${resetProgress}%` }}
                    ></div>
                  </div>
                  <span>{resetProgress}%</span>
                </div>
              )}

              <div className="reset-info">
                <p><strong>Note:</strong> This will replace the existing marking scheme with the new file.</p>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-cancel"
                onClick={closeResetModal}
                disabled={resetting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleResetFileUpload}
                disabled={!resetFile || resetting}
              >
                {resetting ? 'Replacing...' : 'Replace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationDashboard;