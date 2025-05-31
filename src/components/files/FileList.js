import React, { useState, useEffect, useCallback } from 'react';
import s3Service from '../../services/s3Service';
import { useApp } from '../../context/AppContext';
import './FileList.css';

const FileList = ({ 
  classNumber, 
  module, 
  subject = null, 
  subSection = null,
  refreshTrigger = 0 
}) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({});
  const { user } = useApp();

  const loadFiles = useCallback(async () => {
    // Debug: Log user object structure
    console.log('FileList - Full user object:', user);
    console.log('FileList - User profile:', user?.profile);
    console.log('FileList - Available user properties:', Object.keys(user || {}));
    
    // Extract username from user object - try multiple possible locations
    const username = user?.profile?.preferred_username || 
                    user?.profile?.username || 
                    user?.profile?.['cognito:username'] ||
                    user?.preferred_username ||
                    user?.username ||
                    user?.sub;

    console.log('FileList - Using username:', username);

    if (!user) {
      console.error('FileList - No user object found');
      return;
    }

    if (!username) {
      console.error('FileList - Could not extract username from user object. Available properties:', Object.keys(user?.profile || user || {}));
      setError('Unable to determine user identity. Please try logging out and back in.');
      return;
    }

    console.log('FileList - ✅ Successfully extracted username:', username);

    setLoading(true);
    setError(null);

    try {
      await s3Service.initializeS3Client(user.id_token);
      
      const s3Prefix = s3Service.getS3Prefix(
        username,
        classNumber,
        module,
        subject,
        subSection
      );

      const result = await s3Service.listFiles(s3Prefix);
      
      if (result.success) {
        setFiles(result.files);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load files');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  }, [user, classNumber, module, subject, subSection]);

  useEffect(() => {
    loadFiles();
  }, [classNumber, module, subject, subSection, refreshTrigger, loadFiles]);

  const handleFileSelect = (fileKey, isSelected) => {
    const newSelection = new Set(selectedFiles);
    if (isSelected) {
      newSelection.add(fileKey);
    } else {
      newSelection.delete(fileKey);
    }
    setSelectedFiles(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(file => file.key)));
    }
  };

  const handleViewFile = async (file) => {
    try {
      const result = await s3Service.getFileViewUrl(file.key);
      if (result.success) {
        // Open file in new browser tab instead of in-app viewer
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Failed to open file: ' + result.error);
      }
    } catch (error) {
      alert('Failed to open file');
      console.error('Error viewing file:', error);
    }
  };

  const handleDeleteFile = async (fileKey) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      const result = await s3Service.deleteFile(fileKey);
      if (result.success) {
        setFiles(prev => prev.filter(file => file.key !== fileKey));
        setSelectedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileKey);
          return newSet;
        });
      } else {
        alert('Failed to delete file: ' + result.error);
      }
    } catch (error) {
      alert('Failed to delete file');
      console.error('Error deleting file:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedFiles.size} selected file(s)?`)) return;

    setIsDeleting(true);

    try {
      const result = await s3Service.deleteMultipleFiles(
        Array.from(selectedFiles),
        (progress) => {
          setDeleteProgress(progress);
        }
      );

      // Remove deleted files from the list
      const deletedKeys = result.results
        .filter(r => r.success)
        .map(r => r.key);
      
      setFiles(prev => prev.filter(file => !deletedKeys.includes(file.key)));
      setSelectedFiles(new Set());

      if (result.summary.errors > 0) {
        alert(`${result.summary.success} files deleted successfully, ${result.summary.errors} failed.`);
      }
    } catch (error) {
      alert('Failed to delete files');
      console.error('Error bulk deleting files:', error);
    } finally {
      setIsDeleting(false);
      setDeleteProgress({});
    }
  };

  const formatFileIcon = (fileType) => {
    if (fileType.includes('PDF')) return '📄';
    if (fileType.includes('Image')) return '🖼️';
    return '📁';
  };

  if (loading) {
    return (
      <div className="file-list-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-list-container">
        <div className="error-state">
          <div className="error-icon">❌</div>
          <h3>Error Loading Files</h3>
          <p>{error}</p>
          <button onClick={loadFiles} className="btn-retry">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      {files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No Files Yet</h3>
          <p>Upload some files to get started</p>
        </div>
      ) : (
        <>
          <div className="file-list-header">
            <div className="file-count">
              {files.length} file{files.length !== 1 ? 's' : ''}
              {selectedFiles.size > 0 && (
                <span className="selection-count">
                  ({selectedFiles.size} selected)
                </span>
              )}
            </div>
            
            <div className="file-actions">
              {files.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="btn-select-all"
                >
                  {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
              
              {selectedFiles.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="btn-delete-selected"
                >
                  {isDeleting ? 'Deleting...' : `Delete Selected (${selectedFiles.size})`}
                </button>
              )}
            </div>
          </div>

          {isDeleting && (
            <div className="delete-progress">
              <div className="progress-text">
                Deleting {deleteProgress.current || 0} of {deleteProgress.total || 0} files...
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${((deleteProgress.current || 0) / (deleteProgress.total || 1)) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          )}

          <div className="file-list">
            {files.map((file) => (
              <div key={file.key} className="file-item">
                <div className="file-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.key)}
                    onChange={(e) => handleFileSelect(file.key, e.target.checked)}
                  />
                </div>
                
                <div className="file-icon">
                  {formatFileIcon(file.fileType)}
                </div>
                
                <div className="file-details">
                  <div className="file-name" title={file.name}>
                    {file.name}
                  </div>
                  <div className="file-meta">
                    <span className="file-size">{file.formattedSize}</span>
                    <span className="file-date">{file.formattedDate}</span>
                    <span className="file-type">{file.fileType}</span>
                  </div>
                </div>
                
                <div className="file-actions">
                  <button
                    onClick={() => handleViewFile(file)}
                    className="btn-view"
                    title="View file"
                  >
                    👁️ View
                  </button>
                  
                  <button
                    onClick={() => handleDeleteFile(file.key)}
                    className="btn-delete"
                    title="Delete file"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FileList;