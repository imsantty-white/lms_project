import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField, // <-- Import TextField
} from '@mui/material';

// Componente de Modal de Confirmación reutilizable
// Añadimos props para texto de botones personalizable y campo de entrada opcional
const ConfirmationModal = React.memo(({
  open,
  onClose,
  onConfirm,
  title,
  message,
  cancelText = 'No', // <-- Texto por defecto "No"
  confirmText = 'Sí',  // <-- Texto por defecto "Sí"
  showInput = false, // <-- Prop para mostrar el campo de entrada
  inputLabel = '', // <-- Etiqueta para el campo de entrada
  inputValue = '', // <-- Valor del campo de entrada (controlado desde fuera)
  onInputChange, // <-- Manejador para cambios en el campo de entrada
}) => {
  // Estado interno para el valor del input si no se quiere controlar totalmente desde fuera
  // Sin embargo, para el caso de uso de "tipear nombre", es mejor que sea controlado.
  // const [internalInputValue, setInternalInputValue] = React.useState('');

  // React.useEffect(() => {
  //   if (open) { // Reset input when modal opens if not controlled
  //     setInternalInputValue('');
  //   }
  // }, [open]);

  // const handleInputChange = (event) => {
  //   setInternalInputValue(event.target.value);
  //   if (onInputChange) {
  //     onInputChange(event); // Llama al manejador externo si existe
  //   }
  // };

  const handleConfirm = () => {
    if (showInput) {
      onConfirm(inputValue); // Pasa el valor del input a onConfirm
    } else {
      onConfirm(); // Comportamiento original
    }
  };

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
        <DialogContentText id="confirmation-dialog-description" sx={{ mb: showInput ? 2 : 0 }}>
          {message}
        </DialogContentText>
        {showInput && (
          <TextField
            autoFocus // Enfocar el campo de texto si se muestra
            margin="dense"
            id="confirmation-input"
            label={inputLabel}
            type="text"
            fullWidth
            variant="standard"
            value={inputValue}
            onChange={onInputChange} // Usa el manejador de cambio de prop
            sx={{ mt: 1 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          {cancelText}
        </Button>
        <Button onClick={handleConfirm} color="primary"> {/* Usar handleConfirm */}
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default ConfirmationModal;
