// src/components/CreateModuleModal.jsx
import React, { useState, useEffect } from 'react';
import { TextField, Stack } from '@mui/material';
import { toast } from 'react-toastify';
import GenericFormModal from '../../components/GenericFormModal'; // Ajusta la ruta según tu estructura

function CreateModuleModal({ open, onClose, onSubmit, isCreating }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (open) {
      setNombre('');
      setDescripcion('');
    }
  }, [open]);

  const handleInternalSubmit = () => { // Renombrado para evitar confusión con prop onSubmit
    if (!nombre.trim()) {
      toast.warning('El nombre del módulo es obligatorio.');
      return;
    }
    const newModuleData = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
    };
    onSubmit(newModuleData); // Llama al onSubmit del padre
  };

  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title="Crear Nuevo Módulo"
      onSubmit={handleInternalSubmit} // Pasa la función de submit interna
      isSubmitting={isCreating}
      submitText="Crear"
      // dialogActionsSx={{ justifyContent: 'space-between' }} // Ejemplo de personalización
    >
      <Stack spacing={2} sx={{ pt: 1 }}> {/* pt:1 para un pequeño padding top */}
        <TextField
          label="Nombre del Módulo"
          variant="outlined"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          fullWidth
          required
          disabled={isCreating}
          autoFocus // Enfocar este campo al abrir
        />
        <TextField
          label="Descripción (Opcional)"
          variant="outlined"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          fullWidth
          disabled={isCreating}
          multiline
          rows={3}
        />
      </Stack>
    </GenericFormModal>
  );
}

export default CreateModuleModal;