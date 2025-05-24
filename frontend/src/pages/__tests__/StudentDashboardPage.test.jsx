import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router, MemoryRouter } from 'react-router-dom'; // MemoryRouter for specific pathId tests
import { AuthContext, axiosInstance } from '../../contexts/AuthContext';
import StudentDashboardPage from '../StudentDashboardPage';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Recharts components (if any were to be added to StudentDashboardPage later)
// For now, StudentDashboardPage mainly uses LinearProgress, not complex charts.
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    // Add mocks for other Recharts components if they get used in StudentDashboardPage
  };
});

const mockUser = { _id: 'student1', userType: 'Estudiante', nombre: 'Test', apellidos: 'Student' };

const mockLearningPathsData = [
  { _id: 'lp1', nombre: 'Path Alpha', descripcion: 'First path' },
  { _id: 'lp2', nombre: 'Path Beta', descripcion: 'Second path' },
  { _id: 'lp3', nombre: 'Path Gamma', descripcion: 'Third path' },
  { _id: 'lp4', nombre: 'Path Delta', descripcion: 'Fourth path, should trigger "View All"' },
];

const mockProgressDataLp1 = {
  progress: { completed_themes: [{_id: 't1'}, {_id: 't2'}], total_themes: 4, path_status: "En progreso" } // 50%
};
const mockProgressDataLp2 = {
  progress: { completed_themes: [{_id: 'tA'}], total_themes: 1, path_status: "Completado" } // 100%
};
const mockProgressDataLp3 = {
  progress: { completed_themes: [], total_themes: 5, path_status: "No iniciado" } // 0%
};
const mockProgressDataLp4 = { // For the 4th path if it were shown
  progress: { completed_themes: [{_id: 'td1'}], total_themes: 2, path_status: "En progreso" } // 50%
};


vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    axiosInstance: {
      get: vi.fn(),
    },
    useAuth: vi.fn(), // Will be mocked in tests
  };
});

const renderWithAuth = (ui, { providerProps, route = '/', ...renderOptions } = {}) => {
  useAuth.mockReturnValue(providerProps); // Mock useAuth before each render
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={providerProps}>{ui}</AuthContext.Provider>
    </MemoryRouter>,
    renderOptions
  );
};

describe('StudentDashboardPage', () => {
  let providerProps;

  beforeEach(() => {
    axiosInstance.get.mockReset();
    providerProps = {
      user: mockUser,
      isAuthenticated: true,
      isAuthInitialized: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    };
  });

  test('renders main title and welcome/guidance sections', () => {
    axiosInstance.get.mockResolvedValue({ data: { data: [] } }); // Mock empty paths for this test
    renderWithAuth(<StudentDashboardPage />, { providerProps });

    expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to Your Dashboard!/i)).toBeInTheDocument();
    expect(screen.getByText(`Hello ${mockUser.nombre}!`)).toBeInTheDocument();
    expect(screen.getByText(/Tutorials & Help/i)).toBeInTheDocument();
    expect(screen.getByText(/How to navigate your dashboard \(Coming Soon\)/i)).toBeInTheDocument();
  });

  describe('"My Learning Paths" Card', () => {
    test('shows loading state while fetching learning paths', () => {
      axiosInstance.get.mockImplementation((url) => {
        if (url === '/api/learning-paths/my-assigned') {
          return new Promise(() => {}); // Keep paths loading pending
        }
        return Promise.resolve({ data: { progress: {} } }); // Progress can resolve
      });
      renderWithAuth(<StudentDashboardPage />, { providerProps });
      expect(screen.getByText('My Learning Paths')).toBeInTheDocument();
      // Check for the main CircularProgress inside the "My Learning Paths" card
      const myLearningPathsCard = screen.getByText('My Learning Paths').closest('.MuiPaper-root');
      expect(myLearningPathsCard.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    });
    
    test('shows loading state for individual path progress', async () => {
      axiosInstance.get.mockImplementation((url) => {
        if (url === '/api/learning-paths/my-assigned') {
          return Promise.resolve({ data: { data: [mockLearningPathsData[0]] } });
        }
        if (url.startsWith('/api/progress/my/')) {
          return new Promise(() => {}); // Keep progress loading pending
        }
        return Promise.reject(new Error("Unhandled API call"));
      });

      renderWithAuth(<StudentDashboardPage />, { providerProps });

      await waitFor(() => {
        expect(screen.getByText(mockLearningPathsData[0].nombre)).toBeInTheDocument();
      });
      // Check for the mini-loader for progress
      expect(screen.getByText('Loading progress...')).toBeInTheDocument();
    });


    test('shows error message if fetching learning paths fails', async () => {
      axiosInstance.get.mockRejectedValue({ response: { data: { message: 'Failed to load paths' } } });
      renderWithAuth(<StudentDashboardPage />, { providerProps });
      await waitFor(() => {
        expect(screen.getByText('My Learning Paths')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load paths/i)).toBeInTheDocument();
      });
    });
    
    test('handles error for one path progress gracefully, others load', async () => {
      axiosInstance.get.mockImplementation((url) => {
        if (url === '/api/learning-paths/my-assigned') {
          return Promise.resolve({ data: { data: [mockLearningPathsData[0], mockLearningPathsData[1]] } });
        }
        if (url === `/api/progress/my/${mockLearningPathsData[0]._id}`) {
          return Promise.reject(new Error('Failed to load progress for lp1')); // Error for first path
        }
        if (url === `/api/progress/my/${mockLearningPathsData[1]._id}`) {
          return Promise.resolve({ data: mockProgressDataLp2 }); // Success for second
        }
        return Promise.reject(new Error("Unhandled API call"));
      });

      renderWithAuth(<StudentDashboardPage />, { providerProps });

      await waitFor(() => {
        expect(screen.getByText(mockLearningPathsData[0].nombre)).toBeInTheDocument();
        expect(screen.getByText(mockLearningPathsData[1].nombre)).toBeInTheDocument();
      });
      
      // lp1 progress should not show a percentage, might show 0% or just no bar if handled by returning null progress
      // lp2 progress should show 100%
      const path1Progress = screen.getByText(mockLearningPathsData[0].nombre).closest('div').querySelector('.MuiLinearProgress-bar');
      const path2Progress = screen.getByText(mockLearningPathsData[1].nombre).closest('div').querySelector('.MuiLinearProgress-bar');
      
      // Depending on how null progress is handled, path1Progress might be null or have value "0"
      // For this test, we'll assume it defaults to 0 if progress is null.
      expect(path1Progress).toHaveAttribute('style', expect.stringContaining('transform: translateX(-100%)')); // 0%
      expect(path2Progress).toHaveAttribute('style', expect.stringContaining('transform: translateX(0%)')); // 100%
    });


    test('shows empty state message if no learning paths are assigned', async () => {
      axiosInstance.get.mockResolvedValue({ data: { data: [] } });
      renderWithAuth(<StudentDashboardPage />, { providerProps });
      await waitFor(() => {
        expect(screen.getByText('My Learning Paths')).toBeInTheDocument();
        expect(screen.getByText(/No learning paths assigned yet/i)).toBeInTheDocument();
      });
    });

    test('displays up to 3 learning paths with names, progress, and links', async () => {
      axiosInstance.get.mockImplementation((url) => {
        if (url === '/api/learning-paths/my-assigned') {
          return Promise.resolve({ data: { data: mockLearningPathsData.slice(0, 3) } });
        }
        if (url === `/api/progress/my/${mockLearningPathsData[0]._id}`) return Promise.resolve({ data: mockProgressDataLp1 });
        if (url === `/api/progress/my/${mockLearningPathsData[1]._id}`) return Promise.resolve({ data: mockProgressDataLp2 });
        if (url === `/api/progress/my/${mockLearningPathsData[2]._id}`) return Promise.resolve({ data: mockProgressDataLp3 });
        return Promise.reject(new Error("Unhandled API call"));
      });

      renderWithAuth(<StudentDashboardPage />, { providerProps });

      await waitFor(() => {
        expect(screen.getByText('You have 3 active learning paths.')).toBeInTheDocument();
      });

      // Path Alpha (50%)
      const pathAlphaElement = screen.getByText('Path Alpha');
      expect(pathAlphaElement).toBeInTheDocument();
      const pathAlphaProgress = pathAlphaElement.closest('div').querySelector('.MuiLinearProgress-bar');
      expect(pathAlphaProgress).toHaveAttribute('style', expect.stringContaining('transform: translateX(-50%)'));
      expect(pathAlphaElement.closest('div').querySelector('a')).toHaveAttribute('href', `/student/progress?pathId=${mockLearningPathsData[0]._id}`);

      // Path Beta (100%)
      const pathBetaElement = screen.getByText('Path Beta');
      expect(pathBetaElement).toBeInTheDocument();
      const pathBetaProgress = pathBetaElement.closest('div').querySelector('.MuiLinearProgress-bar');
      expect(pathBetaProgress).toHaveAttribute('style', expect.stringContaining('transform: translateX(0%)'));
      expect(pathBetaElement.closest('div').querySelector('a')).toHaveAttribute('href', `/student/progress?pathId=${mockLearningPathsData[1]._id}`);
      
      // Path Gamma (0%)
      const pathGammaElement = screen.getByText('Path Gamma');
      expect(pathGammaElement).toBeInTheDocument();
      const pathGammaProgress = pathGammaElement.closest('div').querySelector('.MuiLinearProgress-bar');
      expect(pathGammaProgress).toHaveAttribute('style', expect.stringContaining('transform: translateX(-100%)'));
      expect(pathGammaElement.closest('div').querySelector('a')).toHaveAttribute('href', `/student/progress?pathId=${mockLearningPathsData[2]._id}`);
      
      // "Go to My Learning Paths" button should be visible
      expect(screen.getByRole('button', { name: /Go to My Learning Paths/i})).toBeInTheDocument();
    });

    test('shows "View All My Learning Paths" link if more than 3 paths', async () => {
      axiosInstance.get.mockImplementation((url) => {
        if (url === '/api/learning-paths/my-assigned') {
          return Promise.resolve({ data: { data: mockLearningPathsData } }); // All 4 paths
        }
        // Mock progress for first 3, as only those are fetched initially by the component
        if (url === `/api/progress/my/${mockLearningPathsData[0]._id}`) return Promise.resolve({ data: mockProgressDataLp1 });
        if (url === `/api/progress/my/${mockLearningPathsData[1]._id}`) return Promise.resolve({ data: mockProgressDataLp2 });
        if (url === `/api/progress/my/${mockLearningPathsData[2]._id}`) return Promise.resolve({ data: mockProgressDataLp3 });
        return Promise.reject(new Error("Unhandled API call for progress on 4th path, which is fine for this test"));
      });
      renderWithAuth(<StudentDashboardPage />, { providerProps });
      await waitFor(() => {
        expect(screen.getByText(`You have ${mockLearningPathsData.length} active learning paths.`)).toBeInTheDocument();
        expect(screen.getByText('View All My Learning Paths (4)')).toBeInTheDocument();
      });
    });
  });
  
  // Basic check for ProfileCompletionBanner (assuming App.test.jsx covers detailed logic)
  // This test is more about ensuring the dashboard page itself doesn't break if the banner is present.
  test('renders without crashing if ProfileCompletionBanner is hypothetically present', () => {
    // This test doesn't directly control the banner's visibility from StudentDashboardPage,
    // as that logic resides in App.jsx. We just ensure StudentDashboardPage renders.
    axiosInstance.get.mockResolvedValue({ data: { data: [] } });
    renderWithAuth(<StudentDashboardPage />, { providerProps });
    expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
  });

});
