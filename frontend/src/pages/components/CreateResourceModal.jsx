// src/components/CreateResourceModal.jsx
import React, { useState, useEffect } from 'react';
import {
  TextField,
  Stack,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { toast } from 'react-toastify';
import GenericFormModal from '../../../components/GenericFormModal'; // Ajusta la ruta

function CreateResourceModal({ open, onClose, onSubmit, isCreating }) {
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');

  const resourceTypes = ['Contenido', 'Enlace', 'Video-Enlace'];

  useEffect(() => {
    if (open) {
      setType('');
      setTitle('');
      setDescription('');
      setContentBody('');
      setLinkUrl('');
      setVideoUrl('');
    }
  }, [open]);

  const handleTypeChange = (event) => {
    const selectedType = event.target.value;
    setType(selectedType);
    setContentBody('');
    setLinkUrl('');
    setVideoUrl('');
  };

  const handleInternalSubmit = () => {
    if (!type || !title.trim()) {
      toast.warning('Tipo y título del recurso son obligatorios.');
      return;
    }
    if (type === 'Contenido' && (!contentBody || contentBody.trim() === '')) {
      toast.warning('El contenido del recurso es obligatorio para este tipo.');
      return;
    }
    if (type === 'Enlace' && (!linkUrl || linkUrl.trim() === '')) {
      toast.warning('La URL del enlace es obligatoria para este tipo.');
      return;
    }
    if (type === 'Video-Enlace' && (!videoUrl || videoUrl.trim() === '')) {
      toast.warning('La URL del video es obligatoria para este tipo.');
      return;
    }

    const newResourceData = {
      type,
      title: title.trim(),
      description: description?.trim() || '',
      ...(type === 'Contenido' && { content_body: contentBody.trim() }),
      ...(type === 'Enlace' && { link_url: linkUrl.trim() }),
      ...(type === 'Video-Enlace' && { video_url: videoUrl.trim() }),
    };
    onSubmit(newResourceData);
  };
  
  const isSubmitDisabled = () => {
    if (isCreating || !type || !title.trim()) return true;
    if (type === 'Contenido' && (!contentBody || contentBody.trim() === '')) return true;
    if (type === 'Enlace' && (!linkUrl || linkUrl.trim() === '')) return true;
    if (type === 'Video-Enlace' && (!videoUrl || videoUrl.trim() === '')) return true;
    return false;
  };

  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title="Crear Nuevo Recurso"
      onSubmit={handleInternalSubmit}
      isSubmitting={isCreating}
      submitText="Crear"
      // Pass the custom disabled logic for the submit button
      // The GenericFormModal itself doesn't know about the form's internal validation
      // This could be a prop like `isSubmitButtonDisabled`
      // For now, we'll rely on the parent component disabling it if `isCreating` is true,
      // and the internal validation of `handleInternalSubmit`
      // A more robust GenericFormModal might accept a `validateForm` prop.
      // The GenericFormModal's own submit button is disabled if `isSubmitting` is true.
      // We need to ensure the `onSubmit` prop in GenericFormModal is only called if our internal validation passes.
      // The current GenericFormModal calls its `onSubmit` prop directly.
      // One way is that `handleInternalSubmit` does the validation and only calls the parent `onSubmit` if valid.
      // The submit button in `GenericFormModal` can have its own disabled state based on `isSubmitting`
      // and potentially another prop if we want to pass external disable logic.
      // For simplicity, `GenericFormModal`'s `isSubmitting` prop handles the loading state.
      // The actual validation logic remains within `handleInternalSubmit`.
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <FormControl fullWidth variant="outlined" required disabled={isCreating}>
          <InputLabel id="resource-type-label">Tipo de Recurso</InputLabel>
          <Select
            labelId="resource-type-label"
            value={type}
            onChange={handleTypeChange}
            label="Tipo de Recurso"
            autoFocus
          >
            <MenuItem value=""><em>Selecciona un tipo</em></MenuItem>
            {resourceTypes.map((resourceTypeOption) => (
              <MenuItem key={resourceTypeOption} value={resourceTypeOption}>{resourceTypeOption}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Título del Recurso"
          variant="outlined"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
          required
          disabled={isCreating}
        />
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
        {type === 'Contenido' && (
          <TextField
            label="Contenido del Recurso"
            variant="outlined"
            value={contentBody}
            onChange={(e) => setContentBody(e.target.value)}
            fullWidth
            multiline
            rows={4}
            required
            disabled={isCreating}
          />
        )}
        {type === 'Enlace' && (
          <TextField
            label="URL del Enlace"
            variant="outlined"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            fullWidth
            required
            disabled={isCreating}
            type="url"
          />
        )}
        {type === 'Video-Enlace' && (
          <TextField
            label="URL del Video"
            variant="outlined"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            fullWidth
            required
            disabled={isCreating}
            type="url"
          />
        )}
      </Stack>
    </GenericFormModal>
  );
}

export default CreateResourceModal;