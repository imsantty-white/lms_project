// src/components/CreateThemeModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  CircularProgress
} from '@mui/material';
import { toast } from 'react-toastify';

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
  const handleFormSubmit = (event) => {
      event.preventDefault();

      // Validación frontend: nombre obligatorio
      if (!nombre.trim()) {
          toast.warning('El nombre del tema es obligatorio.');
          return;
      }

      // Prepara los datos para pasar al componente padre
      const newThemeData = {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || '', // Descripción es opcional
          // El module_id se añadirá en el componente padre (ManageLearningPathPage)
          // El orden se calculará en el backend
      };

      // Llama a la función onSubmit proporcionada por el padre
      onSubmit(newThemeData);
  };

  return (
      <Dialog open={open} onClose={onClose} aria-labelledby="create-theme-dialog-title">
          <DialogTitle id="create-theme-dialog-title">Crear Nuevo Tema</DialogTitle>
          <DialogContent dividers>
              <Stack spacing={2} component="form" onSubmit={handleFormSubmit} id="create-theme-form">
                  {/* Campo Nombre del Tema */}
                  <TextField
                      label="Nombre del Tema"
                      variant="outlined"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      fullWidth
                      required
                      disabled={isCreating}
                  />
                  {/* Campo Descripción (Opcional) */}
                  <TextField
                      label="Descripción (Opcional)"
                      variant="outlined"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      fullWidth
                      disabled={isCreating}
                      multiline
                      rows={2}
                  />
              </Stack>
          </DialogContent>
          <DialogActions>
              <Button onClick={onClose} disabled={isCreating}>Cancelar</Button>
              <Button
                  type="submit"
                  form="create-theme-form"
                  variant="contained"
                  color="primary"
                  disabled={isCreating || !nombre.trim()}
                  endIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : null}
              >
                  Crear
              </Button>
          </DialogActions>
      </Dialog>
  );
}

export default CreateThemeModal;