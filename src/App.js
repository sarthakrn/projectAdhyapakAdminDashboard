import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';

import ClassSelector from './components/dashboard/ClassSelector';
import ClassDashboard from './components/dashboard/ClassDashboard';
import StudentForm from './components/modules/StudentForm';
import Academics from './components/academics/Academics';
import Subject from './components/academics/Subject';
import SubModule from './components/academics/SubModule';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent going back to login when authenticated
    if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/')) {
      navigate('/class-selector', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

// Navigation Guard Component
const NavigationGuard = () => {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent authenticated users from accessing login page
    if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/')) {
      navigate('/class-selector', { replace: true });
    }
    
    // Prevent unauthenticated users from accessing protected routes
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/') {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    // Handle browser back/forward button for authenticated users
    if (isAuthenticated) {
      const handlePopState = (event) => {
        // If trying to go back to login or root, redirect to class selector
        if (window.location.pathname === '/login' || window.location.pathname === '/') {
          event.preventDefault();
          navigate('/class-selector', { replace: true });
        }
      };

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isAuthenticated, navigate]);

  return null;
};

// Module Components (placeholders)
const Notifications = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    if (classNumber) {
      const cleanClassNumber = classNumber.replace('class-', '');
      updateBreadcrumbs(['Class Selector', `Class${cleanClassNumber}`, 'Notification']);
    }
  }, [classNumber, updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>Class{classNumber.replace('class-', '')} - Notifications</h2>
      <p>Notification content will be implemented here.</p>
    </div>
  );
};

const HolidayCalendar = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    if (classNumber) {
      const cleanClassNumber = classNumber.replace('class-', '');
      updateBreadcrumbs(['Class Selector', `Class${cleanClassNumber}`, 'Holiday Calendar']);
    }
  }, [classNumber, updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>Class{classNumber.replace('class-', '')} - Holiday Calendar</h2>
      <p>Holiday calendar content will be implemented here.</p>
    </div>
  );
};

const CompetencyModel = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    if (classNumber) {
      const cleanClassNumber = classNumber.replace('class-', '');
      updateBreadcrumbs(['Class Selector', `Class${cleanClassNumber}`, "School's Competency Model"]);
    }
  }, [classNumber, updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>Class{classNumber.replace('class-', '')} - School's Competency Model</h2>
      <p>Details and functionality for the School's Competency Model will be implemented here in a future update.</p>
    </div>
  );
};

const AppContent = () => {
  return (
    <Router>
      <NavigationGuard />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Protected Routes */}
        <Route path="/class-selection" element={
          <ProtectedRoute>
            <ClassSelector />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector" element={
          <ProtectedRoute>
            <ClassSelector />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber" element={
          <ProtectedRoute>
            <ClassDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/student-registration" element={
          <ProtectedRoute>
            <StudentForm />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/academics" element={
          <ProtectedRoute>
            <Academics />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/academics/:subject" element={
          <ProtectedRoute>
            <Subject />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/academics/:subject/:subModule" element={
          <ProtectedRoute>
            <SubModule />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/holiday-calendar" element={
          <ProtectedRoute>
            <HolidayCalendar />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/competency-model" element={
          <ProtectedRoute>
            <CompetencyModel />
          </ProtectedRoute>
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

function App() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          backgroundColor: '#f5f7fa'
        }}>
          <div style={{ marginBottom: '20px', fontSize: '18px', color: '#333' }}>Loading Authentication...</div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
        </div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="App">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          backgroundColor: '#f5f7fa'
        }}>
          <div style={{ marginBottom: '20px', color: 'red', fontSize: '18px' }}>Authentication Error</div>
          <div style={{ marginBottom: '20px', color: '#333' }}>{auth.error.message}</div>
          <button 
            onClick={() => window.location.reload()} 
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppProvider authUser={auth.user} isAuthenticated={auth.isAuthenticated}>
      <div className="App">
        <AppContent />
      </div>
    </AppProvider>
  );
}

export default App;