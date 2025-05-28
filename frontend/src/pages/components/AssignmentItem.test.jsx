import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentItem from './AssignmentItem'; // Adjust path as necessary
import '@testing-library/jest-dom';

// Mock data and functions
const mockAssignmentStatusOptions = [
  { value: 'Draft', label: 'Borrador' },
  { value: 'Open', label: 'Abierto' },
  { value: 'Closed', label: 'Cerrado' },
];

const mockOnEditAssignment = jest.fn();
const mockOnDeleteAssignment = jest.fn();
const mockOnStatusChange = jest.fn();

const defaultProps = {
  assignment: {
    _id: '1',
    type: 'Activity',
    activity_id: { title: 'Test Activity', type: 'Quiz' },
    status: 'Open',
    fecha_inicio: new Date().toISOString(),
    fecha_fin: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days in the future
    puntos_maximos: 100,
    intentos_permitidos: 3,
    tiempo_limite: 60,
  },
  themeName: 'Test Theme',
  onEditAssignment: mockOnEditAssignment,
  onDeleteAssignment: mockOnDeleteAssignment,
  onStatusChange: mockOnStatusChange,
  ASSIGNMENT_STATUS_OPTIONS: mockAssignmentStatusOptions,
  updatingAssignmentStatus: null,
  isAnyOperationInProgress: false,
};

describe('AssignmentItem Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Correct Status Display (Chip)', () => {
    test('renders "Abierto" Chip with success color for "Open" status', () => {
      render(<AssignmentItem {...defaultProps} assignment={{ ...defaultProps.assignment, status: 'Open' }} />);
      const statusChip = screen.getByText('Abierto');
      expect(statusChip).toBeInTheDocument();
      // MUI Chip color 'success' adds a class like MuiChip-colorSuccess
      // Testing exact class name can be brittle, better to check for text and visual cues if possible,
      // but for now, we'll trust MUI applies the color. We primarily check the label.
      // A more robust test might involve snapshot testing or checking computed styles if critical.
      expect(statusChip).toHaveClass('MuiChip-filled'); // Default variant is filled
    });

    test('renders "Cerrado" Chip with error color for "Closed" status', () => {
      render(<AssignmentItem {...defaultProps} assignment={{ ...defaultProps.assignment, status: 'Closed' }} />);
      const statusChip = screen.getByText('Cerrado');
      expect(statusChip).toBeInTheDocument();
      expect(statusChip).toHaveClass('MuiChip-filled');
    });

    test('renders "Borrador" Chip with default color for "Draft" status', () => {
      render(<AssignmentItem {...defaultProps} assignment={{ ...defaultProps.assignment, status: 'Draft' }} />);
      const statusChip = screen.getByText('Borrador');
      expect(statusChip).toBeInTheDocument();
      expect(statusChip).toHaveClass('MuiChip-filled');
    });
  });

  describe('Auto-Closed Behavior', () => {
    const pastDate = new Date(Date.now() - 86400000 * 2).toISOString(); // 2 days in the past
    const autoClosedAssignment = {
      ...defaultProps.assignment,
      status: 'Closed',
      fecha_fin: pastDate,
    };

    test('Select is disabled and Tooltip is shown for auto-closed assignment', async () => {
      render(<AssignmentItem {...defaultProps} assignment={autoClosedAssignment} />);
      
      const statusSelect = screen.getByLabelText('Estado');
      expect(statusSelect).toBeDisabled();

      // MUI Tooltip is tricky to test as it's often in a Portal and appears on hover/focus.
      // We need to interact with the element that triggers the tooltip.
      // The Tooltip wraps a span which wraps the FormControl.
      const formControlWrapper = statusSelect.closest('span'); // The span wrapper for Tooltip
      expect(formControlWrapper).toBeInTheDocument();

      await userEvent.hover(formControlWrapper);
      
      const tooltipText = "Esta actividad fue cerrada automáticamente. Para reabrirla, por favor edita la asignación y extiende su fecha de finalización.";
      // Tooltip content might be identified by role='tooltip' or by its text content
      const tooltip = await screen.findByRole('tooltip'); // findByRole waits for element to appear
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent(tooltipText);

      // Clean up by unhovering
      await userEvent.unhover(formControlWrapper); 
    });
  });

  describe('Non-Auto-Closed Behavior', () => {
    test('Select is enabled for "Closed" assignment with future fecha_fin', () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString(); // 2 days in future
      render(
        <AssignmentItem
          {...defaultProps}
          assignment={{ ...defaultProps.assignment, status: 'Closed', fecha_fin: futureDate }}
        />
      );
      const statusSelect = screen.getByLabelText('Estado');
      expect(statusSelect).not.toBeDisabled();
    });

    test('Select is enabled for "Open" assignment', () => {
      render(<AssignmentItem {...defaultProps} assignment={{ ...defaultProps.assignment, status: 'Open' }} />);
      const statusSelect = screen.getByLabelText('Estado');
      expect(statusSelect).not.toBeDisabled();
    });

    test('Select is enabled for "Draft" assignment', () => {
        render(<AssignmentItem {...defaultProps} assignment={{ ...defaultProps.assignment, status: 'Draft' }} />);
        const statusSelect = screen.getByLabelText('Estado');
        expect(statusSelect).not.toBeDisabled();
      });

    test('Select is disabled if isAnyOperationInProgress is true', () => {
        render(<AssignmentItem {...defaultProps} isAnyOperationInProgress={true} />);
        const statusSelect = screen.getByLabelText('Estado');
        expect(statusSelect).toBeDisabled();
    });

    test('Select is disabled if updatingAssignmentStatus matches assignment._id', () => {
        render(<AssignmentItem {...defaultProps} updatingAssignmentStatus={defaultProps.assignment._id} />);
        // The component shows a CircularProgress instead of the Select in this case.
        // So, queryByLabelText should not find it.
        expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });
  });
});
