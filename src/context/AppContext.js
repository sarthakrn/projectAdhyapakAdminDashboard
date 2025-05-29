import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children, authUser, isAuthenticated: authIsAuthenticated }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const auth = useAuth();

  // Update authentication state based on OIDC auth state
  useEffect(() => {
    if (authIsAuthenticated && authUser) {
      setIsAuthenticated(true);
      setUser(authUser);
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setSelectedClass(null);
      setBreadcrumbs([]);
    }
  }, [authUser, authIsAuthenticated]);

  const login = useCallback(async () => {
    try {
      // Redirect to Cognito Hosted UI using OIDC
      await auth.signinRedirect();
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  }, [auth]);

  const logout = useCallback(async () => {
    try {
      // Custom logout redirect to Cognito logout endpoint
      const clientId = "4qbops1fksbib8lr03qs926t7s";
      const logoutUri = "http://localhost:3000";
      const cognitoDomain = "https://ap-south-1xp11tf9vc.auth.ap-south-1.amazoncognito.com";
      
      // Clear local OIDC user first
      await auth.removeUser();
      
      // Redirect to Cognito logout
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
      
      setIsAuthenticated(false);
      setUser(null);
      setSelectedClass(null);
      setBreadcrumbs([]);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [auth]);

  const selectClass = useCallback((classNumber) => {
    setSelectedClass(classNumber);
    setBreadcrumbs([`Class ${classNumber}`]);
  }, []);

  const updateBreadcrumbs = useCallback((newBreadcrumbs) => {
    setBreadcrumbs(newBreadcrumbs);
  }, []);

  const addBreadcrumb = useCallback((crumb) => {
    setBreadcrumbs(prev => [...prev, crumb]);
  }, []);

  const navigateToBreadcrumb = useCallback((index) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  }, []);

  const value = {
    isAuthenticated,
    user,
    selectedClass,
    breadcrumbs,
    login,
    logout,
    selectClass,
    updateBreadcrumbs,
    addBreadcrumb,
    navigateToBreadcrumb
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};