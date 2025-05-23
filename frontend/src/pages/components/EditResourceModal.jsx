// src/pages/components/EditResourceModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Stack,
  CircularProgress,
  Alert,
  // FormHelperText // Might not be needed if errors are displayed directly in TextField helperText
} from '@mui/material';
import { axiosInstance } from '../../contexts/AuthContext'; // Ajusta la ruta si es necesario
import { toast } from 'react-toastify';
import GenericFormModal from '../../components/GenericFormModal'; // Ajusta la ruta

function EditResourceModal({ open, onClose, resourceId, onUpdateSuccess }) {
  const [originalResourceType, setOriginalResourceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true); // For initial data load
  const [fetchError, setFetchError] = useState(null);
  const [isSaving, setIsSaving] = useState(false); // For submission
  const [errors, setErrors] = useState({});

  useEffect(() => {
      if (open && resourceId) { // Cargar solo si el modal está abierto y tenemos un ID
          const fetchResource = async () => {
              setIsLoading(true);
              setFetchError(null);
              setErrors({}); // Limpiar errores previos al cargar

              try {
                  // *** LLAMADA PARA OBTENER EL RECURSO POR ID - USANDO axiosInstance ***
                  const response = await axiosInstance.get(`/api/content/resources/${resourceId}`);
                  const resourceData = response.data;
                  console.log("Recurso cargado para edición:", resourceData);

                  // Guardar el tipo original y rellenar estados del formulario
                  setOriginalResourceType(resourceData.type || '');
                  setTitle(resourceData.title || '');
                  setDescription(resourceData.description || '');

                  // Rellenar campos específicos según el tipo
                  if (resourceData.type === 'Contenido') {
                    setContentBody(resourceData.content_body || '');
                    setUrl(''); // Limpiar URL si no aplica
                  } else if (resourceData.type === 'Enlace') {
                    setUrl(resourceData.link_url || '');
                    setContentBody(''); // Limpiar ContentBody si no aplica
                  } else if (resourceData.type === 'Video-Enlace') {
                    setUrl(resourceData.video_url || '');
                    setContentBody(''); // Limpiar ContentBody si no aplica
                  }

                  setFetchError(null);

              } catch (err) {
                  console.error('Error fetching resource for editing:', err.response ? err.response.data : err.message);
                  const errorMessage = err.response?.data?.message || 'Error al cargar los datos del recurso para editar.';
                  setFetchError(errorMessage);
                  toast.error(errorMessage);
              } finally {
                  setIsLoading(false); // Siempre desactiva la carga al finalizar
              }
          };

          fetchResource();

      } else if (!open) {
          // Limpiar estados si el modal se cierra
          setOriginalResourceType('');
          setTitle('');
          setDescription('');
          setContentBody('');
          setUrl('');
          setIsLoading(true);
          setFetchError(null);
          setErrors({}); // Limpiar errores
          setIsSaving(false);
      }
  }, [open, resourceId]);


  // --- Función de Validación Frontend (Adaptada de la página original) ---
  // Esta función ahora se llama explícitamente antes de enviar
  const validateForm = () => {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'El título es obligatorio.';
    }

    // Validación condicional basada en el tipo original del recurso
    if (originalResourceType === 'Contenido' && !contentBody.trim()) {
      newErrors.contentBody = 'El cuerpo del contenido es obligatorio para este tipo.';
    }
    if ((originalResourceType === 'Enlace' || originalResourceType === 'Video-Enlace') && (!url.trim() || !/^https?:\/\/.+/.test(url.trim()))) {
      newErrors.url = `Debe ingresar una URL válida que comience con http o https para este tipo de recurso.`;
    } else if ((originalResourceType === 'Enlace' || originalResourceType === 'Video-Enlace') && url.trim() && !/^https?:\/\/.+/.test(url.trim())) {
         newErrors.url = `La URL debe comenzar con http o https.`; // Validación más específica para URL
     }


    // Actualizar el estado de errores
    setErrors(newErrors);

    // Retorna true si no hay errores (el objeto newErrors está vacío)
    return Object.keys(newErrors).length === 0;
  };

  // --- Maneja el envío del formulario para actualizar el recurso ---
  const handleInternalSubmit = async () => { // Renamed
      // Ejecutar validación frontend antes de enviar
      if (!validateForm()) {
          toast.warning('Por favor, corrige los errores en el formulario.');
          return;
      }

      // Prepara los datos para enviar al backend, incluyendo solo el campo específico relevante
      const updatedResourceData = {
          title: title.trim(),
          description: description.trim(), // Enviar descripción aunque esté vacía si se edita
      };

      // Añadir el campo específico editable basado en el tipo original
      if (originalResourceType === 'Contenido') {
          updatedResourceData.content_body = contentBody.trim();
      } else if (originalResourceType === 'Enlace') {
          updatedResourceData.link_url = url.trim();
      } else if (originalResourceType === 'Video-Enlace') {
          updatedResourceData.video_url = url.trim();
      }


      setIsSaving(true); // Activa estado de guardado

      try {
          // *** LLAMADA PUT PARA ACTUALIZAR EL RECURSO - USANDO axiosInstance ***
          const response = await axiosInstance.put(`/api/content/resources/${resourceId}`, updatedResourceData);
          console.log("Recurso actualizado con éxito:", response.data); // Log de éxito

          const responseMessage = response.data.message || 'Recurso actualizado con éxito!';
          toast.success(responseMessage);

          // Llama a la función de éxito del padre, pasando los datos actualizados si los devuelve el backend
          if(onUpdateSuccess) {
              onUpdateSuccess(response.data);
          }

          onClose(); // Cierra el modal al finalizar con éxito

      } catch (err) {
          console.error('Error updating resource:', err.response ? err.response.data : err.message);
          const errorMessage = err.response?.data?.message || 'Error al intentar actualizar el recurso.';
          toast.error(errorMessage);
          // No cerramos el modal aquí en caso de error para que el usuario vea el mensaje y pueda reintentar
      } finally {
          setIsSaving(false); // Siempre desactiva el estado de guardado
      }
  };


  // Determinar si el formulario es válido para habilitar el botón (ahora basado en el estado de errores)
  const isFormValid = Object.keys(errors).length === 0;


  // --- Renderizado del Modal ---
  return (
    <GenericFormModal
      open={open}
      onClose={onClose}
      title={`Editar Recurso (${originalResourceType || 'Cargando...'})`}
      onSubmit={handleInternalSubmit}
      isSubmitting={isSaving}
      submitText="Guardar Cambios"
      // The submit button in GenericFormModal will be disabled if isSaving (isSubmitting) is true.
      // We also need to disable it if the form is invalid (isFormValid is false).
      // GenericFormModal needs a prop like `isSubmitDisabled` for this.
      // For now, handleInternalSubmit checks validation.
    >
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {fetchError && !isLoading && (
        <Alert severity="error" sx={{ my: 2 }}>Error al cargar recurso: {fetchError}</Alert>
      )}
      {!isLoading && !fetchError && originalResourceType && (
        <Stack spacing={2} sx={{ pt: 1 }}> {/* pt:1 for padding top */}
          <TextField
            label="Título del Recurso"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            disabled={isSaving}
            required
            autoFocus
          />
          <TextField
            label="Descripción (Opcional)"
            fullWidth
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
          <TextField // Display original type, not editable
            label="Tipo de Recurso"
            fullWidth
            value={originalResourceType}
            InputProps={{ readOnly: true }}
            disabled={isSaving} // Should still be disabled if saving
          />
          {originalResourceType === 'Contenido' && (
            <TextField
              label="Cuerpo del Contenido"
              fullWidth
              multiline
              rows={6}
              value={contentBody}
              onChange={(e) => setContentBody(e.target.value)}
              error={!!errors.contentBody}
              helperText={errors.contentBody}
              disabled={isSaving}
              required
            />
          )}
          {(originalResourceType === 'Enlace' || originalResourceType === 'Video-Enlace') && (
            <TextField
              label={originalResourceType === 'Enlace' ? 'URL del Enlace' : 'URL del Video'}
              fullWidth
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={!!errors.url}
              helperText={errors.url}
              disabled={isSaving}
              required
              type="url"
            />
          )}
          {/* Submit button is handled by GenericFormModal */}
        </Stack>
      )}
      {/* If form is not ready (e.g. no originalResourceType loaded yet, and not loading/error)
          you might want a placeholder or different message here.
          Currently, if originalResourceType is empty, the form fields won't show.
      */}
      {!isLoading && !fetchError && !originalResourceType && (
        <Alert severity="info" sx={{ my: 2 }}>
          No se pudo determinar el tipo de recurso para editar.
        </Alert>
      )}
    </GenericFormModal>
  );
}

export default EditResourceModal;