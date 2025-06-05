// src/components/CreateThemeModal.jsx
import React, { useState, useEffect } from 'react';
import {
  TextField,
  Stack,
  // Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress removed
} from '@mui/material';
import { toast } from 'react-toastify';
import GenericFormModal from '../../components/GenericFormModal'; // Adjusted path

// Este modal pide el nombre y descripción de un nuevo Tema.

function CreateThemeModal({ open, onClose, onSubmit, isCreating }) {
  // Estados del formulario para crear un Tema
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Restablecer formulario cuando el modal se abre
  useEffect(() => {
      if (open) {
          setNombre('');
          setDescripcion('');
      }
  }, [open]);

  // Maneja la presentación del formulario (llama a onSubmit del padre)
  // Renamed to handleInternalSubmit to avoid confusion with onSubmit prop for GenericFormModal
  const handleInternalSubmit = () => {
      // event.preventDefault() is not strictly needed if not a direct form onSubmit event handler
      // but good practice if it were. GenericFormModal's button is onClick.

      // Validación frontend: nombre obligatorio
      if (!nombre.trim()) {
          toast.warning('El nombre del tema es obligatorio.');
          return;
      }

      // Prepara los datos para pasar al componente padre
      const newThemeData = {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || '', // Descripción es opcional
      };

      // Llama a la función onSubmit proporcionada por el padre
      onSubmit(newThemeData);
  };

  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title="Crear Nuevo Tema"
      onSubmit={handleInternalSubmit} // Pass the internal submit handler
      isSubmitting={isCreating}
      submitText="Crear Tema" // Updated text for clarity
      // The sx prop for title is handled by GenericFormModal if needed, or could be passed via titleProps
    >
      <Stack spacing={2} sx={{pt: 1}}> {/* Removed component="form" and id, as GenericFormModal handles submission trigger */}
          {/* Campo Nombre del Tema */}
          <TextField
              label="Nombre del Tema"
              variant="outlined"
              // color="primary.light" // Removed non-standard color prop
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              fullWidth
              required
              disabled={isCreating}
              autoFocus
          />
          {/* Campo Descripción (Opcional) */}
          <TextField
              label="Descripción (Opcional)"
              variant="outlined"
              // color="primary.light" // Removed non-standard color prop
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              fullWidth
              disabled={isCreating}
              multiline
              rows={3} // Standardized rows
          />
      </Stack>
    </GenericFormModal>
  );
}

export default CreateThemeModal;