import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom'; // Needed for <Link>
import ProfileCompletionBanner from '../ProfileCompletionBanner';
import '@testing-library/jest-dom';

describe('ProfileCompletionBanner', () => {
  test('renders with correct message and button', () => {
    render(
      <Router>
        <ProfileCompletionBanner onDismiss={() => {}} />
      </Router>
    );

    expect(screen.getByText(/Your profile is incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/Complete it now to get the most out of our platform!/i)).toBeInTheDocument();

    const completeProfileButton = screen.getByRole('button', { name: /Complete Profile/i });
    expect(completeProfileButton).toBeInTheDocument();
    expect(completeProfileButton.closest('a')).toHaveAttribute('href', '/profile');
  });

  test('calls onDismiss and hides when close button is clicked', () => {
    const mockOnDismiss = vi.fn();
    render(
      <Router>
        <ProfileCompletionBanner onDismiss={mockOnDismiss} />
      </Router>
    );

    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    // The component itself handles its visibility state, so we check if it's removed from the DOM
    expect(screen.queryByText(/Your profile is incomplete/i)).not.toBeInTheDocument();
  });

  test('hides when "Complete Profile" button is clicked', () => {
    const mockOnDismiss = vi.fn(); // onDismiss might still be called depending on implementation
    render(
      <Router>
        <ProfileCompletionBanner onDismiss={mockOnDismiss} />
      </Router>
    );

    const completeProfileButton = screen.getByRole('button', { name: /Complete Profile/i });
    fireEvent.click(completeProfileButton);

    // The component itself handles its visibility state
    expect(screen.queryByText(/Your profile is incomplete/i)).not.toBeInTheDocument();
  });
});
