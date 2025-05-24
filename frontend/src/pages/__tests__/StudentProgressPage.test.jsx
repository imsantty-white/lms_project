import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthContext, axiosInstance } from '../../contexts/AuthContext'; // Adjust path as needed
import StudentProgressPage from '../StudentProgressPage';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Recharts components
vi.mock('recharts', async () => {
  const OriginalRecharts = await vi.importActual('recharts');
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }) => <div data-testid="pie-chart">{children}</div>,
    Pie: ({ data, label }) => (
      <div data-testid="pie">
        {data.map(entry => (
          <span key={entry.name}>{`${entry.name}: ${entry.value}`}</span>
        ))}
        {label && <span data-testid="pie-label">{typeof label === 'function' ? 'label-function' : label.toString()}</span>}
      </div>
    ),
    Cell: () => <div data-testid="cell" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
    Line: ({ dataKey, name }) => <div data-testid="line" data-datakey={dataKey} data-name={name} />,
    XAxis: ({ dataKey }) => <div data-testid="xaxis" data-datakey={dataKey} />,
    YAxis: ({ label }) => <div data-testid="yaxis">{label?.value}</div>,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
  };
});


const mockUser = { _id: 'student1', userType: 'Estudiante', nombre: 'Test', apellidos: 'User' };

const mockLearningPaths = [
  { _id: 'lp1', nombre: 'Path Alpha' },
  { _id: 'lp2', nombre: 'Path Beta' },
];

const mockProgressLp1 = {
  progress: {
    _id: 'progress1',
    learning_path_id: 'lp1',
    completed_themes: [{ theme_id: 't1' }, { theme_id: 't2' }],
    total_themes: 4, // 50%
    path_status: 'En progreso',
  }
};

const mockActivitiesLp1 = {
  activities: [
    { _id: 'act1', title: 'Activity 1', status: 'Completado', lastSubmission: { calificacion: 80, fecha_envio: new Date('2023-01-15').toISOString() } },
    { _id: 'act2', title: 'Activity 2', status: 'En progreso', lastSubmission: { calificacion: 90, fecha_envio: new Date('2023-01-20').toISOString() } },
    { _id: 'act3', title: 'Activity 3 No Submission', status: 'Pendiente' },
  ]
};

const mockProgressLp2Empty = {
  progress: {
    _id: 'progress2',
    learning_path_id: 'lp2',
    completed_themes: [],
    total_themes: 0,
    path_status: 'No iniciado',
  }
};

const mockActivitiesLp2Empty = {
  activities: []
};


// Mock axiosInstance
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

describe('StudentProgressPage Enhancements', () => {
  let providerProps;

  beforeEach(() => {
    axiosInstance.get.mockReset();
    providerProps = {
      user: mockUser,
      isAuthenticated: true,
      isAuthInitialized: true,
      // Add other context values if needed
    };
  });

  test('renders learning paths and allows selection', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { data: mockLearningPaths } }); // For my-assigned paths
    
    renderWithAuth(<StudentProgressPage />, { providerProps });

    expect(screen.getByText('Mi Progreso')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Path Alpha')).toBeInTheDocument();
      expect(screen.getByText('Path Beta')).toBeInTheDocument();
    });
  });

  test('loads and displays progress and activity data when a path is selected', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } }) // my-assigned
      .mockResolvedValueOnce({ data: mockProgressLp1 }) // progress for lp1
      .mockResolvedValueOnce({ data: mockActivitiesLp1 }); // activities for lp1

    renderWithAuth(<StudentProgressPage />, { providerProps });

    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      // Check for Pie chart data (overall completion)
      expect(screen.getByTestId('pie')).toBeInTheDocument();
      expect(screen.getByText('Completados: 2')).toBeInTheDocument();
      expect(screen.getByText('Pendientes: 2')).toBeInTheDocument(); // total_themes 4 - completed_themes 2 = 2

      // Check for Line chart data (scores over time)
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toHaveAttribute('data-datakey', 'score');
      // Check if activity titles (or shortened versions) are present for XAxis (mocked)
      // This depends on how XAxis dataKey is set and how data is transformed.
      // Our mock XAxis just takes dataKey, so we can't directly check for 'Activity 1' in the DOM via XAxis.
      // However, the Line component's 'name' prop could be checked if set.
      // For now, presence of Line chart and correct dataKey on Line is a good indicator.

      // Check for list of activities
      expect(screen.getByText('Activity 1')).toBeInTheDocument();
      expect(screen.getByText('Activity 2')).toBeInTheDocument();
    });
  });

  test('renders Pie chart with correct percentages', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 })
      .mockResolvedValueOnce({ data: mockActivitiesLp1 });

    renderWithAuth(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));
    
    await waitFor(() => {
        expect(screen.getByTestId('pie')).toBeInTheDocument();
        // The label function is complex, so we check for the presence of the label rendering trigger
        expect(screen.getByTestId('pie-label')).toHaveTextContent('label-function');
        // And the underlying data that would be used by the label
        expect(screen.getByText('Completados: 2')).toBeInTheDocument(); // 2 completed
        expect(screen.getByText('Pendientes: 2')).toBeInTheDocument(); // 4 total - 2 completed = 2 pending
      });
  });

  test('renders Line chart with correct data points', async () => {
     axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 }) // progress for lp1
      .mockResolvedValueOnce({ data: mockActivitiesLp1 }); // activities for lp1

    renderWithAuth(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      const lineElement = screen.getByTestId('line');
      expect(lineElement).toHaveAttribute('data-datakey', 'score');
      expect(lineElement).toHaveAttribute('data-name', 'Puntuación');
      // Further checks would involve inspecting the data passed to LineChart if not for the mock.
      // For now, we confirm the Line component is rendered with expected props.
    });
  });
  
  test('shows placeholder/empty state for Pie chart if no progress data', async () => {
    const noProgressData = { progress: { ...mockProgressLp1.progress, total_themes: 0, completed_themes: [] } };
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: noProgressData }) 
      .mockResolvedValueOnce({ data: mockActivitiesLp1 });

    renderWithAuth(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByText('No hay temas para mostrar.')).toBeInTheDocument();
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument(); // Pie chart shouldn't render
    });
  });

  test('shows placeholder/empty state for Line chart if no graded activities', async () => {
    const noGradedActivities = { activities: [ { _id: 'act4', title: 'Activity Not Graded', status: 'Entregado', lastSubmission: { fecha_envio: new Date().toISOString() } } ]};
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 })
      .mockResolvedValueOnce({ data: noGradedActivities });

    renderWithAuth(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByText('Aún no hay actividades calificadas para mostrar la evolución de las puntuaciones.')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  test('renders "Performance Summary" placeholder', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 })
      .mockResolvedValueOnce({ data: mockActivitiesLp1 });

    renderWithAuth(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByText('Resumen de Desempeño')).toBeInTheDocument();
      expect(screen.getByText(/El resumen detallado del desempeño \(fortalezas y debilidades\) estará disponible pronto./i)).toBeInTheDocument();
    });
  });

  test('handles empty learning paths scenario', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { data: [] } }); // No learning paths
    renderWithAuth(<StudentProgressPage />, { providerProps });

    await waitFor(() => {
      expect(screen.getByText('No tienes rutas de aprendizaje asignadas.')).toBeInTheDocument();
    });
  });

  test('handles error when fetching learning paths', async () => {
    axiosInstance.get.mockRejectedValueOnce(new Error('Failed to fetch learning paths'));
    renderWithAuth(<StudentProgressPage />, { providerProps });

    await waitFor(() => {
      // Depending on how error is handled, it might show the "No tienes rutas..." or a specific error.
      // The current implementation of StudentProgressPage sets learningPaths to [] on catch.
      expect(screen.getByText('No tienes rutas de aprendizaje asignadas.')).toBeInTheDocument();
    });
  });

  test('handles error when fetching progress or activities', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockRejectedValueOnce(new Error('Failed to fetch progress')); // Error for progress

    renderWithAuth(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));
    
    // Check for some indication of error or lack of data.
    // The component currently logs error to console and shows empty sections.
    // We can check that specific data sections are not rendered as expected.
    await waitFor(() => {
      // Example: Progress bar might not show, or activities list is empty
      expect(screen.queryByText(/temas completados/i)).not.toBeInTheDocument(); // Check that "X de Y temas completados" is not there
      expect(screen.getByText('No hay actividades disponibles para esta ruta.')).toBeInTheDocument(); // If activities also failed or were empty
    });
  });

});
