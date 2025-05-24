import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContext, axiosInstance } from '../../contexts/AuthContext';
import AdminDashboardPage from '../AdminDashboardPage';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Recharts components
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data }) => <div data-testid="pie" data-count={data?.length || 0}>{data?.map(d => d.name).join(', ')}</div>,
    Cell: () => <div data-testid="cell" />,
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    Bar: ({ data }) => <div data-testid="bar" data-count={data?.length || 0}>{data?.map(d => d.name).join(', ')}</div>,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
  };
});

const mockUser = { _id: 'admin1', userType: 'Administrador', nombre: 'Admin', apellidos: 'User' };

const mockAdminStats = {
  totalUsersByRole: { Estudiante: 100, Docente: 20, Administrador: 5 },
  totalLearningPaths: 50,
  totalGroups: 30,
  platformWideAverageCompletionRate: 70.5,
  activeUsersLast7Days: 15,
};

const mockAdminPopularContent = {
  mostPopularLearningPaths: [
    { name: 'Advanced React', enrolled: 150 },
    { name: 'Node.js Fundamentals', enrolled: 120 },
  ],
  mostUtilizedContentTypes: [
    { name: 'Video', count: 500 },
    { name: 'Quiz', count: 300 },
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

describe('AdminDashboardPage', () => {
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
    renderWithAuth(<AdminDashboardPage />, { providerProps });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('displays stats and popular content after successful fetch', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/admin/stats')) {
        return Promise.resolve({ data: { data: mockAdminStats } });
      }
      if (url.includes('/api/dashboard/admin/popular-content')) {
        return Promise.resolve({ data: { data: mockAdminPopularContent } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });

    renderWithAuth(<AdminDashboardPage />, { providerProps });

    await waitFor(() => {
      // Stats Cards
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      const totalUserCount = Object.values(mockAdminStats.totalUsersByRole).reduce((a, b) => a + b, 0);
      expect(screen.getByText(totalUserCount.toString())).toBeInTheDocument();
      expect(screen.getByText(`Estudiantes: ${mockAdminStats.totalUsersByRole.Estudiante}`)).toBeInTheDocument();
      
      expect(screen.getByText('Total Learning Paths')).toBeInTheDocument();
      expect(screen.getByText(mockAdminStats.totalLearningPaths.toString())).toBeInTheDocument();

      expect(screen.getByText('Total Groups')).toBeInTheDocument();
      expect(screen.getByText(mockAdminStats.totalGroups.toString())).toBeInTheDocument();
      
      expect(screen.getByText('Active Users (Last 7 Days)')).toBeInTheDocument();
      expect(screen.getByText(mockAdminStats.activeUsersLast7Days.toString())).toBeInTheDocument();

      expect(screen.getByText('Platform-Wide Average Learning Path Completion Rate')).toBeInTheDocument();
      expect(screen.getByText(`${mockAdminStats.platformWideAverageCompletionRate}%`)).toBeInTheDocument();

      // User Role Distribution Pie Chart
      expect(screen.getByText('User Role Distribution')).toBeInTheDocument();
      const pieElement = screen.getByTestId('pie');
      expect(pieElement).toBeInTheDocument();
      expect(pieElement).toHaveTextContent('Estudiante, Docente, Administrador');


      // Popular Content
      expect(screen.getByText('Most Popular Learning Paths (Top 5 by Enrollment)')).toBeInTheDocument();
      mockAdminPopularContent.mostPopularLearningPaths.forEach(path => {
        expect(screen.getByText(path.name)).toBeInTheDocument();
        expect(screen.getByText(`Enrolled: ${path.enrolled}`)).toBeInTheDocument();
      });

      expect(screen.getByText('Most Utilized Content Types')).toBeInTheDocument();
      const barElement = screen.getAllByTestId('bar')[0]; // Assuming only one bar chart for this test section
      expect(barElement).toBeInTheDocument();
      expect(barElement).toHaveTextContent('Video, Quiz');
    });
  });

  test('displays error messages if API calls fail', async () => {
    axiosInstance.get.mockRejectedValue({ response: { data: { message: 'API Error' } } });
    renderWithAuth(<AdminDashboardPage />, { providerProps });

    await waitFor(() => {
      expect(screen.getByText(/Error loading dashboard: API Error API Error/i)).toBeInTheDocument();
    });
  });
  
  test('User Role Distribution Pie Chart handles empty/error state', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/admin/stats')) {
         return Promise.resolve({ data: { data: { ...mockAdminStats, totalUsersByRole: {} } } }); // Empty roles
      }
      if (url.includes('/api/dashboard/admin/popular-content')) {
        return Promise.resolve({ data: { data: mockAdminPopularContent } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });
    renderWithAuth(<AdminDashboardPage />, { providerProps });
    await waitFor(() => {
        expect(screen.getByText('User Role Distribution')).toBeInTheDocument();
        expect(screen.getByText('No user data available.')).toBeInTheDocument();
    });
  });
  
  test('Most Utilized Content Types Bar Chart handles empty/error state', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/admin/stats')) {
        return Promise.resolve({ data: { data: mockAdminStats } });
      }
      if (url.includes('/api/dashboard/admin/popular-content')) {
        return Promise.resolve({ data: { data: { ...mockAdminPopularContent, mostUtilizedContentTypes: [] } } }); // Empty content types
      }
      return Promise.reject(new Error('Unknown API Call'));
    });
    renderWithAuth(<AdminDashboardPage />, { providerProps });
    await waitFor(() => {
        expect(screen.getByText('Most Utilized Content Types')).toBeInTheDocument();
        expect(screen.getByText('No content type data available.')).toBeInTheDocument();
    });
  });

  test('renders User Management quick link button', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url.includes('/api/dashboard/admin/stats')) {
        return Promise.resolve({ data: { data: mockAdminStats } });
      }
      if (url.includes('/api/dashboard/admin/popular-content')) {
        return Promise.resolve({ data: { data: mockAdminPopularContent } });
      }
      return Promise.reject(new Error('Unknown API Call'));
    });
    renderWithAuth(<AdminDashboardPage />, { providerProps });
    await waitFor(() => {
        const userManagementButton = screen.getByRole('button', { name: /Go to User Management/i });
        expect(userManagementButton).toBeInTheDocument();
        expect(userManagementButton.closest('a')).toHaveAttribute('href', '/admin/user-management');
    });
  });
});
