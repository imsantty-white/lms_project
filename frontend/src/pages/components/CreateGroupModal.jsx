// src/components/CreateGroupModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Typography,
  Box
} from '@mui/material';
import { toast } from 'react-toastify';

// Nota: Este modal solo se encarga de mostrar el formulario y manejar su estado interno.
// La lógica de envío al backend y el manejo del diálogo de confirmación previa
// se manejarán en el componente padre (TeacherGroupsPage).

function CreateGroupModal({ open, onClose, onSubmit, isCreating }) {
  // Estados del formulario para crear un grupo
  const [nombre, setNombre] = useState('');
  const [codigoAcceso, setCodigoAcceso] = useState(''); // Asumiendo que el docente puede ingresarlo
  const [description, setDescription] = useState(''); // Campo de descripción opcional


  // Restablecer formulario cuando el modal se abre
  useEffect(() => {
      if (open) {
          setNombre('');
          setCodigoAcceso('');
          setDescription('');
      }
  }, [open]);


  // Maneja la presentación del formulario (llama a onSubmit del padre)
  const handleFormSubmit = (event) => {
    event.preventDefault();

    // Validaciones frontend (simples)
    if (!nombre.trim()) {
      toast.warning('El nombre del grupo es obligatorio.');
      return;
    }

    // Si el código de acceso es algo que el docente debe ingresar y es obligatorio
    // if (!codigoAcceso.trim()) {
    //     toast.warning('El código de acceso del grupo es obligatorio.');
    //     return;
    // }


    // Prepara los datos para pasar al componente padre
    const newGroupData = {
        nombre: nombre.trim(),
        codigo_acceso: codigoAcceso.trim(), // O puedes omitirlo si el backend lo genera
        description: description?.trim() || '', // La descripción es opcional
    };

    // Llama a la función onSubmit proporcionada por el padre
    onSubmit(newGroupData);
  };


  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="create-group-dialog-title">
      <DialogTitle id="create-group-dialog-title">Crear Nuevo Grupo</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} component="form" onSubmit={handleFormSubmit} id="create-group-form">
          {/* Campo Nombre del Grupo */}
          <TextField
            label="Nombre del Grupo"
            variant="outlined"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            fullWidth
            required
            disabled={isCreating}
          />
            {/* Campo Código de Acceso (si el docente lo ingresa) */}
          <TextField
            label="Código de Acceso" // O "Código de Invitación"
            variant="outlined"
            value={codigoAcceso}
            onChange={(e) => setCodigoAcceso(e.target.value)}
            fullWidth
            // required={true} // Hazlo obligatorio si el docente debe ingresarlo
            disabled={isCreating}
             helperText="Este código lo usarán los estudiantes para unirse al grupo."
          />
          {/* Campo Descripción (Opcional) */}
          <TextField
            label="Descripción (Opcional)"
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
             type="submit" // Tipo submit para que dispare handleFormSubmit del Stack
             form="create-group-form" // Asociar al formulario por su id
             variant="contained"
             color="primary"
             disabled={
                 isCreating ||
                 !nombre.trim() // || (Código si es obligatorio)
             }
             endIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : null}
         >
             Crear
         </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateGroupModal;