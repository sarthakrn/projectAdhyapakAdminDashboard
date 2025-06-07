import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../../context/AppContext';
import './AnswerSheetSubmission.css';

const AnswerSheetSubmission = () => {
  const { classNumber, termId, studentId, subjectId } = useParams();
  const { updateBreadcrumbs } = useApp();
  const navigate = useNavigate();

  const [submissionMethod, setSubmissionMethod] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    const cleanClassNumber = classNumber.replace('class-', '');
    const termName = `Term ${termId.replace('term', '')}`;
    const subjectName = subjectId.charAt(0).toUpperCase() + subjectId.slice(1);
    updateBreadcrumbs([
      'Dashboard', 
      'Evaluation', 
      `Class ${cleanClassNumber}`, 
      termName, 
      `Student ${studentId}`,
      `${subjectName} - Submit Answer Sheet`
    ]);
  }, [classNumber, termId, studentId, subjectId, updateBreadcrumbs]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const handleCameraCapture = () => {
    setCameraActive(true);
    setSubmissionMethod('camera');
    // Camera implementation would go here
  };

  const handleSubmitPDF = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      // API call to upload PDF would go here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate upload
      
      // Navigate back to evaluation dashboard
      navigate(`/evaluation/${classNumber}/${termId}`);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitCapturedImages = async () => {
    if (capturedImages.length === 0) return;
    
    setIsUploading(true);
    try {
      // API call to process captured images into PDF would go here
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate processing
      
      // Navigate back to evaluation dashboard
      navigate(`/evaluation/${classNumber}/${termId}`);
    } catch (error) {
      console.error('Processing failed:', error);
      alert('Processing failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetSubmission = () => {
    setSubmissionMethod(null);
    setSelectedFile(null);
    setCapturedImages([]);
    setCameraActive(false);
  };

  const cleanClassNumber = classNumber.replace('class-', '');
  const termName = `Term ${termId.replace('term', '')}`;
  const subjectName = subjectId.charAt(0).toUpperCase() + subjectId.slice(1);

  return (
    <div className="answer-sheet-container">
      <div className="answer-sheet-header">
        <h1 className="answer-sheet-title">
          Submit Answer Sheet
        </h1>
        <p className="answer-sheet-subtitle">
          Class {cleanClassNumber} - {termName} - Student {studentId} - {subjectName}
        </p>
      </div>

      {!submissionMethod ? (
        <div className="submission-options">
          <div className="options-grid">
            <button
              className="option-card upload-option"
              onClick={() => setSubmissionMethod('upload')}
              type="button"
            >
              <div className="option-icon">📄</div>
              <div className="option-content">
                <h3 className="option-title">Upload PDF</h3>
                <p className="option-description">
                  Select and upload a pre-existing PDF file of the answer sheet
                </p>
              </div>
              <div className="option-arrow">→</div>
            </button>

            <button
              className="option-card camera-option"
              onClick={handleCameraCapture}
              type="button"
            >
              <div className="option-icon">📱</div>
              <div className="option-content">
                <h3 className="option-title">Capture with Camera</h3>
                <p className="option-description">
                  Take multiple pictures of the answer sheet to create a PDF
                </p>
              </div>
              <div className="option-arrow">→</div>
            </button>
          </div>
        </div>
      ) : submissionMethod === 'upload' ? (
        <div className="upload-section">
          <div className="upload-card">
            <div className="upload-icon">📎</div>
            <h3 className="upload-title">Upload PDF File</h3>
            
            <div className="file-upload-area">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="file-input"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="file-upload-label">
                <div className="upload-placeholder">
                  {selectedFile ? (
                    <div className="file-selected">
                      <span className="file-icon">✓</span>
                      <span className="file-name">{selectedFile.name}</span>
                      <span className="file-size">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="upload-prompt">
                      <span className="upload-icon-large">📄</span>
                      <span className="upload-text">Click to select PDF file</span>
                      <span className="upload-hint">Or drag and drop here</span>
                    </div>
                  )}
                </div>
              </label>
            </div>

            <div className="upload-actions">
              <button
                className="action-btn secondary"
                onClick={resetSubmission}
                type="button"
              >
                Back
              </button>
              <button
                className={`action-btn primary ${!selectedFile ? 'disabled' : ''}`}
                onClick={handleSubmitPDF}
                disabled={!selectedFile || isUploading}
                type="button"
              >
                {isUploading ? 'Uploading...' : 'Submit PDF'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="camera-section">
          <div className="camera-card">
            <div className="camera-icon">📸</div>
            <h3 className="camera-title">Camera Capture</h3>
            
            <div className="camera-area">
              {!cameraActive ? (
                <div className="camera-placeholder">
                  <div className="camera-icon-large">📱</div>
                  <p className="camera-text">Camera will be activated here</p>
                  <p className="camera-hint">Take multiple photos of the answer sheet</p>
                </div>
              ) : (
                <div className="camera-widget">
                  <div className="camera-preview">
                    <div className="camera-mock">
                      <span>📹</span>
                      <p>Camera Preview</p>
                      <small>Implementation pending</small>
                    </div>
                  </div>
                  
                  <div className="camera-controls">
                    <button className="capture-btn" type="button">
                      <span className="capture-icon">📸</span>
                      Capture Photo
                    </button>
                  </div>
                  
                  {capturedImages.length > 0 && (
                    <div className="captured-images">
                      <h4>Captured Images ({capturedImages.length})</h4>
                      <div className="images-grid">
                        {capturedImages.map((image, index) => (
                          <div key={index} className="captured-image">
                            <span className="image-number">{index + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="camera-actions">
              <button
                className="action-btn secondary"
                onClick={resetSubmission}
                type="button"
              >
                Back
              </button>
              <button
                className={`action-btn primary ${capturedImages.length === 0 ? 'disabled' : ''}`}
                onClick={handleSubmitCapturedImages}
                disabled={capturedImages.length === 0 || isUploading}
                type="button"
              >
                {isUploading ? 'Processing...' : 'Submit Images'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="upload-overlay">
          <div className="upload-progress">
            <div className="spinner"></div>
            <p className="upload-text">
              {submissionMethod === 'upload' ? 'Uploading PDF...' : 'Processing images...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnswerSheetSubmission;