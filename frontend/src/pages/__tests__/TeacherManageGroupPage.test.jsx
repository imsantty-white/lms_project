// src/pages/__tests__/TeacherManageGroupPage.test.jsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Import userEvent
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';

import TeacherManageGroupPage from '../TeacherManageGroupPage';
import { AuthContext, axiosInstance } from '../../contexts/AuthContext'; // Assuming axiosInstance is exported here
import { ToastContainer, toast } from 'react-toastify';

// Mock react-toastify
vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    },
  };
});

// MSW Setup for API mocking
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const mockGroupId = 'group123';

const mockGroupDetails = {
  _id: mockGroupId,
  nombre: 'Test Group Alpha',
  codigo_acceso: 'ALPHA123',
  docente_id: 'teacher456',
};

const mockStudentMembershipsInitial = [
  {
    _id: 'membership1',
    usuario_id: { _id: 'student1', nombre: 'Alice', apellidos: 'Smith', email: 'alice@example.com' },
    grupo_id: mockGroupId,
    estado_solicitud: 'Pendiente',
  },
  {
    _id: 'membership2',
    usuario_id: { _id: 'student2', nombre: 'Bob', apellidos: 'Johnson', email: 'bob@example.com' },
    grupo_id: mockGroupId,
    estado_solicitud: 'Aprobado',
  },
  {
    _id: 'membership3',
    usuario_id: { _id: 'student3', nombre: 'Charlie', apellidos: 'Brown', email: 'charlie@example.com' },
    grupo_id: mockGroupId,
    estado_solicitud: 'Rechazado', // To test remove on non-pending
  },
];

const server = setupServer(
  // Mock GET group details
  http.get(`/api/groups/${mockGroupId}`, () => {
    return HttpResponse.json(mockGroupDetails);
  }),
  // Mock GET student memberships
  http.get(`/api/groups/${mockGroupId}/memberships`, () => {
    return HttpResponse.json(mockStudentMembershipsInitial);
  }),
  // Mock PUT for approve/reject
  http.put(`/api/groups/join-request/:membershipId/respond`, async ({ request, params }) => {
    const { membershipId } = params;
    const { responseStatus } = await request.json(); // 'Aprobado' or 'Rechazado'
    
    const originalMembership = mockStudentMembershipsInitial.find(m => m._id === membershipId);
    if (!originalMembership) return new HttpResponse(null, { status: 404 });

    const updatedMembership = {
      ...originalMembership,
      estado_solicitud: responseStatus,
    };
    return HttpResponse.json({ message: `Solicitud ${responseStatus.toLowerCase()} con éxito.`, membership: updatedMembership });
  }),
  // Mock DELETE for remove student
  http.delete(`/api/groups/${mockGroupId}/memberships/:membershipId`, ({ params }) => {
    const { membershipId } = params;
    console.log(`MSW: DELETE /api/groups/${mockGroupId}/memberships/${membershipId} called`);
    
    // Simulate finding and "removing" from a temporary list for more robust check if needed,
    // but for this test, just ensuring it doesn't error and returns success is key.
    const exists = mockStudentMembershipsInitial.find(m => m._id === membershipId); // Use find to get the item
    if (!exists) {
      console.error(`MSW: Membership ID ${membershipId} not found in mockStudentMembershipsInitial for DELETE.`);
      return new HttpResponse(JSON.stringify({ message: "Membership not found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    // To make it more realistic, you could filter mockStudentMembershipsInitial here if other tests depend on its state.
    // For now, just return success.
    return HttpResponse.json({ message: 'Estudiante removido con éxito.' }, { status: 200 });
  })
);

// Mock AuthContext
const mockUser = {
  _id: 'teacher456',
  userType: 'Docente',
  nombre: 'Dr. Test',
};

const authContextValue = {
  user: mockUser,
  isAuthenticated: true,
  isAuthInitialized: true,
  axiosInstance: axiosInstance, // using the real one, but msw intercepts calls
};

// Helper function to render with providers
const renderWithProviders = (ui, { route = `/teacher/groups/${mockGroupId}/manage`, path = '/teacher/groups/:groupId/manage' } = {}) => {
  window.history.pushState({}, 'Test page', route);

  return render(
    <AuthContext.Provider value={authContextValue}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
        <ToastContainer />
      </MemoryRouter>
    </AuthContext.Provider>
  );
};


describe('TeacherManageGroupPage', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks(); // Clear all Vitest mocks
  });
  afterAll(() => server.close());

  test('renders group details and student list correctly', async () => {
    renderWithProviders(<TeacherManageGroupPage />);

    expect(await screen.findByText(/Gestión del Grupo: Test Group Alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/Código de Acceso: ALPHA123/i)).toBeInTheDocument();
    
    // Check for student names
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();

    // Check for "Aprobar" and "Rechazar" buttons for Alice (Pendiente)
    const aliceRow = screen.getByText('Alice Smith').closest('tr');
    expect(aliceRow).not.toBeNull();
    expect(within(aliceRow).getByRole('button', { name: /aprobar/i })).toBeInTheDocument();
    expect(within(aliceRow).getByRole('button', { name: /rechazar/i })).toBeInTheDocument();
  });

  describe('Approve/Reject Functionality', () => {
    test('can approve a pending student', async () => {
      renderWithProviders(<TeacherManageGroupPage />);
      
      const approveButton = await screen.findByRole('button', { name: /aprobar/i, exact: false }); // For Alice
      expect(approveButton).toBeInTheDocument();

      // eslint-disable-next-line testing-library/no-unnecessary-act
      await act(async () => {
        fireEvent.click(approveButton);
      });
      
      expect(await screen.findByText(/¿Estás seguro de que quieres aprobar esta solicitud?/i)).toBeInTheDocument();
      
      const confirmButtonInModal = screen.getByRole('button', { name: 'Sí' }); // Default confirm text
      
      // eslint-disable-next-line testing-library/no-unnecessary-act
      await act(async () => {
        fireEvent.click(confirmButtonInModal);
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Solicitud aprobado con éxito.');
      });
      
      // Re-query the row or elements within it after state change
      await waitFor(async () => {
        const aliceRowUpdated = (await screen.findByText('Alice Smith')).closest('tr');
        expect(within(aliceRowUpdated).getByText('Aprobado')).toBeInTheDocument();
        expect(within(aliceRowUpdated).queryByRole('button', { name: /aprobar/i })).not.toBeInTheDocument();
        expect(within(aliceRowUpdated).queryByRole('button', { name: /rechazar/i })).not.toBeInTheDocument();
        expect(within(aliceRowUpdated).getByRole('button', { name: /remover/i })).toBeInTheDocument();
      });
    });

    test('can reject a pending student', async () => {
        renderWithProviders(<TeacherManageGroupPage />);
        
        const rejectButton = await screen.findAllByRole('button', { name: /rechazar/i, exact: false }); 
        // Assuming Alice is the first one with "Pendiente" status and thus first "Rechazar" button
        expect(rejectButton[0]).toBeInTheDocument(); 
  
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
          fireEvent.click(rejectButton[0]);
        });
        
        expect(await screen.findByText(/¿Estás seguro de que quieres rechazar esta solicitud?/i)).toBeInTheDocument();
        
        const confirmButtonInModal = screen.getByRole('button', { name: 'Sí' });
        
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
          fireEvent.click(confirmButtonInModal);
        });
  
        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith('Solicitud rechazado con éxito.');
        });
        
        await waitFor(async () => {
          const aliceRowUpdated = (await screen.findByText('Alice Smith')).closest('tr');
          expect(within(aliceRowUpdated).getByText('Rechazado')).toBeInTheDocument();
          expect(within(aliceRowUpdated).queryByRole('button', { name: /aprobar/i })).not.toBeInTheDocument();
          expect(within(aliceRowUpdated).queryByRole('button', { name: /rechazar/i })).not.toBeInTheDocument();
          expect(within(aliceRowUpdated).getByRole('button', { name: /remover/i })).toBeInTheDocument();
        });
      });
  });

  describe('Remove Student Functionality', () => {
    test('opens modal with input for removing an approved student', async () => {
        renderWithProviders(<TeacherManageGroupPage />);
        // Bob is initially approved
        const bobRow = (await screen.findByText('Bob Johnson')).closest('tr');
        const removeButtonForBob = within(bobRow).getByRole('button', { name: /remover/i });

        fireEvent.click(removeButtonForBob);

        expect(await screen.findByText(/Para remover a Bob Johnson, por favor escribe su nombre completo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nombre completo del estudiante/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Confirmar Remoción/i })).toBeInTheDocument();
    });

    test('shows error if typed name does not match when removing student', async () => {
        renderWithProviders(<TeacherManageGroupPage />);
        const bobRow = (await screen.findByText('Bob Johnson')).closest('tr');
        const removeButtonForBob = within(bobRow).getByRole('button', { name: /remover/i });

        fireEvent.click(removeButtonForBob);
        await screen.findByText(/Para remover a Bob Johnson, por favor escribe su nombre completo/i);

        const nameInput = screen.getByLabelText(/Nombre completo del estudiante/i);
        fireEvent.change(nameInput, { target: { value: 'Incorrect Name' } });
        
        const confirmRemoveButton = screen.getByRole('button', { name: /Confirmar Remoción/i });
        fireEvent.click(confirmRemoveButton);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith('El nombre ingresado no coincide. No se ha removido al estudiante.');
        });
        // Modal should still be open, and student still in list
        expect(screen.getByText(/Para remover a Bob Johnson, por favor escribe su nombre completo/i)).toBeInTheDocument();
        expect(screen.getByText('Bob Johnson')).toBeInTheDocument(); 
    });

    test('successfully removes student if typed name matches', async () => {
        renderWithProviders(<TeacherManageGroupPage />);
        const bobRow = (await screen.findByText('Bob Johnson')).closest('tr');
        const removeButtonForBob = within(bobRow).getByRole('button', { name: /remover/i });
        
        // eslint-disable-next-line testing-library/no-unnecessary-act
        await act(async () => {
            fireEvent.click(removeButtonForBob);
        });
        
        await screen.findByText(/Para remover a Bob Johnson, por favor escribe su nombre completo/i);

        const nameInput = screen.getByLabelText(/Nombre completo del estudiante/i);
        // eslint-disable-next-line testing-library/no-unnecessary-act
        // await act(async () => { // userEvent.type handles act internally for changes it causes
        //     fireEvent.change(nameInput, { target: { value: 'Bob Johnson' } });
        // });
        await userEvent.clear(nameInput); // Clear the input first if it might have preset values
        await userEvent.type(nameInput, 'Bob Johnson');
        expect(nameInput).toHaveValue('Bob Johnson'); // Verify input value after typing
        
        const confirmRemoveButton = screen.getByRole('button', { name: /Confirmar Remoción/i });
        
        // Clear toast mock before this specific action to isolate its toast
        toast.success.mockClear();
        toast.error.mockClear(); // Also clear error toasts to be sure

        // eslint-disable-next-line testing-library/no-unnecessary-act
        // await act(async () => { // userEvent.click handles act internally
        //     fireEvent.click(confirmRemoveButton);
        // });
        await userEvent.click(confirmRemoveButton); // Use userEvent.click
        
        await waitFor(() => {
            // Check that no error toast was called for this action
            expect(toast.error).not.toHaveBeenCalled(); 
            expect(toast.success).toHaveBeenCalledWith('Bob Johnson ha sido removido del grupo.');
        }); 
        
        await waitFor(() => {
            expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
        });
        
        // Modal should be closed
        await waitFor(() => { // Ensure modal is closed after async operations
            expect(screen.queryByText(/Para remover a Bob Johnson, por favor escribe su nombre completo/i)).not.toBeInTheDocument();
        });
    });
  });
  
  describe('Student Profile Link', () => {
    test('renders student name as a link to their profile', async () => {
        renderWithProviders(<TeacherManageGroupPage />);
        
        const aliceNameLink = await screen.findByText('Alice Smith');
        expect(aliceNameLink).toBeInTheDocument();
        expect(aliceNameLink.closest('a')).toHaveAttribute('href', '/profile/student1');
        
        const bobNameLink = screen.getByText('Bob Johnson');
        expect(bobNameLink).toBeInTheDocument();
        expect(bobNameLink.closest('a')).toHaveAttribute('href', '/profile/student2');
    });
  });

});

// Need to import 'within' for querying within elements
import { within } from '@testing-library/react';
