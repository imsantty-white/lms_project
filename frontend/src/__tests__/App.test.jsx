import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router, MemoryRouter } from 'react-router-dom';
import App from '../App'; // Adjust path to your App.jsx
import { AuthContext, axiosInstance } from '../contexts/AuthContext'; // Adjust path
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ProfileCompletionBanner to simplify App.test.jsx
vi.mock('../components/ProfileCompletionBanner', () => ({
  __esModule: true,
  default: vi.fn(({ onDismiss }) => (
    <div data-testid="profile-completion-banner">
      <span>Mock Profile Banner</span>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )),
}));

// Mock parts of AuthContext and axiosInstance
vi.mock('../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../contexts/AuthContext');
  return {
    ...actual,
    axiosInstance: {
      get: vi.fn(),
      post: vi.fn(), // Add other methods if App.jsx uses them directly
    },
    useAuth: vi.fn(), // We will provide specific implementations in tests
  };
});


describe('App.jsx ProfileCompletionBanner Logic', () => {
  
  beforeEach(() => {
    axiosInstance.get.mockReset();
    // Reset useAuth mock for each test
    vi.resetAllMocks(); // Clears all mocks including ProfileCompletionBanner mock counts
    
    // Default mock for useAuth, can be overridden in specific tests
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      isAuthInitialized: true, // Assume auth is initialized
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    });
    sessionStorage.clear(); // Clear session storage before each test
  });

  test('shows ProfileCompletionBanner for authenticated user with incomplete profile', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user123', nombre: 'Test', apellidos: 'User' /* biografia is missing */ },
      isAuthInitialized: true,
    });

    axiosInstance.get.mockResolvedValueOnce({ 
      data: { 
        user: { nombre: 'Test', apellidos: 'User' /* biografia still missing */ } 
      } 
    });
    
    render(
        <Router>
          <App />
        </Router>
    );

    await waitFor(() => {
      expect(screen.getByTestId('profile-completion-banner')).toBeInTheDocument();
      expect(screen.getByText('Mock Profile Banner')).toBeInTheDocument();
    });
    expect(axiosInstance.get).toHaveBeenCalledWith('/api/profile/my-profile');
  });

  test('does not show ProfileCompletionBanner for authenticated user with complete profile', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user123', nombre: 'Test', apellidos: 'User', biografia: 'I am a user.' },
      isAuthInitialized: true,
    });

    axiosInstance.get.mockResolvedValueOnce({ 
      data: { 
        user: { nombre: 'Test', apellidos: 'User', biografia: 'I am a user.' } 
      } 
    });

    render(
        <Router>
          <App />
        </Router>
    );

    await waitFor(() => {
      // Check that API was called
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/profile/my-profile');
    });
    // Banner should not be in the document
    expect(screen.queryByTestId('profile-completion-banner')).not.toBeInTheDocument();
  });

  test('does not show ProfileCompletionBanner if user is not authenticated', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      isAuthInitialized: true,
    });

    render(
        <Router>
          <App />
        </Router>
    );
    
    // Wait for a moment to ensure no async operations try to show the banner
    await new Promise(resolve => setTimeout(resolve, 50));


    expect(screen.queryByTestId('profile-completion-banner')).not.toBeInTheDocument();
    expect(axiosInstance.get).not.toHaveBeenCalledWith('/api/profile/my-profile');
  });

  test('does not show ProfileCompletionBanner if banner has been dismissed in session', async () => {
    sessionStorage.setItem('profileBannerDismissed', 'true');
    
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user123', nombre: 'Test', apellidos: 'User' /* biografia missing */ },
      isAuthInitialized: true,
    });
    
    // API would normally be called if not for dismissal, but App.jsx checks sessionStorage first
    // So, we don't expect axiosInstance.get to be called for profile check in this specific case.

    render(
        <Router>
          <App />
        </Router>
    );

    await new Promise(resolve => setTimeout(resolve, 50)); // ensure useEffects run

    expect(screen.queryByTestId('profile-completion-banner')).not.toBeInTheDocument();
    expect(axiosInstance.get).not.toHaveBeenCalledWith('/api/profile/my-profile');
  });

  test('does not show ProfileCompletionBanner on /profile page even if profile is incomplete', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user123', nombre: 'Test', apellidos: 'User' /* biografia missing */ },
      isAuthInitialized: true,
    });

    axiosInstance.get.mockResolvedValueOnce({ 
      data: { 
        user: { nombre: 'Test', apellidos: 'User' /* biografia missing */ } 
      } 
    });
    
    render(
      <MemoryRouter initialEntries={['/profile']}>
        <AuthContext.Provider value={useAuth()}> {/* Provide context directly for MemoryRouter setup */}
          <App />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    // API call for profile check should still happen if not dismissed
    await waitFor(() => {
       expect(axiosInstance.get).toHaveBeenCalledWith('/api/profile/my-profile');
    });
    
    // But the banner should not render because we are on /profile
    expect(screen.queryByTestId('profile-completion-banner')).not.toBeInTheDocument();
  });

   test('handles API error gracefully when checking profile completion', async () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user123', nombre: 'Test', apellidos: 'User' },
      isAuthInitialized: true,
    });

    axiosInstance.get.mockRejectedValueOnce(new Error('API error fetching profile'));

    render(
        <Router>
          <App />
        </Router>
    );

    await waitFor(() => {
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/profile/my-profile');
    });
    // Banner should not be shown if there was an error fetching profile
    expect(screen.queryByTestId('profile-completion-banner')).not.toBeInTheDocument();
  });

});
