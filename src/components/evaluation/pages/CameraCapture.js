import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import studentApiService from '../../../services/studentApiService';
import './CameraCapture.css';

const CameraCapture = () => {
  const { classNumber, subject, termId, studentId } = useParams();
  const { updateBreadcrumbs, user } = useApp();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [actionCompleted, setActionCompleted] = useState(false);

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
              'Class Selector', 
              `Class${cleanClassNumber}`, 
              'Academics', 
              subjectName, 
              'Evaluation', 
              termName, 
              'Students',
              transformedStudent.name,
              'Camera Capture'
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
  }, [classNumber, subject, termId, studentId, updateBreadcrumbs, user]);

  const subjectName = subject
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const termName = termId.replace('term', 'Term ');

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setActionCompleted(true);
    } else {
      alert('Please select an image file only.');
      event.target.value = '';
    }
  };

  const handleBackToProcess = () => {
    if (actionCompleted) {
      // Navigate back to process page with success parameter to trigger status update
      navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation/${termId}/students/${studentId}/process?captureSuccess=true`);
    } else {
      navigate(`/class-selector/${classNumber}/academics/${subject}/evaluation/${termId}/students/${studentId}/process`);
    }
  };

  if (loading) {
    return (
      <div className="camera-capture-container">
        <div className="loading-state">
          <div className="loading-icon">🔄</div>
          <h3 className="loading-title">Loading Student Data...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="camera-capture-container">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Error Loading Student</h3>
          <p className="error-message">{error}</p>
          <button 
            className="back-button"
            onClick={handleBackToProcess}
            type="button"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="camera-capture-container">
        <div className="loading-state">
          <div className="loading-icon">❌</div>
          <h3 className="loading-title">Student Not Found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-capture-container">
      <div className="camera-capture-header">
        <div className="student-info-banner">
          <div className="student-avatar-large">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="student-details-large">
            <h1 className="camera-capture-title">
              Capture Answer Sheet: {student.name}
            </h1>
            <p className="student-info-text">
              <strong>{student.name}</strong> • Roll No: {student.rollNumber} • Section: {student.section}
            </p>
            <p className="camera-capture-subtitle">
              {subjectName} • {termName} • Class{classNumber.replace('class-', '')}
            </p>
          </div>
        </div>
      </div>

      {!actionCompleted ? (
        <div className="camera-placeholder">
          <div className="camera-placeholder-card">
            <div className="placeholder-icon">
              <span className="icon-background">📷</span>
            </div>
            <div className="placeholder-content">
              <h2 className="placeholder-title">Camera Capture Under Development</h2>
              <p className="placeholder-message">
                Camera capture interface will be implemented in a future update. 
                For now, please simulate by uploading an image file of the answer sheet.
              </p>
              <div className="simulation-section">
                <h3 className="simulation-title">Simulate Camera Capture</h3>
                <p className="simulation-description">
                  Upload an image file to simulate capturing the answer sheet with camera
                </p>
                <label className="upload-simulation-button">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="file-input-hidden"
                  />
                  <span className="upload-icon">📸</span>
                  <span className="upload-text">Select Image File</span>
                </label>
              </div>
            </div>
          </div>

          <div className="coming-soon-features">
            <h3 className="features-title">Coming Soon</h3>
            <div className="features-grid">
              <div className="feature-card">
                <div className="card-icon">📷</div>
                <h4 className="card-title">Live Camera</h4>
                <p className="card-description">Real-time camera access for capturing answer sheets</p>
              </div>
              <div className="feature-card">
                <div className="card-icon">🔍</div>
                <h4 className="card-title">Auto Focus</h4>
                <p className="card-description">Automatic focusing and edge detection</p>
              </div>
              <div className="feature-card">
                <div className="card-icon">✂️</div>
                <h4 className="card-title">Auto Crop</h4>
                <p className="card-description">Intelligent cropping and perspective correction</p>
              </div>
              <div className="feature-card">
                <div className="card-icon">🌟</div>
                <h4 className="card-title">Enhancement</h4>
                <p className="card-description">Automatic brightness and contrast adjustment</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="completion-state">
          <div className="success-animation">
            <div className="success-icon">✅</div>
            <h2 className="success-title">Image Captured Successfully!</h2>
            <p className="success-message">
              Image "{selectedImage?.name}" has been selected as simulation for camera capture.
            </p>
            
            <div className="image-preview">
              <div className="preview-icon">🖼️</div>
              <div className="preview-details">
                <h4 className="preview-title">Selected Image</h4>
                <p className="preview-info">
                  File: {selectedImage?.name}<br/>
                  Size: {selectedImage ? Math.round(selectedImage.size / 1024) : 0} KB<br/>
                  Type: {selectedImage?.type}
                </p>
              </div>
            </div>
            
            <div className="completion-actions">
              <button
                className="back-button primary"
                onClick={handleBackToProcess}
                type="button"
              >
                <span className="back-icon">✓</span>
                <span className="back-text">Complete & Return</span>
              </button>
              
              <button
                className="retry-button secondary"
                onClick={() => {
                  setActionCompleted(false);
                  setSelectedImage(null);
                }}
                type="button"
              >
                <span className="retry-icon">🔄</span>
                <span className="retry-text">Capture Another</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="camera-navigation">
        <button
          className="nav-button back-nav"
          onClick={handleBackToProcess}
          type="button"
        >
          <span className="nav-icon">←</span>
          <span className="nav-text">Back to Process Options</span>
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;