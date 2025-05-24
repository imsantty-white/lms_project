import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContext, axiosInstance } from '../../contexts/AuthContext';
import TeacherDashboardPage from '../TeacherDashboardPage';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Recharts components
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ name }) => <div data-testid="bar" data-name={name} />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

const mockUser = { _id: 'teacher1', userType: 'Docente', nombre: 'Teacher', apellidos: 'User' };

const mockTeacherStats = {
  totalStudentsInMyGroups: 50,
  activeStudentsLast7Days: 25,
  averageLearningPathCompletionRate: 65.5,
  learningPathsManaged: 5,
};

const mockPopularContent = {
  mostAccessedContent: [ // Backend provides this as 'mostAccessedContent' which is simplified to 'mostAssignedContent'
    { name: 'Introduction to Programming Video', count: 150 },
    { name: 'JavaScript Basics Article', count: 120 },
  ],
  mostCompletedActivities: [
    { name: 'Hello World Exercise', count: 45 },
    { name: 'Simple Calculator Project', count: 30 },
  ],
};

vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    axiosInstance: {
      get: vi.fn(),
    },
  };
});

const renderWithAuth = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <Router>
      <AuthContext.Provider value={providerProps}>{ui}</AuthContext.Provider>
    </Router>,
    renderOptions
  );
};

describe('TeacherDashboardPage', () => {
  let providerProps;

  beforeEach(() => {
    axiosInstance.get.mockReset();
    providerProps = {
      user: mockUser,
      isAuthenticated: true,
      isAuthInitialized: true,
    };
  });

  test('renders loading state initially', () => {
    axiosInstance.get.mockImplementation(() => new Promise(() => {})); // Keep it pending

    renderWithAuth(<TeacherDashboardPage />, { providerProps });
    
    // Check for the main loading spinner if both are loading
    // The page logic is: if (!isAuthInitialized || (loadingStats && loadingPopularContent))
    // Since isAuthInitialized is true, this means both must be loading.
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays stats and popular content after successful fetch', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/teacher/stats')) {
        return Promise.resolve({ data: { data: mockTeacherStats } });
      }
      if (url.includes('/api/dashboard/teacher/popular-content')) {
        return Promise.resolve({ data: { data: mockPopularContent } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });

    renderWithAuth(<TeacherDashboardPage />, { providerProps });

    await waitFor(() => {
      // Stats
      expect(screen.getByText('Total Students')).toBeInTheDocument();
      expect(screen.getByText(mockTeacherStats.totalStudentsInMyGroups.toString())).toBeInTheDocument();
      
      expect(screen.getByText('Active Students')).toBeInTheDocument();
      expect(screen.getByText(mockTeacherStats.activeStudentsLast7Days.toString())).toBeInTheDocument();

      expect(screen.getByText('Learning Paths Managed')).toBeInTheDocument();
      expect(screen.getByText(mockTeacherStats.learningPathsManaged.toString())).toBeInTheDocument();
      
      expect(screen.getByText('Avg. Path Completion')).toBeInTheDocument();
      expect(screen.getByText(`${mockTeacherStats.averageLearningPathCompletionRate}%`)).toBeInTheDocument();

      // Popular Content
      expect(screen.getByText('Most Assigned Content (Top 5)')).toBeInTheDocument();
      mockPopularContent.mostAccessedContent.forEach(content => {
        expect(screen.getByText(content.name)).toBeInTheDocument();
        expect(screen.getByText(`Assigned ${content.count} times`)).toBeInTheDocument();
      });

      expect(screen.getByText('Most Completed Activities (Top 5)')).toBeInTheDocument();
      mockPopularContent.mostCompletedActivities.forEach(activity => {
        expect(screen.getByText(activity.name)).toBeInTheDocument();
        expect(screen.getByText(`Completed ${activity.count} times`)).toBeInTheDocument();
      });
    });
  });

  test('displays error messages if API calls fail', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/teacher/stats')) {
        return Promise.reject({ response: { data: { message: 'Failed to load stats' } } });
      }
      if (url.includes('/api/dashboard/teacher/popular-content')) {
        return Promise.reject({ response: { data: { message: 'Failed to load content' } } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });

    renderWithAuth(<TeacherDashboardPage />, { providerProps });

    await waitFor(() => {
      // The page shows a combined error if essential data is missing
      expect(screen.getByText(/Error loading dashboard: Failed to load stats Failed to load content/i)).toBeInTheDocument();
    });
    
    // Also check for individual error alerts within cards if that's the design
    // The current design shows a single main error if stats or popular content fail and are null.
    // If they partially load, individual error snippets might show up in cards.
    // For this test, we assume a full failure leading to the main error message.
  });
  
   test('displays specific error for stats and continues if popular content loads', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/teacher/stats')) {
        return Promise.reject({ response: { data: { message: 'Stats error' } } });
      }
      if (url.includes('/api/dashboard/teacher/popular-content')) {
        return Promise.resolve({ data: { data: mockPopularContent } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });

    renderWithAuth(<TeacherDashboardPage />, { providerProps });

    await waitFor(() => {
      // Expect popular content to be rendered
      expect(screen.getByText('Most Assigned Content (Top 5)')).toBeInTheDocument();
      expect(screen.getByText(mockPopularContent.mostAccessedContent[0].name)).toBeInTheDocument();
      
      // Expect stats cards to show 'N/A' and their specific error
      expect(screen.getAllByText('Stats error').length).toBeGreaterThan(0); // Error message in stat cards
      const totalStudentsValue = screen.getByText('Total Students').parentElement.querySelector('h4');
      expect(totalStudentsValue).toHaveTextContent('N/A');
    });
  });


  test('renders the "Activity Completions (Weekly Trend - Mock Data)" chart', async () => {
     axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/teacher/stats')) {
        return Promise.resolve({ data: { data: mockTeacherStats } });
      }
      if (url.includes('/api/dashboard/teacher/popular-content')) {
        return Promise.resolve({ data: { data: mockPopularContent } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });
    
    renderWithAuth(<TeacherDashboardPage />, { providerProps });

    await waitFor(() => {
      expect(screen.getByText('Activity Completions (Weekly Trend - Mock Data)')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toHaveAttribute('data-name', 'Completions');
      expect(screen.getByText(/Weekly trend is mock data/i)).toBeInTheDocument();
    });
  });
  
  test('shows "User not authenticated" if not authenticated but auth is initialized', async () => {
    providerProps.isAuthenticated = false;
    axiosInstance.get.mockResolvedValue({ data: { data: {} } }); // Should not be called

    renderWithAuth(<TeacherDashboardPage />, { providerProps });

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to view this page.')).toBeInTheDocument();
    });
     expect(axiosInstance.get).not.toHaveBeenCalled();
  });
  
  test('shows empty state messages if API returns empty data', async () => {
    const emptyStats = {
        totalStudentsInMyGroups: 0,
        activeStudentsLast7Days: 0,
        averageLearningPathCompletionRate: 0,
        learningPathsManaged: 0,
    };
    const emptyPopularContent = {
        mostAccessedContent: [],
        mostCompletedActivities: [],
    };

    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/teacher/stats')) {
        return Promise.resolve({ data: { data: emptyStats } });
      }
      if (url.includes('/api/dashboard/teacher/popular-content')) {
        return Promise.resolve({ data: { data: emptyPopularContent } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });

    renderWithAuth(<TeacherDashboardPage />, { providerProps });

    await waitFor(() => {
      // Check that stats are displayed as 0
      expect(screen.getByText('Total Students').parentElement.querySelector('h4')).toHaveTextContent('0');
      // Check for empty state messages in popular content sections
      expect(screen.getByText('No content assignment data available.')).toBeInTheDocument();
      expect(screen.getByText('No activity completion data available.')).toBeInTheDocument();
    });
  });

});
