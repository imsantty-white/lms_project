import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, useParams } from 'react-router-dom';
import { AuthContext, axiosInstance } from '../../contexts/AuthContext';
import ManageLearningPathPage from '../ManageLearningPathPage';
import { toast } from 'react-toastify';

// Mock axiosInstance
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
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
    info: jest.fn(),
  },
}));

// Mock useParams
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: () => jest.fn(), 
}));

// Simplified Mocks for Child Modals and Item Components
jest.mock('../components/CreateModuleModal', () => (props) => (
  props.open ? <div data-testid="create-module-modal">CreateModuleModal<button onClick={() => props.onSubmit({ nombre: 'New Module Name', descripcion: 'Desc' })}>SubmitNewModule</button></div> : null
));
jest.mock('../components/EditModuleModal', () => (props) => (
  props.open ? <div data-testid="edit-module-modal">EditModuleModal <button onClick={() => props.onSubmit({ ...props.initialData, _id: props.initialData?._id || 'm1', nombre: 'Updated Module Name' })}>SubmitUpdateModule</button></div> : null
));
jest.mock('../components/CreateThemeModal', () => (props) => (
    props.open ? <div data-testid="create-theme-modal">CreateThemeModal <button onClick={() => props.onSubmit({ nombre: 'New Theme Name', descripcion: 'Desc' })}>SubmitNewTheme</button></div> : null
));
jest.mock('../components/EditThemeModal', () => (props) => (
    props.open ? <div data-testid="edit-theme-modal">EditThemeModal <button onClick={() => props.onSubmit({ ...props.initialData, _id: props.initialData?._id || 't1', nombre: 'Updated Theme Name' })}>SubmitUpdateTheme</button></div> : null
));
jest.mock('../components/AddContentAssignmentModal', () => (props) => (
    props.open ? <div data-testid="add-content-assignment-modal">AddContentAssignmentModal</div> : null
));
jest.mock('../components/EditContentAssignmentModal', () => (props) => (
    props.open ? <div data-testid="edit-content-assignment-modal">EditContentAssignmentModal</div> : null
));

// Updated ModuleItem mock
jest.mock('../components/ModuleItem', ({ module, onEditModule, onDeleteModule, onCreateTheme, onDeleteTheme, onEditTheme }) => (
    <div data-testid={`module-item-${module._id}`}>
      <span data-testid={`module-name-${module._id}`}>{module.nombre}</span>
      {module.isOptimistic && <span data-testid={`optimistic-module-${module._id}`}>Optimistic</span>}
      <button onClick={() => onEditModule(module)}>EditModule-{module._id}</button>
      <button onClick={() => onDeleteModule(module._id)}>DeleteModule-{module._id}</button>
      <button onClick={() => onCreateTheme(module._id)}>CreateThemeForModule-{module._id}</button>
      {module.themes && module.themes.map(theme => (
        <div key={theme._id} data-testid={`theme-item-${theme._id}`}>
          <span data-testid={`theme-name-${theme._id}`}>{theme.nombre}</span>
          {theme.isOptimistic && <span data-testid={`optimistic-theme-${theme._id}`}>OptimisticTheme</span>}
          <button onClick={() => onEditTheme(theme)}>EditTheme-{theme._id}</button>
          <button onClick={() => onDeleteTheme(theme._id)}>DeleteTheme-{theme._id}</button>
        </div>
      ))}
    </div>
));
  
// Mock Confirmation Dialog
jest.mock('../../components/ConfirmationModal', () => ({ open, title, message, onConfirm, onClose, isActionInProgress }) => (
  open ? (
    <div data-testid={`confirmation-modal-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div data-testid="modal-title">{title}</div>
      <div data-testid="modal-message">{message}</div>
      <button onClick={onConfirm} disabled={isActionInProgress}>Confirm</button>
      <button onClick={onClose} disabled={isActionInProgress}>Cancel</button>
    </div>
  ) : null
));

const mockUser = {
  _id: 'docenteTestId123',
  userType: 'Docente',
  nombre: 'Test Teacher',
};

const mockLearningPathBase = {
    _id: 'path1',
    nombre: 'Test Learning Path',
    descripcion: 'A test learning path.',
    group_id: { _id: 'group1', nombre: 'Test Group', activo: true },
    modules: [],
};

// Store for the current learning path data to be accessible by mocks if needed
let currentLearningPathDataForMocks = {};

const renderManageLearningPathPage = (
    authContextValue = { user: mockUser, isAuthenticated: true, isAuthInitialized: true },
    learningPathData = JSON.parse(JSON.stringify(mockLearningPathBase)) // Use a deep clone
  ) => {
    currentLearningPathDataForMocks = JSON.parse(JSON.stringify(learningPathData)); // Deep clone
    useParams.mockReturnValue({ pathId: learningPathData._id });
    axiosInstance.get.mockResolvedValue({ data: { ...currentLearningPathDataForMocks } }); // Initial fetch

    const utils = render(
      <div data-testid="manage-learning-path-page-container" data-learning-path={JSON.stringify(currentLearningPathDataForMocks)}>
        <AuthContext.Provider value={authContextValue}>
          <MemoryRouter>
            <ManageLearningPathPage />
          </MemoryRouter>
        </AuthContext.Provider>
      </div>
    );
    
    // Function to update the dataset for the mock if state changes internally
    const updateMockDataset = (newData) => {
        currentLearningPathDataForMocks = JSON.parse(JSON.stringify(newData)); // Deep clone
        const container = screen.queryByTestId('manage-learning-path-page-container');
        if (container) {
            container.dataset.learningPath = JSON.stringify(currentLearningPathDataForMocks);
        }
    };
    
    return { ...utils, updateMockDataset };
};


describe('ManageLearningPathPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    axiosInstance.put.mockReset();
    axiosInstance.delete.mockReset();
    toast.success.mockClear();
    toast.error.mockClear();
    toast.info.mockClear();
  });

  // I. Tests for Module Operations State Refactoring (useReducer)
  describe('Module Operations State (useReducer)', () => {
    it('opens/closes Create Module modal via dispatch', async () => {
      renderManageLearningPathPage();
      await waitFor(() => expect(screen.getByText('Test Learning Path')).toBeInTheDocument());
      
      expect(screen.queryByTestId('create-module-modal')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Añadir Módulo/i }));
      expect(screen.getByTestId('create-module-modal')).toBeVisible();
    });

    it('sets moduleToEdit when opening Edit Module modal', async () => {
        const moduleToEdit = { _id: 'm1', nombre: 'Module 1', descripcion: 'First module', themes: [] };
        const lpDataWithModule = { ...mockLearningPathBase, modules: [moduleToEdit] };
        renderManageLearningPathPage(undefined, lpDataWithModule);
        await waitFor(() => expect(screen.getByText('Module 1')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: `EditModule-${moduleToEdit._id}` }));
        expect(screen.getByTestId('edit-module-modal')).toBeVisible();
        // The mocked EditModuleModal should receive initialData prop.
        // We can check this if the mock is designed to show it or use it.
    });

    it('sets moduleIdToDelete when opening Delete Module modal', async () => {
        const moduleToDelete = { _id: 'm1', nombre: 'Module 1', themes: [] };
        const lpDataWithModule = { ...mockLearningPathBase, modules: [moduleToDelete] };
        renderManageLearningPathPage(undefined, lpDataWithModule);
        await waitFor(() => expect(screen.getByText('Module 1')).toBeInTheDocument());
      
        fireEvent.click(screen.getByRole('button', { name: `DeleteModule-${moduleToDelete._id}` }));
        await waitFor(() => expect(screen.getByTestId('confirmation-modal-confirmar-eliminación-de-módulo')).toBeVisible());
        expect(screen.getByTestId('modal-message')).toHaveTextContent(/¿Estás seguro de que deseas eliminar este módulo?/i);
    });

    it('manages isCreatingModule loading state and dispatches correctly', async () => {
        renderManageLearningPathPage();
        await waitFor(() => expect(screen.getByText('Test Learning Path')).toBeInTheDocument());
      
        fireEvent.click(screen.getByRole('button', { name: /Añadir Módulo/i }));
        expect(screen.getByTestId('create-module-modal')).toBeVisible();
      
        fireEvent.click(screen.getByRole('button', { name: 'SubmitNewModule' })); // From CreateModuleModal mock
      
        await waitFor(() => expect(screen.getByTestId('confirmation-modal-confirmar-creación-de-módulo')).toBeVisible());
        expect(screen.getByTestId('modal-message')).toHaveTextContent('¿Estás seguro de que deseas crear el módulo "New Module Name" en esta ruta?');
        
        const serverModule = { _id: 'newM1', nombre: 'New Module Name', descripcion: 'Desc', orden: 1, themes: [] };
        axiosInstance.post.mockResolvedValue({ data: serverModule });
        
        const confirmButton = screen.getByRole('button', { name: 'Confirm' }); // From ConfirmationModal mock
        fireEvent.click(confirmButton);
        
        expect(confirmButton).toBeDisabled(); // Check if loading state is applied
      
        await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledTimes(1));
        expect(confirmButton).not.toBeDisabled(); // Check if loading state is reset
        expect(toast.success).toHaveBeenCalledWith(`Módulo "${serverModule.nombre}" creado con éxito!`);
      });
  });

  // II. Tests for Optimistic Updates
  describe('Optimistic Updates', () => {
    describe('Add Module', () => {
        it('Optimistic Success: adds module immediately, then updates with server data', async () => {
            const { updateMockDataset } = renderManageLearningPathPage();
            await waitFor(() => expect(screen.getByText('Test Learning Path')).toBeInTheDocument());
    
            fireEvent.click(screen.getByRole('button', { name: /Añadir Módulo/i }));
            fireEvent.click(screen.getByRole('button', { name: 'SubmitNewModule' }));
            
            await waitFor(() => screen.getByTestId('confirmation-modal-confirmar-creación-de-módulo'));
            fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
            
            await waitFor(() => expect(screen.getByTestId(/optimistic-module-temp-/i)).toBeInTheDocument());
            expect(screen.getByText('New Module Name')).toBeInTheDocument();
            updateMockDataset({ 
              ...currentLearningPathDataForMocks, 
              modules: [{ _id: 'temp-id', nombre: 'New Module Name', isOptimistic: true, themes: [] }] 
            });


            const serverModule = { _id: 'serverM1', nombre: 'Server Module Name', descripcion: 'Server Desc', orden: 1, themes: [] };
            axiosInstance.post.mockResolvedValue({ data: serverModule });

            await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledWith(`/api/learning-paths/${mockLearningPathBase._id}/modules`, { nombre: 'New Module Name', descripcion: 'Desc' }));
            
            updateMockDataset({ ...currentLearningPathDataForMocks, modules: [serverModule] });
            await waitFor(() => expect(screen.getByText('Server Module Name')).toBeInTheDocument());
            expect(screen.queryByTestId(/optimistic-module-/i)).not.toBeInTheDocument();
            expect(toast.success).toHaveBeenCalledWith(`Módulo "${serverModule.nombre}" creado con éxito!`);
            expect(axiosInstance.get).toHaveBeenCalledTimes(1); 
        });

        it('Optimistic Error/Rollback: adds module, then removes on API error', async () => {
            const { updateMockDataset } = renderManageLearningPathPage();
            await waitFor(() => expect(screen.getByText('Test Learning Path')).toBeInTheDocument());

            fireEvent.click(screen.getByRole('button', { name: /Añadir Módulo/i }));
            fireEvent.click(screen.getByRole('button', { name: 'SubmitNewModule' }));
            
            await waitFor(() => screen.getByTestId('confirmation-modal-confirmar-creación-de-módulo'));
            fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

            await waitFor(() => expect(screen.getByTestId(/optimistic-module-temp-/i)).toBeInTheDocument());
            expect(screen.getByText('New Module Name')).toBeInTheDocument();
            updateMockDataset({ 
              ...currentLearningPathDataForMocks, 
              modules: [{ _id: 'temp-id', nombre: 'New Module Name', isOptimistic: true, themes: [] }] 
            });

            const errorMsg = 'Network Error';
            axiosInstance.post.mockRejectedValue({ response: { data: { message: errorMsg } } });

            await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledTimes(1));
            
            updateMockDataset({ ...currentLearningPathDataForMocks, modules: [] });
            expect(screen.queryByText('New Module Name')).not.toBeInTheDocument();
            expect(screen.queryByTestId(/optimistic-module-/i)).not.toBeInTheDocument();
            expect(toast.error).toHaveBeenCalledWith(`Error al crear módulo "New Module Name": ${errorMsg}`);
        });
    });

    describe('Delete Theme', () => {
        const themeToDelete = { _id: 't1', nombre: 'Theme To Delete', orden: 1, assignments: [] };
        const moduleWithTheme = { _id: 'm1', nombre: 'Module With Theme', themes: [themeToDelete] };
        const lpDataWithTheme = { ...mockLearningPathBase, modules: [moduleWithTheme] };

        it('Optimistic Success: removes theme immediately', async () => {
            const { updateMockDataset } = renderManageLearningPathPage(undefined, lpDataWithTheme);
            await waitFor(() => expect(screen.getByText('Theme To Delete')).toBeInTheDocument());
            
            fireEvent.click(screen.getByRole('button', { name: `DeleteTheme-${themeToDelete._id}` }));
            
            await waitFor(() => screen.getByTestId('confirmation-modal-confirmar-eliminación-de-tema'));
            fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

            updateMockDataset({ 
              ...currentLearningPathDataForMocks, 
              modules: [{ ...moduleWithTheme, themes: [] }] 
            });
            expect(screen.queryByText('Theme To Delete')).not.toBeInTheDocument();
            
            axiosInstance.delete.mockResolvedValue({ data: {} });

            await waitFor(() => expect(axiosInstance.delete).toHaveBeenCalledWith(`/api/learning-paths/themes/${themeToDelete._id}`));
            expect(toast.success).toHaveBeenCalledWith(`Tema "${themeToDelete.nombre}" eliminado con éxito!`);
            expect(axiosInstance.get.mock.calls.length).toBe(1); 
        });

        it('Optimistic Error/Rollback: removes theme, then re-adds on API error', async () => {
            const { updateMockDataset } = renderManageLearningPathPage(undefined, lpDataWithTheme);
            await waitFor(() => expect(screen.getByText('Theme To Delete')).toBeInTheDocument());
            
            fireEvent.click(screen.getByRole('button', { name: `DeleteTheme-${themeToDelete._id}` }));
            
            await waitFor(() => screen.getByTestId('confirmation-modal-confirmar-eliminación-de-tema'));
            fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

            updateMockDataset({ 
                ...currentLearningPathDataForMocks, 
                modules: [{ ...moduleWithTheme, themes: [] }] 
              });
            expect(screen.queryByText('Theme To Delete')).not.toBeInTheDocument();

            const errorMsg = 'Server error';
            axiosInstance.delete.mockRejectedValue({ response: { data: { message: errorMsg } } });

            await waitFor(() => expect(axiosInstance.delete).toHaveBeenCalledTimes(1));
            
            updateMockDataset(lpDataWithTheme); // Rollback dataset for mock
            await waitFor(() => expect(screen.getByText('Theme To Delete')).toBeInTheDocument());
            expect(toast.error).toHaveBeenCalledWith(`Error al intentar eliminar el tema "${themeToDelete.nombre}".`);
        });
    });
  });

  // III. Tests for Skeleton Loading
  describe('Skeleton Loading', () => {
    it('shows skeleton loading state initially and hides after load', async () => {
      axiosInstance.get.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: mockLearningPathBase }), 100)));
      renderManageLearningPathPage();

      expect(screen.getAllByText((content, element) => element.classList.contains('MuiSkeleton-root')).length).toBeGreaterThan(3);
      expect(screen.queryByText('Test Learning Path')).not.toBeInTheDocument();
      
      await waitFor(() => expect(screen.getByText('Test Learning Path')).toBeInTheDocument(), { timeout: 500 });
      expect(screen.queryAllByText((content, element) => element.classList.contains('MuiSkeleton-root')).length).toBe(0);
    });
  });

  // IV. Tests for Enhanced Contextual Feedback
  describe('Enhanced Contextual Feedback (Toasts)', () => {
    
    it('Delete Module: shows specific success/error toasts', async () => {
        const moduleToDelete = { _id: 'mDel123', nombre: 'Module For Deletion Test', themes: [] };
        const lpData = { ...mockLearningPathBase, modules: [moduleToDelete] };
        renderManageLearningPathPage(undefined, lpData);
        await waitFor(() => expect(screen.getByText('Module For Deletion Test')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: `DeleteModule-${moduleToDelete._id}` }));
        await waitFor(() => expect(screen.getByTestId('confirmation-modal-confirmar-eliminación-de-módulo')).toBeVisible());
        
        // Success Case
        axiosInstance.delete.mockResolvedValueOnce({ data: {} });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith(`Módulo "${moduleToDelete.nombre}" eliminado con éxito!`));

        // Error Case
        const moduleToDeleteAgain = { _id: 'mDel456', nombre: 'Another Module To Delete', themes: [] };
        const lpDataForError = { ...mockLearningPathBase, modules: [moduleToDeleteAgain] };
        renderManageLearningPathPage(undefined, lpDataForError); // Re-render or set up new context for error
        await waitFor(() => expect(screen.getByText('Another Module To Delete')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: `DeleteModule-${moduleToDeleteAgain._id}` }));
        await waitFor(() => expect(screen.getByTestId('confirmation-modal-confirmar-eliminación-de-módulo')).toBeVisible());
        
        const errorMsg = "Deletion server error";
        axiosInstance.delete.mockRejectedValueOnce({ response: { data: { message: errorMsg } } });
        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`Error al intentar eliminar el módulo "${moduleToDeleteAgain.nombre}".`));
    });

    it('Update Module: shows specific success/error toasts', async () => {
        const moduleToUpdate = { _id: 'mUpd789', nombre: 'Module Original Name', descripcion: 'Old Desc' };
        const lpData = { ...mockLearningPathBase, modules: [moduleToUpdate] };
        renderManageLearningPathPage(undefined, lpData);
        await waitFor(() => expect(screen.getByText('Module Original Name')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: `EditModule-${moduleToUpdate._id}` }));
        await waitFor(() => expect(screen.getByTestId('edit-module-modal')).toBeVisible());
        
        // Success Case
        const updatedServerData = { ...moduleToUpdate, nombre: 'Updated Module Name For Toast' };
        axiosInstance.put.mockResolvedValueOnce({ data: updatedServerData });
        fireEvent.click(screen.getByRole('button', { name: 'SubmitUpdateModule' })); // From mock
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith(`Módulo "${updatedServerData.nombre}" actualizado con éxito!`));

        // Error Case
        fireEvent.click(screen.getByRole('button', { name: `EditModule-${moduleToUpdate._id}` })); // Re-open
        await waitFor(() => expect(screen.getByTestId('edit-module-modal')).toBeVisible());

        const errorMsg = "Update server error";
        axiosInstance.put.mockRejectedValueOnce({ response: { data: { message: errorMsg } } });
        fireEvent.click(screen.getByRole('button', { name: 'SubmitUpdateModule' })); // From mock, will use 'Updated Module Name'
        
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(`Error al intentar actualizar el módulo "Updated Module Name".`)));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining(errorMsg)));
    });

    // Test for CreateTheme (as an example for other CRUD not fully covered by optimistic tests)
    it('Create Theme: shows specific success/error toasts', async () => {
        const moduleForTheme = { _id: 'mWithThemes', nombre: 'Module For Themes', themes: [] };
        const lpData = { ...mockLearningPathBase, modules: [moduleForTheme] };
        renderManageLearningPathPage(undefined, lpData);
        await waitFor(() => expect(screen.getByText('Module For Themes')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', {name: `CreateThemeForModule-${moduleForTheme._id}`}));
        await waitFor(() => expect(screen.getByTestId('create-theme-modal')).toBeVisible());

        // Success
        const newThemeData = { nombre: 'New Theme Name', descripcion: 'Desc' };
        const serverTheme = { ...newThemeData, _id: 'tNew' };
        axiosInstance.post.mockResolvedValueOnce({ data: serverTheme });
        fireEvent.click(screen.getByRole('button', {name: 'SubmitNewTheme'})); // From mock modal
        await waitFor(() => screen.getByTestId('confirmation-modal-confirmar-creación-de-tema'));
        fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith(`Tema "${serverTheme.nombre}" creado con éxito!`));

        // Error
        fireEvent.click(screen.getByRole('button', {name: `CreateThemeForModule-${moduleForTheme._id}`}));
        await waitFor(() => expect(screen.getByTestId('create-theme-modal')).toBeVisible());
        axiosInstance.post.mockRejectedValueOnce({response: {data: {message: "Theme creation failed"}}});
        fireEvent.click(screen.getByRole('button', {name: 'SubmitNewTheme'}));
        await waitFor(() => screen.getByTestId('confirmation-modal-confirmar-creación-de-tema'));
        fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith(`Error al crear tema "New Theme Name": Theme creation failed`));
    });
  });
});
