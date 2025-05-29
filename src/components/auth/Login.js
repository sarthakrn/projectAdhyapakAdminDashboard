import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import './Login.css';

const Login = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();

  // Redirect to class selection if already authenticated
  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/class-selection');
    }
  }, [auth.isAuthenticated, navigate]);

  const handleLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      await auth.signinRedirect();
      // The OIDC provider will handle the redirect to Cognito Hosted UI
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to initiate login. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <h1 className="login-title">School Management System</h1>
            <p className="login-subtitle">Welcome back! Please sign in to continue.</p>
          </div>
          
          <div className="login-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
            
            <div className="login-description">
              <p>Click the button below to sign in securely through Amazon Cognito.</p>
            </div>

            <button 
              onClick={handleLogin}
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  Redirecting to login...
                </>
              ) : (
                'Login with Amazon Cognito'
              )}
            </button>
          </div>

          <div className="login-footer">
            <p className="login-info">
              <strong>Secure Authentication:</strong><br />
              Powered by Amazon Cognito
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;