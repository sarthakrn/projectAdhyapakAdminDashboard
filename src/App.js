import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';
import SessionExpiredModal from './components/common/SessionExpiredModal';
import studentApiService from './services/studentApiService';
import s3Service from './services/s3Service';
import dynamoDbService from './services/dynamoDbService';
import pdfGradingApiService from './services/pdfGradingApiService';

import LandingPage from './components/dashboard/LandingPage';
import ClassSelector from './components/dashboard/ClassSelector';
import AIManagementSystem from './components/dashboard/AIManagementSystem';
import ClassDashboard from './components/dashboard/ClassDashboard';
import StudentManagement from './components/modules/StudentManagement';
import Academics from './components/academics/Academics';
import Subject from './components/academics/Subject';
import SubModule from './components/academics/SubModule';
import TermSelection from './components/evaluation/pages/TermSelection';
import EvaluationLanding from './components/evaluation/pages/EvaluationLanding';
import EvaluationTermSelection from './components/evaluation/pages/EvaluationTermSelection';
import EvaluationDashboard from './components/evaluation/pages/EvaluationDashboard';
import GradingResults from './components/evaluation/pages/GradingResults';
import AnswerSheetSubmission from './components/evaluation/pages/AnswerSheetSubmission';
import TeacherSetup from './components/evaluation/pages/TeacherSetup';
import StudentList from './components/evaluation/pages/StudentList';
import ProcessStudentAnswers from './components/evaluation/pages/ProcessStudentAnswers';
import CameraCapture from './components/evaluation/pages/CameraCapture';
import TimetableManagement from './components/timetable/TimetableManagement';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent going back to login when authenticated
    if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/')) {
      navigate('/dashboard', { replace: true });
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
      navigate('/dashboard', { replace: true });
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
        // If trying to go back to login or root, redirect to dashboard
        if (window.location.pathname === '/login' || window.location.pathname === '/') {
          event.preventDefault();
          navigate('/dashboard', { replace: true });
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
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    updateBreadcrumbs(['Dashboard', "School's AI Management System", 'Notifications']);
  }, [updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>School Notifications</h2>
      <p>School-wide notification content will be implemented here.</p>
    </div>
  );
};

const HolidayCalendar = () => {
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    updateBreadcrumbs(['Dashboard', "School's AI Management System", 'Holiday Calendar']);
  }, [updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>School Holiday Calendar</h2>
      <p>School-wide holiday calendar content will be implemented here.</p>
    </div>
  );
};

const CompetencyModel = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    if (classNumber) {
      const cleanClassNumber = classNumber.replace('class-', '');
      updateBreadcrumbs(['Dashboard', "School's AI Management System", `Class ${cleanClassNumber}`, "School's Competency Model"]);
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
  const { sessionExpired, handleSessionExpiry } = useApp();

  // Set up the session expiry callback for API services
  useEffect(() => {
    studentApiService.setSessionExpiredCallback(handleSessionExpiry);
    s3Service.setSessionExpiredCallback(handleSessionExpiry);
    dynamoDbService.setSessionExpiredCallback(handleSessionExpiry);
    pdfGradingApiService.setSessionExpiredCallback(handleSessionExpiry);
  }, [handleSessionExpiry]);

  return (
    <Router>
      <NavigationGuard />
      <SessionExpiredModal isVisible={sessionExpired} />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <LandingPage />
          </ProtectedRoute>
        } />
        
        <Route path="/ai-management" element={
          <ProtectedRoute>
            <AIManagementSystem />
          </ProtectedRoute>
        } />
        
        <Route path="/evaluation" element={
          <ProtectedRoute>
            <EvaluationLanding />
          </ProtectedRoute>
        } />
        
        <Route path="/evaluation/:classNumber" element={
          <ProtectedRoute>
            <EvaluationTermSelection />
          </ProtectedRoute>
        } />
        
        <Route path="/evaluation/:classNumber/:termId" element={
          <ProtectedRoute>
            <EvaluationDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/evaluation/:classNumber/:termId/student/:studentId/subject/:subjectId/grading-results" element={
          <ProtectedRoute>
            <GradingResults />
          </ProtectedRoute>
        } />
        
        <Route path="/evaluation/:classNumber/:termId/student/:studentId/subject/:subjectId/submit" element={
          <ProtectedRoute>
            <AnswerSheetSubmission />
          </ProtectedRoute>
        } />
        
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
        
        <Route path="/class-selector/:classNumber/student-management" element={
          <ProtectedRoute>
            <StudentManagement />
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
        
        <Route path="/class-selector/:classNumber/academics/:subject/evaluation" element={
          <ProtectedRoute>
            <TermSelection />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/academics/:subject/evaluation/:termId" element={
          <ProtectedRoute>
            <TeacherSetup />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/academics/:subject/evaluation/:termId/students" element={
          <ProtectedRoute>
            <StudentList />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/academics/:subject/evaluation/:termId/students/:studentId/process" element={
          <ProtectedRoute>
            <ProcessStudentAnswers />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/academics/:subject/evaluation/:termId/students/:studentId/capture" element={
          <ProtectedRoute>
            <CameraCapture />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/timetable" element={
          <ProtectedRoute>
            <TimetableManagement />
          </ProtectedRoute>
        } />
        
        <Route path="/class-selector/:classNumber/competency-model" element={
          <ProtectedRoute>
            <CompetencyModel />
          </ProtectedRoute>
        } />
        
        {/* School-wide routes */}
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        
        <Route path="/holiday-calendar" element={
          <ProtectedRoute>
            <HolidayCalendar />
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