import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService'; // Import authService

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [loading, setLoading] = useState(false); // For loading states
  const [error, setError] = useState(null); // For error handling

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.loginUser(credentials);
      if (data && data.token && data.user) {
        setUser(data.user);
        setToken(data.token);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.token);
      } else {
        // Handle cases where backend response might not be as expected
        throw new Error(data.message || 'Login failed: Invalid response from server');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
      setIsAuthenticated(false); // Ensure state is cleared on error
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      throw err; // Re-throw to be caught by the component
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      // Assuming registration also logs the user in or returns user/token
      const data = await authService.registerUser(userData);
       if (data && data.token && data.user) { // Adjust based on actual backend response
        setUser(data.user);
        setToken(data.token);
        setIsAuthenticated(true);
        localStorage.setItem('token', data.token);
      } else if (data && data.message && !data.token) { // e.g. registration successful, please login
        // Handle cases where registration is successful but doesn't auto-login
        console.log(data.message); // Or set a specific state to inform the user
        setIsAuthenticated(false);
      }
      else {
        throw new Error(data.message || 'Registration failed: Invalid response from server');
      }
    } catch (err) {
      setError(err.message || 'Registration failed');
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      throw err; // Re-throw
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    // Optionally, redirect to login page or home page
    // window.location.href = '/login';
  };

  useEffect(() => {
    const loadUser = async () => {
      const currentToken = localStorage.getItem('token');
      if (currentToken && !user) { // Only load if token exists and user is not already set
        setLoading(true);
        try {
          const currentUser = await authService.getMe(currentToken);
          setUser(currentUser);
          setToken(currentToken); // Ensure token state is also up-to-date
          setIsAuthenticated(true);
        } catch (err) {
          console.error('Failed to load user with token:', err);
          // Token might be invalid, so clear it
          logout(); // This will clear localStorage and state
        } finally {
          setLoading(false);
        }
      }
    };
    loadUser();
  }, []); // Run once on mount, or when token changes if you prefer

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
