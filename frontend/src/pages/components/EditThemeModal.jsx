// src/pages/components/EditThemeModal.jsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  Stack,
} from '@mui/material';
import GenericFormModal from '../../../components/GenericFormModal'; // Ajusta la ruta
import { toast } from 'react-toastify';

function EditThemeModal({ open, onClose, onSubmit, initialData, isSaving }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [orden, setOrden] = useState('');

  useEffect(() => {
    if (open && initialData) {
      setNombre(initialData.nombre || '');
      setDescripcion(initialData.descripcion || '');
      setOrden(initialData.orden !== undefined && initialData.orden !== null ? String(initialData.orden) : '');
    } else if (!open) {
      setNombre('');
      setDescripcion('');
      setOrden('');
    }
  }, [open, initialData]);

  const handleInternalSubmit = () => {
    if (!nombre.trim()) {
      toast.warning('El nombre del tema es obligatorio.');
      return; 
    }

    const updatedData = {
      _id: initialData?._id,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      orden: orden.trim() !== '' ? parseInt(orden.trim(), 10) : undefined,
    };
    onSubmit(updatedData);
  };

  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title="Editar Tema"
      onSubmit={handleInternalSubmit}
      isSubmitting={isSaving}
      submitText="Guardar Cambios"
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <TextField
          label="Nombre del Tema"
          fullWidth
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          disabled={isSaving}
          autoFocus
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
          InputProps={{ inputProps: { min: 0 } }}
        />
      </Stack>
    </GenericFormModal>
  );
}

export default EditThemeModal;