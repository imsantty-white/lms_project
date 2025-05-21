// src/components/CreateResourceModal.jsx
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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Typography,
  Box
} from '@mui/material';
import { toast } from 'react-toastify';

// Nota: Este modal solo se encarga de mostrar el formulario y manejar su estado interno.
// La lógica de envío al backend y el manejo del diálogo de confirmación previa
// se manejarán en el componente padre (TeacherContentBankPage).

function CreateResourceModal({ open, onClose, onSubmit, isCreating }) {
  // Estados del formulario para crear un recurso
  const [type, setType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentBody, setContentBody] = useState(''); // Para tipo 'Contenido'
  const [linkUrl, setLinkUrl] = useState(''); // Para tipo 'Enlace'
  const [videoUrl, setVideoUrl] = useState(''); // Para tipo 'Video-Enlace'

  // Tipos de recurso disponibles (debe coincidir con tu enum en el modelo backend)
  const resourceTypes = ['Contenido', 'Enlace', 'Video-Enlace'];

  // Restablecer formulario cuando el modal se abre
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


  // Maneja el cambio en el selector de tipo de recurso
  const handleTypeChange = (event) => {
    const selectedType = event.target.value;
    setType(selectedType);
    // Opcional: Limpiar campos específicos de otros tipos al cambiar de tipo
    setContentBody('');
    setLinkUrl('');
    setVideoUrl('');
  };

  // Maneja la presentación del formulario (llama a onSubmit del padre)
  const handleFormSubmit = (event) => {
    event.preventDefault();

    // Validaciones frontend (deben coincidir con backend createResource)
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

    // Prepara los datos para pasar al componente padre
    const newResourceData = {
        type,
        title: title.trim(),
        description: description?.trim() || '',
        ...(type === 'Contenido' && { content_body: contentBody.trim() }),
        ...(type === 'Enlace' && { link_url: linkUrl.trim() }),
        ...(type === 'Video-Enlace' && { video_url: videoUrl.trim() }),
    };

    // Llama a la función onSubmit proporcionada por el padre
    onSubmit(newResourceData);
  };


  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="create-resource-dialog-title">
      <DialogTitle id="create-resource-dialog-title">Crear Nuevo Recurso</DialogTitle>
      <DialogContent dividers> {/* dividers añade una línea divisoria */}
        <Stack spacing={2} component="form" onSubmit={handleFormSubmit} id="create-resource-form">
          {/* Selector de Tipo de Recurso */}
          <FormControl fullWidth variant="outlined" required disabled={isCreating}>
            <InputLabel id="resource-type-label">Tipo de Recurso</InputLabel>
            <Select
              labelId="resource-type-label"
              value={type}
              onChange={handleTypeChange}
              label="Tipo de Recurso"
            >
              <MenuItem value=""><em>Selecciona un tipo</em></MenuItem>
              {resourceTypes.map((resourceTypeOption) => (
                <MenuItem key={resourceTypeOption} value={resourceTypeOption}>{resourceTypeOption}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Campos base (Título y Descripción) */}
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

          {/* --- Renderizado Condicional de Campos Específicos por Tipo de Recurso --- */}
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
              />
          )}

        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isCreating}>Cancelar</Button>
        {/* El botón de submit está dentro del form en el DialogContent */}
         <Button
             type="submit" // Tipo submit para que dispare handleFormSubmit del Stack
             form="create-resource-form" // Asociar al formulario por su id
             variant="contained"
             color="primary"
             disabled={
                 isCreating ||
                 !type ||
                 !title.trim() ||
                 (type === 'Contenido' && (!contentBody || contentBody.trim() === '')) ||
                 (type === 'Enlace' && (!linkUrl || linkUrl.trim() === '')) ||
                 (type === 'Video-Enlace' && (!videoUrl || videoUrl.trim() === ''))
             }
             endIcon={isCreating ? <CircularProgress size={20} color="inherit" /> : null}
         >
             Crear
         </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CreateResourceModal;