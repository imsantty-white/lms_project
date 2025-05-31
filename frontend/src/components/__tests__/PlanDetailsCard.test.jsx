// frontend/src/components/__tests__/PlanDetailsCard.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthContext } from '../../contexts/AuthContext'; // Adjust path
import PlanDetailsCard from '../PlanDetailsCard'; // Adjust path

const mockUserDocenteWithPlan = {
  userType: 'Docente',
  plan: {
    name: 'Premium',
    isActive: true,
    price: 50,
    duration: 'monthly',
    limits: {
      maxGroups: 10,
      maxStudentsPerGroup: 50,
      maxRoutes: 10,
      maxResources: 100,
      maxActivities: 100,
    },
  },
  subscriptionEndDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), // Expires in 30 days
  usage: {
    groupsCreated: 5,
    resourcesGenerated: 20,
    activitiesGenerated: 15,
  },
};

const mockUserDocenteNoPlan = {
  userType: 'Docente',
  plan: null,
};

const mockUserEstudiante = {
  userType: 'Estudiante',
};

describe('PlanDetailsCard Component', () => {
  const renderWithAuth = (ui, { providerProps, ...renderOptions }) => {
    return render(
      <AuthContext.Provider value={providerProps}>{ui}</AuthContext.Provider>,
      renderOptions
    );
  };

  it('renders plan details for a teacher with a plan', () => {
    const providerProps = { user: mockUserDocenteWithPlan };
    renderWithAuth(<PlanDetailsCard />, { providerProps });

    expect(screen.getByText('Detalles de tu Plan Actual')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText(/Activo/i)).toBeInTheDocument(); // Chip label
    expect(screen.getByText(/Precio:/i)).toBeInTheDocument();
    expect(screen.getByText(/\$50/i)).toBeInTheDocument();
    expect(screen.getByText(/Duración:/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly/i)).toBeInTheDocument(); // Capitalized by component
    expect(screen.getByText(/Fecha de Vencimiento:/i)).toBeInTheDocument();

    expect(screen.getByText(/Grupos: 10/i)).toBeInTheDocument();
    expect(screen.getByText(/Usado: 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Recursos: 100/i)).toBeInTheDocument();
    expect(screen.getByText(/Usado: 20/i)).toBeInTheDocument();
  });

  it('does not render if user is not a teacher', () => {
    const providerProps = { user: mockUserEstudiante };
    const { container } = renderWithAuth(<PlanDetailsCard />, { providerProps });
    expect(container.firstChild).toBeNull();
  });

  it('does not render if teacher has no plan details', () => {
    const providerProps = { user: mockUserDocenteNoPlan };
    const { container } = renderWithAuth(<PlanDetailsCard />, { providerProps });
    expect(container.firstChild).toBeNull();
  });

  // Add more tests for different plan states (e.g., indefinite duration, inactive plan)
});
