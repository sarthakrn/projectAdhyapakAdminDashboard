import React, { useState } from 'react';
import FileUpload from './FileUpload';
import FileList from './FileList';
import './FileManager.css';

const FileManager = ({ 
  classNumber, 
  module, 
  subject = null, 
  subSection = null,
  title = "File Manager"
}) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUploader, setShowUploader] = useState(false);

  const handleUploadComplete = (results) => {
    // Refresh the file list after upload
    setRefreshTrigger(prev => prev + 1);
    
    // Hide uploader if all uploads were successful
    if (results.summary.errors === 0) {
      setShowUploader(false);
    }
  };

  const handleUploadStart = () => {
    // Keep uploader visible during upload
  };

  const toggleUploader = () => {
    setShowUploader(prev => !prev);
  };

  return (
    <div className="file-manager-container">
      <div className="file-manager-header">
        <h2 className="file-manager-title">{title}</h2>
        
        <button 
          onClick={toggleUploader}
          className={`btn-toggle-upload ${showUploader ? 'active' : ''}`}
        >
          {showUploader ? '📁 Hide Upload' : '📤 Upload Files'}
        </button>
      </div>

      {showUploader && (
        <div className="upload-section">
          <FileUpload
            classNumber={classNumber}
            module={module}
            subject={subject}
            subSection={subSection}
            onUploadComplete={handleUploadComplete}
            onUploadStart={handleUploadStart}
          />
        </div>
      )}

      <div className="file-list-section">
        <FileList
          classNumber={classNumber}
          module={module}
          subject={subject}
          subSection={subSection}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
};

export default FileManager;