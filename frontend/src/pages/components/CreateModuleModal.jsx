// src/components/CreateModuleModal.jsx
import React, { useState, useEffect } from 'react';
import { TextField, Stack } from '@mui/material';
import { toast } from 'react-toastify';
import GenericFormModal from '../../components/GenericFormModal'; // Ajusta la ruta según tu estructura

function CreateModuleModal({ open, onClose, onSubmit, isCreating, moduleToEdit = null }) { // Added moduleToEdit prop
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (open) {
      if (moduleToEdit) {
        setNombre(moduleToEdit.nombre || '');
        setDescripcion(moduleToEdit.descripcion || '');
      } else {
        setNombre('');
        setDescripcion('');
      }
    }
  }, [open, moduleToEdit]);

  const handleInternalSubmit = () => {
    if (!nombre.trim()) {
      toast.warning('El nombre del módulo es obligatorio.');
      return;
    }
    const moduleData = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
    };

    if (moduleToEdit) {
      onSubmit({ _id: moduleToEdit._id, ...moduleData }); // Include _id for editing
    } else {
      onSubmit(moduleData); // For creating
    }
  };

  const isEditMode = Boolean(moduleToEdit);
  const modalTitle = isEditMode ? "Editar Módulo" : "Crear Nuevo Módulo";
  const submitButtonText = isEditMode ? "Guardar Cambios" : "Crear Módulo";
  // The prop `isCreating` can be interpreted as `isProcessing` for both create/edit.
  // `GenericFormModal` uses `isSubmitting`.

  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title={modalTitle}
      onSubmit={handleInternalSubmit}
      isSubmitting={isCreating} // Prop name on GenericFormModal is isSubmitting
      submitText={submitButtonText}
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2,
        bgcolor: 'primary.light',
        color: 'primary.contrastText'
      }}
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