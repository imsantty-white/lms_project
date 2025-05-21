import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

// Componente de Modal de Confirmación reutilizable
// Añadimos props para texto de botones personalizable
function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  cancelText = 'No', // <-- Texto por defecto "No"
  confirmText = 'Sí'  // <-- Texto por defecto "Sí"
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
    >
      <DialogTitle id="confirmation-dialog-title">
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="confirmation-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        {/* El botón de cancelar sigue usando onClose */}
        {/* Opcional: Si no necesitas un botón de cancelar, puedes añadir una condición */}
         {/* {cancelText && <Button onClick={onClose} color="secondary">{cancelText}</Button>} */}
        <Button onClick={onClose} color="secondary">
          {cancelText}
        </Button>
        {/* El botón de confirmar usa onConfirm */}
        <Button onClick={onConfirm} color="primary" autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ConfirmationModal;