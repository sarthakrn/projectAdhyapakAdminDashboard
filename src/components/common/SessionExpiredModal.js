import React, { useState, useEffect } from 'react';
import './SessionExpiredModal.css';

const SessionExpiredModal = ({ isVisible, onClose }) => {
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isVisible) {
      setCountdown(3);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          window.location.href = '/login';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="session-expired-overlay">
      <div className="session-expired-modal">
        <div className="session-expired-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="session-expired-title">Session Expired</h2>
        <p className="session-expired-message">
          Your login session has expired for security reasons. You will be redirected to the login page to sign in again.
        </p>
        <div className="session-expired-countdown">
          <p>Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
          <div className="countdown-progress">
            <div 
              className="countdown-bar" 
              style={{ 
                width: `${(countdown / 3) * 100}%`,
                transition: 'width 1s linear'
              }}
            ></div>
          </div>
        </div>
        <button 
          className="session-expired-button"
          onClick={() => window.location.href = '/login'}
        >
          Sign In Now
        </button>
      </div>
    </div>
  );
};

export default SessionExpiredModal;