// src/pages/components/EditThemeModal.jsx

import React, { useState, useEffect } from 'react';
import {
  // Cambiar importación de Modal a Dialog y sus partes
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box, // Mantenemos Box si es necesario para sx, pero a menudo Stack es suficiente dentro del DialogContent
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress // Añadido si isSaving usa un icono de carga
} from '@mui/material';

// Ya no necesitamos este estilo ya que Dialog maneja el posicionamiento
// const style = { ... };

// Componente EditThemeModal usando Dialog
// Props: (se mantienen igual)
// - open: booleano para controlar si el modal está abierto
// - onClose: función para cerrar el modal
// - onSubmit: función a llamar al enviar el formulario con los datos actualizados
// - initialData: objeto con los datos actuales del tema a editar ({ _id, nombre, descripcion, orden })
// - isSaving: booleano para indicar si se está guardando (inhabilita el botón)
function EditThemeModal({ open, onClose, onSubmit, initialData, isSaving }) {
  // Usamos estados locales para el formulario, inicializados con los datos recibidos
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [orden, setOrden] = useState(''); // Usamos string para el input

  // Efecto para cargar los datos iniciales cuando el modal se abre o cambia initialData
  useEffect(() => {
    if (open && initialData) {
      setNombre(initialData.nombre || '');
      setDescripcion(initialData.descripcion || '');
      // Convertimos el número de orden a string para el TextField
      setOrden(initialData.orden !== undefined && initialData.orden !== null ? String(initialData.orden) : '');
    } else {
        // Limpiar estados si el modal se cierra o initialData es nulo
        setNombre('');
        setDescripcion('');
        setOrden('');
    }
  }, [open, initialData]); // Dependencias: se ejecuta al abrir/cerrar o si los datos iniciales cambian

  // Maneja el envío del formulario
  const handleSubmit = (event) => {
    event.preventDefault();

    // Validación básica en el frontend (puedes añadir más)
    if (!nombre.trim()) {
        // Puedes añadir lógica de validación visual aquí si es necesario
        // setErrors({ nombre: 'El nombre es obligatorio' });
        // return; // Si el nombre es estrictamente obligatorio
    }


    const updatedData = {
      // Incluimos el ID del tema para que el componente padre sepa cuál actualizar
      _id: initialData?._id, // Asegúrate de pasar el ID
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      // Convertimos el string de orden a número. Si está vacío, enviamos undefined.
      orden: orden.trim() !== '' ? parseInt(orden.trim(), 10) : undefined,
    };

    // Llama a la función onSubmit pasada por el padre con los datos actualizados
    onSubmit(updatedData);
    // El padre se encargará de cerrar el modal después del submit si es exitoso.
  };

  return (
    <Dialog
      open={open}
      onClose={onClose} // onClose del padre, que puede manejar la razón del cierre
      aria-labelledby="edit-theme-modal-title"
      fullWidth
      maxWidth="sm" // Tamaño típico para formularios modales
    >
      {/* Título del modal */}
      <DialogTitle id="edit-theme-modal-title">
        Editar Tema
      </DialogTitle>

      {/* Contenido principal del formulario */}
      {/* El formulario en sí */}
      <DialogContent dividers> {/* dividers añade una línea divisoria */}
        <Stack spacing={2} component="form" onSubmit={handleSubmit}>
          <TextField
            label="Nombre del Tema"
            fullWidth
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            disabled={isSaving}
          />
          <TextField
            label="Descripción (Opcional)"
            fullWidth
            multiline
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            disabled={isSaving}
          />
          <TextField
            label="Orden (Opcional, número)"
            fullWidth
            type="number"
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            disabled={isSaving}
            InputProps={{ inputProps: { min: 0 } }} // Asegura que el orden sea no negativo si aplica
          />
             {/* Botón de submit dentro del formulario */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth // Opcional, depende del diseño
            disabled={isSaving || !nombre.trim()} // Deshabilita si se está guardando o nombre está vacío (si es requerido)
             // endIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null} // Opcional: icono de carga en el botón
            sx={{ mt: 2 }} // Añade margen superior
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Stack>
      </DialogContent>

      {/* Acciones del modal (botones Cancelar/Guardar) */}
      {/* NOTA: El botón de submit se movió DENTRO del DialogContent para que sea parte del Stack del formulario.
          Se deja un botón Cancelar aquí si se prefiere tenerlo separado del stack del formulario. */}
      <DialogActions>
        <Button onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        {/* Si prefieres que el botón Guardar esté en DialogActions, muévelo aquí y quita el type="submit" del botón.
            El Stack del formulario necesitaría un ref y un onSubmit={handleFormSubmit} en el DialogActions */}
      </DialogActions>
    </Dialog>
  );
}

export default EditThemeModal;