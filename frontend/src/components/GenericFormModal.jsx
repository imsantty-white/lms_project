// frontend/src/components/GenericFormModal.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Box,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const GenericFormModal = React.memo(({
  open,
  onClose,
  title,
  children, // The actual form fields
  onSubmit, // Function to call when the primary action is triggered
  isSubmitting = false, // Boolean to show loading state on submit button
  submitText = "Guardar",
  cancelText = "Cancelar",
  maxWidth = "sm", // Default max width for the dialog
  fullWidth = true,
  dialogActionsSx,
  // Optional: for handling form submission directly if the form is simple
  // and doesn't need complex state management within the children
  // For more complex forms, children should manage their own state and call onSubmit
  // with the form data.
  // Example: <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>{children}</form>
}) => {

  const handleDialogClose = (event, reason) => {
    if (reason && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      // Prevent closing on backdrop click or escape key if isSubmitting
      if (isSubmitting) return;
    }
    if (onClose) {
      onClose(event, reason);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      // To prevent closing while submitting, could also disable EscapeKeyDown
      // disableEscapeKeyDown={isSubmitting}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={(e) => onClose(e, 'closeButtonClick')}
          disabled={isSubmitting}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Children will typically be the form fields */}
        {children}
      </DialogContent>
      <DialogActions sx={dialogActionsSx}>
        <Button onClick={(e) => onClose(e, 'cancelButtonClick')} color="secondary" disabled={isSubmitting}>
          {cancelText}
        </Button>
        {/* 
          The onSubmit prop for the modal itself is for the action button.
          If the children prop contains a <form>, that form should handle its own submission event (e.g., e.preventDefault())
          and then call the onSubmit function passed to GenericFormModal with the collected data.
        */}
        <Button
          onClick={onSubmit} // This onSubmit is the prop passed to GenericFormModal
          color="primary"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Guardando...' : submitText}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default GenericFormModal;
