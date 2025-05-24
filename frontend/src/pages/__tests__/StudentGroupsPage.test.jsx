import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, axiosInstance } from '../../contexts/AuthContext';
import StudentGroupsPage from '../StudentGroupsPage';
import { toast } from 'react-toastify';
import { grey } from '@mui/material/colors';


// Mock axiosInstance
jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  axiosInstance: {
    get: jest.fn(),
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

const mockUserStudent = {
  _id: 'studentTestId123',
  userType: 'Estudiante',
  nombre: 'Test Student',
};

const renderStudentGroupsPage = (authContextValue = { user: mockUserStudent, isAuthenticated: true, isAuthInitialized: true }) => {
  return render(
    <AuthContext.Provider value={authContextValue}>
      <MemoryRouter> {/* Added MemoryRouter as Link might be used indirectly or in future */}
        <StudentGroupsPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('StudentGroupsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axiosInstance.get.mockReset();
  });

  describe('Display of Archived Group Indicator', () => {
    const mockGroups = [
      {
        _id: 'group1',
        nombre: 'Active Group Alpha',
        activo: true, // This field is from the populated group_id in getMyMembershipsWithStatus
        docente: { nombre: 'Teacher', apellidos: 'One' },
        student_status: 'Aprobado',
      },
      {
        _id: 'group2',
        nombre: 'Archived Group Beta',
        activo: false, // This group is archived
        docente: { nombre: 'Teacher', apellidos: 'Two' },
        student_status: 'Aprobado',
      },
      {
        _id: 'group3',
        nombre: 'Active Group Gamma',
        activo: true,
        docente: { nombre: 'Teacher', apellidos: 'Three' },
        student_status: 'Pendiente', // Different status for variety
      },
    ];

    it('correctly displays indicators for active and archived groups', async () => {
      axiosInstance.get.mockResolvedValueOnce({ data: mockGroups });
      renderStudentGroupsPage();

      await waitFor(() => {
        expect(axiosInstance.get).toHaveBeenCalledWith('/api/groups/my-memberships');
      });

      // Active Group Alpha
      const activeGroupAlpha = screen.getByText('Active Group Alpha');
      expect(activeGroupAlpha).toBeInTheDocument();
      expect(activeGroupAlpha.textContent).not.toContain('(Archivado)');
      // Check its Paper container for default background
      const activeGroupAlphaPaper = activeGroupAlpha.closest('div.MuiPaper-root'); // Find the Paper parent
      expect(activeGroupAlphaPaper).toHaveStyle(`background-color: transparent`);


      // Archived Group Beta
      const archivedGroupBeta = screen.getByText(/Archived Group Beta/); // Use regex to find it even with the label
      expect(archivedGroupBeta).toBeInTheDocument();
      expect(archivedGroupBeta.textContent).toContain('Archived Group Beta (Archivado)');
      // Check its Paper container for grey background
      const archivedGroupBetaPaper = archivedGroupBeta.closest('div.MuiPaper-root');
      // Note: The exact color value might need adjustment based on MUI's theme and how grey[100] is processed.
      // For simplicity, we'll check for a non-transparent background if direct color match is tricky.
      // Or ensure the color is exactly what grey[100] translates to.
      // For Jest to match exact color, it might need to be in rgb or hex.
      // grey[100] is '#f5f5f5'
      expect(archivedGroupBetaPaper).toHaveStyle(`background-color: ${grey[100]}`);


      // Active Group Gamma
      const activeGroupGamma = screen.getByText('Active Group Gamma');
      expect(activeGroupGamma).toBeInTheDocument();
      expect(activeGroupGamma.textContent).not.toContain('(Archivado)');
      const activeGroupGammaPaper = activeGroupGamma.closest('div.MuiPaper-root');
      expect(activeGroupGammaPaper).toHaveStyle(`background-color: transparent`);
      
      expect(toast.success).toHaveBeenCalledWith('Tus grupos cargados con éxito.');
    });
  });
});
