import React, { useState, useRef } from 'react';
import s3Service from '../../services/s3Service';
import { useApp } from '../../context/AppContext';
import './FileUpload.css';

const FileUpload = ({ 
  classNumber, 
  module, 
  subject = null, 
  subSection = null, 
  onUploadComplete,
  onUploadStart 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadResults, setUploadResults] = useState(null);
  const fileInputRef = useRef(null);
  const { user } = useApp();

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // Validate file batch constraints
    const batchValidation = s3Service.validateUploadBatch(fileArray);
    if (!batchValidation.isValid) {
      alert(batchValidation.error);
      return;
    }

    // Validate individual files
    for (const file of fileArray) {
      const validation = s3Service.validateFile(file);
      if (!validation.isValid) {
        alert(`File "${file.name}": ${validation.error}`);
        return;
      }
    }
    
    uploadFiles(fileArray);
  };

  const uploadFiles = async (files) => {
    // Debug: Log user object structure
    console.log('Full user object:', user);
    console.log('User profile:', user?.profile);
    console.log('Available user properties:', Object.keys(user || {}));
    
    // Extract username from user object - try multiple possible locations
    const username = user?.profile?.preferred_username || 
                    user?.profile?.username || 
                    user?.profile?.['cognito:username'] ||
                    user?.preferred_username ||
                    user?.username ||
                    user?.sub;

    console.log('Using username:', username);

    if (!user) {
      alert('User not authenticated properly - no user object found');
      return;
    }

    if (!username) {
      console.error('Could not extract username from user object. Available properties:', Object.keys(user?.profile || user || {}));
      alert('Unable to determine user identity. Please try logging out and back in.');
      return;
    }

    console.log('✅ Successfully extracted username:', username);

    // Check category file limit before upload
    try {
      await s3Service.initializeS3Client(user.id_token);
      
      const s3Prefix = s3Service.getS3Prefix(
        username,
        classNumber,
        module,
        subject,
        subSection
      );
      
      const limitCheck = await s3Service.checkCategoryFileLimit(s3Prefix);
      
      if (limitCheck.isAtLimit) {
        alert(`Cannot upload more files. This category already contains the maximum of 20 files (${limitCheck.count} files found).`);
        return;
      }
      
      if (files.length > limitCheck.remaining) {
        alert(`Cannot upload ${files.length} files. Only ${limitCheck.remaining} more files can be added to this category (current: ${limitCheck.count}/20).`);
        return;
      }
      
      if (limitCheck.remaining <= 5) {
        const proceed = window.confirm(`This category currently has ${limitCheck.count} files. You can upload ${limitCheck.remaining} more files before reaching the limit of 20. Do you want to continue?`);
        if (!proceed) return;
      }
      
    } catch (error) {
      console.error('Error checking file limits:', error);
      const proceed = window.confirm('Could not verify file limits. Do you want to continue with the upload?');
      if (!proceed) return;
    }

    setIsUploading(true);
    setUploadResults(null);
    if (onUploadStart) onUploadStart();

    try {
      // Initialize S3 client with user's ID token
      const idToken = user.id_token;
      
      // Debug: Log token information
      console.log('ID Token exists:', !!idToken);
      console.log('ID Token preview:', idToken ? idToken.substring(0, 50) + '...' : 'No token');
      
      // Debug: Try to decode JWT payload for debugging
      if (idToken) {
        try {
          const tokenParts = idToken.split('.');
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('JWT Payload:', payload);
          console.log('Token issuer (iss):', payload.iss);
          console.log('Token subject (sub):', payload.sub);
          console.log('Token username claims:', {
            preferred_username: payload.preferred_username,
            username: payload.username,
            'cognito:username': payload['cognito:username']
          });
          console.log('✅ Using username from cognito:username:', payload['cognito:username']);
        } catch (decodeError) {
          console.error('Error decoding JWT token:', decodeError);
        }
      }
      
      // S3 client already initialized during limit check

      // Create S3 key generator function
      const getS3KeyFunction = (filename) => {
        return s3Service.constructS3Key(
          username,
          classNumber,
          module,
          subject,
          subSection,
          filename
        );
      };

      // Upload files with progress tracking
      const results = await s3Service.uploadMultipleFiles(
        files,
        getS3KeyFunction,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setUploadResults(results);
      
      if (onUploadComplete) {
        onUploadComplete(results);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadResults({
        results: [],
        summary: { total: files.length, success: 0, errors: files.length }
      });
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleInputChange = (e) => {
    handleFileSelect(e.target.files);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const resetUpload = () => {
    setUploadResults(null);
    setUploadProgress({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.gif"
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      {!isUploading && !uploadResults && (
        <div
          className={`file-upload-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            <h3>Upload Files</h3>
            <p>Drag and drop files here or click to browse</p>
            <small>
              Supported: PDF (max 10MB, up to 5 files), PNG/JPG/JPEG/GIF (max 2MB each, up to 5 files)
              <br />
              Maximum 20 files per category
            </small>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="upload-progress-container">
          <div className="upload-header">
            <h3>Uploading Files...</h3>
            <div className="progress-summary">
              {uploadProgress.current || 0} of {uploadProgress.total || 0} files
              {uploadProgress.successCount > 0 && (
                <span className="success-count"> ({uploadProgress.successCount} completed)</span>
              )}
              {uploadProgress.errorCount > 0 && (
                <span className="error-count"> ({uploadProgress.errorCount} failed)</span>
              )}
            </div>
          </div>
          
          {uploadProgress.currentFile && (
            <div className="current-file">
              Currently uploading: <strong>{uploadProgress.currentFile}</strong>
            </div>
          )}

          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${((uploadProgress.current || 0) / (uploadProgress.total || 1)) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      )}

      {uploadResults && (
        <div className="upload-results-container">
          <div className="results-header">
            <h3>Upload Complete</h3>
            <div className="results-summary">
              <span className="total">Total: {uploadResults.summary.total}</span>
              <span className="success">Success: {uploadResults.summary.success}</span>
              <span className="errors">Errors: {uploadResults.summary.errors}</span>
            </div>
          </div>

          {uploadResults.results.length > 0 && (
            <div className="results-list">
              {uploadResults.results.map((result, index) => (
                <div 
                  key={index} 
                  className={`result-item ${result.success ? 'success' : 'error'}`}
                >
                  <div className="result-icon">
                    {result.success ? '✅' : '❌'}
                  </div>
                  <div className="result-details">
                    <div className="file-name">{result.file}</div>
                    {result.error && (
                      <div className="error-message">{result.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="results-actions">
            <button 
              className="btn-secondary"
              onClick={resetUpload}
            >
              Upload More Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;