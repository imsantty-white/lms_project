import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, axiosInstance } from '../../contexts/AuthContext';
import TeacherGroupsPage from '../TeacherGroupsPage';
import { toast } from 'react-toastify';

// Mock axiosInstance
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'), // import and retain default behavior
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(), // Add info if it's used
  },
}));

// Mock ConfirmationModal and CreateGroupModal as they are complex components and not the focus here
jest.mock('../components/CreateGroupModal', () => (props) => (
  <div data-testid="create-group-modal" data-open={props.open}>
    CreateGroupModal
    <button onClick={() => props.onSubmit({ nombre: 'New Mock Group' })}>SubmitMockCreate</button>
    <button onClick={() => props.onClose()}>CloseMockCreate</button>
  </div>
));

jest.mock('../../components/ConfirmationModal', () => (props) => (
  props.open ? (
    <div data-testid={`confirmation-modal-${props.title.replace(/\s+/g, '-').toLowerCase()}`}>
      {props.message}
      <button onClick={props.onConfirm}>Confirm</button>
      <button onClick={props.onClose}>Cancel</button>
    </div>
  ) : null
));


const mockUser = {
  _id: 'docenteTestId123',
  userType: 'Docente',
  nombre: 'Test Teacher',
};

const renderTeacherGroupsPage = (authContextValue = { user: mockUser, isAuthenticated: true, isAuthInitialized: true }) => {
  return render(
    <AuthContext.Provider value={authContextValue}>
      <MemoryRouter>
        <TeacherGroupsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('TeacherGroupsPage', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    axiosInstance.get.mockReset(); // Reset specifically for get if it was used in a previous test run by another suite
    axiosInstance.delete.mockReset();
    axiosInstance.put.mockReset();
  });

  describe('Initial Display', () => {
    it('renders tabs and loads active groups by default', async () => {
      const activeGroups = [
        { _id: '1', nombre: 'Active Group 1', codigo_acceso: 'AG1', approvedStudentCount: 5, activo: true },
        { _id: '2', nombre: 'Active Group 2', codigo_acceso: 'AG2', approvedStudentCount: 10, activo: true },
      ];
      axiosInstance.get.mockResolvedValueOnce({ data: { data: activeGroups } });

      renderTeacherGroupsPage();

      expect(screen.getByRole('tab', { name: /Grupos Activos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Grupos Archivados/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Grupos Activos/i })).toHaveAttribute('aria-selected', 'true');

      await waitFor(() => {
        expect(axiosInstance.get).toHaveBeenCalledWith('/api/groups/docente/me?status=active');
      });

      expect(screen.getByText('Active Group 1')).toBeInTheDocument();
      expect(screen.getByText('Active Group 2')).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Grupos activos cargados con éxito.');
    });
  });

  describe('Switching Tabs', () => {
    it('loads archived groups when "Archived Groups" tab is clicked', async () => {
      axiosInstance.get.mockResolvedValueOnce({ data: { data: [] } }); // Initial load for active
      renderTeacherGroupsPage();

      const archivedGroupsTab = screen.getByRole('tab', { name: /Grupos Archivados/i });
      fireEvent.click(archivedGroupsTab);

      expect(archivedGroupsTab).toHaveAttribute('aria-selected', 'true');
      
      const archivedGroups = [
        { _id: '3', nombre: 'Archived Group 1', codigo_acceso: 'AR1', approvedStudentCount: 3, activo: false },
      ];
      // Mock for the second call (archived groups)
      axiosInstance.get.mockResolvedValueOnce({ data: { data: archivedGroups } });

      await waitFor(() => {
        expect(axiosInstance.get).toHaveBeenCalledWith('/api/groups/docente/me?status=archived');
      });
      
      expect(screen.getByText('Archived Group 1')).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Grupos archivados cargados con éxito.');
    });

    it('loads active groups again when switching back to "Active Groups" tab', async () => {
      axiosInstance.get.mockResolvedValueOnce({ data: { data: [] } }); // Initial active
      renderTeacherGroupsPage();
    
      const archivedGroupsTab = screen.getByRole('tab', { name: /Grupos Archivados/i });
      fireEvent.click(archivedGroupsTab);
    
      axiosInstance.get.mockResolvedValueOnce({ data: { data: [] } }); // For archived
      await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledWith('/api/groups/docente/me?status=archived'));
    
      const activeGroupsTab = screen.getByRole('tab', { name: /Grupos Activos/i });
      fireEvent.click(activeGroupsTab);
    
      const activeGroups = [{ _id: '1', nombre: 'Active Again', codigo_acceso: 'AA1', approvedStudentCount: 1, activo: true }];
      axiosInstance.get.mockResolvedValueOnce({ data: { data: activeGroups } }); // For active again
    
      await waitFor(() => expect(axiosInstance.get).toHaveBeenCalledWith('/api/groups/docente/me?status=active'));
      expect(screen.getByText('Active Again')).toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Grupos activos cargados con éxito.');
    });
  });

  describe('Archive Group Workflow', () => {
    const activeGroups = [
      { _id: 'g1', nombre: 'Group To Archive', codigo_acceso: 'GTA1', approvedStudentCount: 7, activo: true },
    ];

    it('archives a group successfully', async () => {
      axiosInstance.get.mockResolvedValueOnce({ data: { data: activeGroups } });
      renderTeacherGroupsPage();

      await waitFor(() => expect(screen.getByText('Group To Archive')).toBeInTheDocument());

      // Find the archive button for the specific group
      // We use a more robust way if multiple groups were present, e.g., within a ListItem
      const archiveButton = screen.getByRole('button', { name: /archive/i });
      fireEvent.click(archiveButton);

      await waitFor(() => {
        expect(screen.getByTestId('confirmation-modal-confirmar-archivar-grupo')).toBeVisible();
      });
      expect(screen.getByText(/¿Estás seguro de que quieres archivar el grupo "Group To Archive"\?/i)).toBeInTheDocument();
      
      axiosInstance.delete.mockResolvedValueOnce({ data: { message: 'Grupo archivado exitosamente' } });
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' }); // From mocked ConfirmationModal
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(axiosInstance.delete).toHaveBeenCalledWith('/api/groups/g1');
      });
      
      expect(screen.queryByText('Group To Archive')).not.toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Grupo "Group To Archive" archivado con éxito.');
    });
  });

  describe('Unarchive Group Workflow', () => {
    const archivedGroups = [
      { _id: 'g2', nombre: 'Group To Unarchive', codigo_acceso: 'GTU1', approvedStudentCount: 2, activo: false },
    ];

    it('unarchives a group successfully', async () => {
      // Initial load (active groups, can be empty)
      axiosInstance.get.mockResolvedValueOnce({ data: { data: [] } });
      renderTeacherGroupsPage();

      // Switch to Archived tab
      const archivedGroupsTab = screen.getByRole('tab', { name: /Grupos Archivados/i });
      fireEvent.click(archivedGroupsTab);
      
      axiosInstance.get.mockResolvedValueOnce({ data: { data: archivedGroups } }); // Load archived groups

      await waitFor(() => expect(screen.getByText('Group To Unarchive')).toBeInTheDocument());

      // Find the unarchive button
      const unarchiveButton = screen.getByRole('button', { name: /unarchive/i });
      fireEvent.click(unarchiveButton);

      await waitFor(() => {
        expect(screen.getByTestId('confirmation-modal-confirmar-restaurar-grupo')).toBeVisible();
      });
      expect(screen.getByText(/¿Estás seguro de que quieres restaurar el grupo "Group To Unarchive"\?/i)).toBeInTheDocument();

      axiosInstance.put.mockResolvedValueOnce({ data: { message: 'Grupo restaurado exitosamente' } });
      
      const confirmButton = screen.getByRole('button', { name: 'Confirm' }); // From mocked ConfirmationModal
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(axiosInstance.put).toHaveBeenCalledWith('/api/groups/g2/restore');
      });
      
      expect(screen.queryByText('Group To Unarchive')).not.toBeInTheDocument();
      expect(toast.success).toHaveBeenCalledWith('Grupo "Group To Unarchive" restaurado con éxito.');
    });
  });
});
