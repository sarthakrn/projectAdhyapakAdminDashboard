import React, { Suspense, lazy } from 'react';

// Lazy load the FileUpload component to avoid AWS SDK chunk loading issues
const FileUpload = lazy(() => import('./FileUpload'));

const LazyS3FileUpload = (props) => {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        flexDirection: 'column',
        gap: '10px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading file upload...</p>
      </div>
    }>
      <FileUpload {...props} />
    </Suspense>
  );
};

export default LazyS3FileUpload;