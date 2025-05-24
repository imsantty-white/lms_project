import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // Import MemoryRouter and Routes
import { AuthContext, axiosInstance } from '../../contexts/AuthContext'; // Adjust path as needed
import StudentProgressPage from '../StudentProgressPage';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock useLocation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useLocation: vi.fn(),
  };
});

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


// Mock axiosInstance and useAuth from AuthContext
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    axiosInstance: {
      get: vi.fn(),
    },
    useAuth: vi.fn(), // This will be mocked in tests
  };
});

const renderWithAuthAndRouter = (ui, { providerProps, route = '/', path = '/student/progress' } = {}) => {
  // Mock useAuth before each render
  useAuth.mockReturnValue(providerProps);
  // Mock useLocation for each render
  const { useLocation } = vi.requireMock('react-router-dom');
  useLocation.mockReturnValue({ pathname: path, search: route.startsWith('?') ? route : '' });

  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={providerProps}>
        <Routes> {/* Wrap StudentProgressPage in Routes for context */}
          <Route path={path} element={ui} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};


describe('StudentProgressPage Enhancements', () => {
  let providerProps;

  beforeEach(() => {
    axiosInstance.get.mockReset();
    // Reset useAuth mock for each test
    const { useAuth: useAuthActual } = vi.requireActual('../../contexts/AuthContext');
    global.useAuth = useAuthActual; // Reset to actual useAuth

    providerProps = {
      user: mockUser,
      isAuthenticated: true,
      isAuthInitialized: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
    };
    
    // Default mock for useLocation if not overridden in test
    const { useLocation } = vi.requireMock('react-router-dom');
    useLocation.mockReturnValue({ pathname: '/student/progress', search: '' });
  });
  
  test('renders learning paths and "select a path" message if no pathId in URL', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { data: mockLearningPaths } });
    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });

    expect(screen.getByText('Mi Progreso Detallado')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Path Alpha')).toBeInTheDocument();
      expect(screen.getByText('Path Beta')).toBeInTheDocument();
    });
    expect(screen.getByText('Selecciona una ruta de aprendizaje para ver tu progreso detallado.')).toBeInTheDocument();
  });

  test('pre-selects learning path and loads data if pathId is in URL', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } }) // my-assigned
      .mockResolvedValueOnce({ data: mockProgressLp1 }) // progress for lp1 (pre-selected)
      .mockResolvedValueOnce({ data: mockActivitiesLp1 }); // activities for lp1 (pre-selected)

    renderWithAuthAndRouter(<StudentProgressPage />, { 
      providerProps, 
      route: `/student/progress?pathId=${mockLearningPaths[0]._id}` 
    });
    
    await waitFor(() => {
      expect(screen.getByText(`Progreso en: ${mockLearningPaths[0].nombre}`)).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
      expect(screen.getByText('Completados: 2')).toBeInTheDocument();
      expect(screen.getByText('Activity 1')).toBeInTheDocument();
    });
     // Ensure "select a path" message is NOT present
    expect(screen.queryByText('Selecciona una ruta de aprendizaje para ver tu progreso detallado.')).not.toBeInTheDocument();
  });
  
  test('shows warning if pathId from URL is not found in assigned paths', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { data: mockLearningPaths } }); // my-assigned
    
    // Mock console.warn
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithAuthAndRouter(<StudentProgressPage />, { 
      providerProps, 
      route: '/student/progress?pathId=invalidPathId' 
    });

    await waitFor(() => {
      // Should still show the path selector
      expect(screen.getByText('Path Alpha')).toBeInTheDocument();
      // And the "select a path" message because the one from URL was invalid
      expect(screen.getByText('Selecciona una ruta de aprendizaje para ver tu progreso detallado.')).toBeInTheDocument();
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Learning path with ID \"invalidPathId\" from URL not found"));
    consoleWarnSpy.mockRestore();
  });


  test('loads and displays progress and activity data when a path is selected by click', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } }) 
      .mockResolvedValueOnce({ data: mockProgressLp1 }) 
      .mockResolvedValueOnce({ data: mockActivitiesLp1 }); 

    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });

    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByText(`Progreso en: ${mockLearningPaths[0].nombre}`)).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
      expect(screen.getByText('Completados: 2')).toBeInTheDocument();
      expect(screen.getByText('Pendientes: 2')).toBeInTheDocument();
      expect(screen.getByText('Activity 1')).toBeInTheDocument();
      expect(screen.getByText('Activity 2')).toBeInTheDocument();
    });
  });

  test('renders Pie chart with correct percentages when path selected by click', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 })
      .mockResolvedValueOnce({ data: mockActivitiesLp1 });

    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));
    
    await waitFor(() => {
        expect(screen.getByTestId('pie')).toBeInTheDocument();
        expect(screen.getByTestId('pie-label')).toHaveTextContent('label-function');
        expect(screen.getByText('Completados: 2')).toBeInTheDocument(); 
        expect(screen.getByText('Pendientes: 2')).toBeInTheDocument(); 
      });
  });

  test('renders Line chart with correct data points when path selected by click', async () => {
     axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 }) 
      .mockResolvedValueOnce({ data: mockActivitiesLp1 }); 

    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      const lineElement = screen.getByTestId('line');
      expect(lineElement).toHaveAttribute('data-datakey', 'score');
      expect(lineElement).toHaveAttribute('data-name', 'Puntuación');
    });
  });
  
  test('shows placeholder/empty state for Pie chart if no progress data (path selected by click)', async () => {
    const noProgressData = { progress: { ...mockProgressLp1.progress, total_themes: 0, completed_themes: [] } };
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: noProgressData }) 
      .mockResolvedValueOnce({ data: mockActivitiesLp1 });

    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      // The component shows "No hay temas para mostrar en esta ruta."
      expect(screen.getByText('No hay temas para mostrar en esta ruta.')).toBeInTheDocument(); 
      expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
    });
  });

  test('shows placeholder/empty state for Line chart if no graded activities (path selected by click)', async () => {
    const noGradedActivities = { activities: [ { _id: 'act4', title: 'Activity Not Graded', status: 'Entregado', lastSubmission: { fecha_envio: new Date().toISOString() } } ]};
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 })
      .mockResolvedValueOnce({ data: noGradedActivities });

    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByText('Aún no hay actividades calificadas para mostrar la evolución de las puntuaciones.')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  test('renders "Performance Summary" placeholder when path selected by click', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockResolvedValueOnce({ data: mockProgressLp1 })
      .mockResolvedValueOnce({ data: mockActivitiesLp1 });

    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));

    await waitFor(() => {
      expect(screen.getByText('Resumen de Desempeño')).toBeInTheDocument();
      expect(screen.getByText(/El resumen detallado del desempeño \(fortalezas y debilidades\) estará disponible pronto./i)).toBeInTheDocument();
    });
  });

  test('handles empty learning paths scenario (no paths assigned)', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { data: [] } }); 
    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });

    await waitFor(() => {
      expect(screen.getByText('No tienes rutas de aprendizaje asignadas.')).toBeInTheDocument();
      expect(screen.queryByText('Selecciona una ruta de aprendizaje para ver tu progreso detallado.')).not.toBeInTheDocument();
    });
  });

  test('handles error when fetching learning paths', async () => {
    axiosInstance.get.mockRejectedValueOnce(new Error('Failed to fetch learning paths'));
    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });

    await waitFor(() => {
      expect(screen.getByText('No tienes rutas de aprendizaje asignadas.')).toBeInTheDocument();
    });
  });

  test('handles error when fetching progress or activities (path selected by click)', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: { data: mockLearningPaths } })
      .mockRejectedValueOnce(new Error('Failed to fetch progress')); 

    renderWithAuthAndRouter(<StudentProgressPage />, { providerProps });
    await waitFor(() => screen.getByText('Path Alpha'));
    fireEvent.click(screen.getByText('Path Alpha'));
    
    await waitFor(() => {
      // Check for the message indicating no progress data was found for the path
      expect(screen.getByText('No se encontraron datos de progreso para esta ruta.')).toBeInTheDocument();
      // Activities list should also be empty or show "no activities"
      expect(screen.getByText('No hay actividades disponibles para esta ruta.')).toBeInTheDocument();
    });
  });

});
