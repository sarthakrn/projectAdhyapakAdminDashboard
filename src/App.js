import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/common/Layout';
import Login from './components/auth/Login';
import ClassSelection from './components/dashboard/ClassSelection';
import ClassDashboard from './components/dashboard/ClassDashboard';
import StudentForm from './components/modules/StudentForm';
import Academics from './components/academics/Academics';
import Subject from './components/academics/Subject';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useApp();
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};



// Module Components (placeholders)
const Notifications = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    if (classNumber) {
      updateBreadcrumbs([`Class ${classNumber}`, 'Notification']);
    }
  }, [classNumber, updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>Class {classNumber} - Notifications</h2>
      <p>Notification content will be implemented here.</p>
    </div>
  );
};

const HolidayCalendar = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    if (classNumber) {
      updateBreadcrumbs([`Class ${classNumber}`, 'Holiday Calendar']);
    }
  }, [classNumber, updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>Class {classNumber} - Holiday Calendar</h2>
      <p>Holiday calendar content will be implemented here.</p>
    </div>
  );
};

const CompetencyModel = () => {
  const { classNumber } = useParams();
  const { updateBreadcrumbs } = useApp();

  useEffect(() => {
    if (classNumber) {
      updateBreadcrumbs([`Class ${classNumber}`, "School's Competency Model"]);
    }
  }, [classNumber, updateBreadcrumbs]);

  return (
    <div className="placeholder-container">
      <h2>Class {classNumber} - School's Competency Model</h2>
      <p>Details and functionality for the School's Competency Model will be implemented here in a future update.</p>
    </div>
  );
};

const AppContent = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Protected Routes */}
        <Route path="/class-selection" element={
          <ProtectedRoute>
            <ClassSelection />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/:classNumber" element={
          <ProtectedRoute>
            <ClassDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/:classNumber/student-registration" element={
          <ProtectedRoute>
            <StudentForm />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/:classNumber/academics" element={
          <ProtectedRoute>
            <Academics />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/:classNumber/academics/:subject" element={
          <ProtectedRoute>
            <Subject />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/:classNumber/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/:classNumber/holiday-calendar" element={
          <ProtectedRoute>
            <HolidayCalendar />
          </ProtectedRoute>
        } />
        
        <Route path="/dashboard/:classNumber/competency-model" element={
          <ProtectedRoute>
            <CompetencyModel />
          </ProtectedRoute>
        } />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/login" />} />
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
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: '20px' }}>Loading...</div>
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
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: '20px', color: 'red' }}>Authentication Error</div>
          <div>{auth.error.message}</div>
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