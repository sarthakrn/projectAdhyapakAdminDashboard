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
  const [sessionExpired, setSessionExpired] = useState(false);
  const auth = useAuth();
  


  // Update authentication state based on OIDC auth state
  useEffect(() => {
    if (authIsAuthenticated && authUser) {
      setIsAuthenticated(true);
      setUser(authUser);
      setSessionExpired(false);
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setSelectedClass(null);
      setBreadcrumbs([]);
    }
  }, [authUser, authIsAuthenticated]);

  const handleSessionExpiry = useCallback(async () => {
    setSessionExpired(true);
    setIsAuthenticated(false);
    setUser(null);
    setSelectedClass(null);
    setBreadcrumbs([]);
    
    try {
      await auth.removeUser();
    } catch (error) {
      console.error('Error removing user session:', error);
    }
    
    // Force redirect to login after a brief delay to show the expiry message
    setTimeout(() => {
      window.location.href = '/login';
    }, 3000);
  }, [auth]);

  // Check token expiry periodically
  useEffect(() => {
    if (!isAuthenticated || !user?.id_token) return;

    const checkTokenExpiry = () => {
      try {
        const token = user.id_token;
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Check if token expires in the next 5 minutes
        if (payload.exp && payload.exp - currentTime < 300) {
          console.warn('Token expiring soon');
          handleSessionExpiry();
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
        handleSessionExpiry();
      }
    };

    // Check immediately and then every 5 minutes
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user, handleSessionExpiry]);

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
      setSessionExpired(false);
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
    sessionExpired,
    login,
    logout,
    handleSessionExpiry,
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