// src/pages/components/EditResourceModal.jsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  FormHelperText
} from '@mui/material';

// *** Importar axiosInstance desde AuthContext ***
import { axiosInstance } from '../../context/AuthContext'; // Ajusta la ruta si es necesario

// *** Eliminar la importación de 'axios' si ya no la usas directamente ***
// import axios from 'axios';

// *** Eliminar la importación de API_BASE_URL si axiosInstance ya la tiene configurada ***
// import { API_BASE_URL } from '../../utils/constants';

import { toast } from 'react-toastify';


// Componente para editar un Recurso existente
// Props:
// - open: booleano para controlar si el modal está abierto
// - onClose: función para cerrar el modal
// - resourceId: el ID del recurso a editar (CRUCIAL)
// - onUpdateSuccess: función a llamar después de una actualización exitosa
function EditResourceModal({ open, onClose, resourceId, onUpdateSuccess }) {

  // Estado para el tipo original del recurso ( fetched )
  const [originalResourceType, setOriginalResourceType] = useState(''); // Guardamos el tipo original

  // Estados del formulario (para editar los campos del recurso) - Alineados con la página original
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentBody, setContentBody] = useState(''); // Para tipo 'Contenido'
  const [url, setUrl] = useState(''); // Un estado para ambas URLs ('Enlace', 'Video-Enlace')

  // Estados de carga y error
  const [isLoading, setIsLoading] = useState(true); // Para cargar datos iniciales del recurso
  const [fetchError, setFetchError] = useState(null); // Para errores al cargar

  // Estado para el proceso de guardado/actualización
  const [isSaving, setIsSaving] = useState(false); // Estado para deshabilitar durante el guardado

  // Estado para errores de validación frontend
  const [errors, setErrors] = useState({});


  // --- Efecto para cargar los datos del recurso al abrir el modal o cambiar resourceId ---
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
  const handleUpdateResource = async (event) => {
      event.preventDefault();

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
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Recurso ({originalResourceType})</DialogTitle> {/* Mostrar el tipo en el título */}
        <DialogContent dividers>
          {/* Mostrar spinner de carga o error al cargar los datos iniciales */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {fetchError && !isLoading && (
            <Alert severity="error" sx={{ my: 2 }}>Error al cargar recurso: {fetchError}</Alert>
          )}

          {/* Mostrar el formulario SÓLO si no está cargando y no hay error al cargar */}
          {!isLoading && !fetchError && originalResourceType && (
            <Stack spacing={2} component="form" onSubmit={handleUpdateResource}>

              {/* Campo Título */}
              <TextField
                label="Título del Recurso"
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={!!errors.title}
                helperText={errors.title}
                disabled={isSaving}
                required // Título es obligatorio
              />

              {/* Campo Descripción */}
              <TextField
                label="Descripción (Opcional)"
                fullWidth
                multiline
                rows={2} // Reducido a 2 filas por defecto, similar a la página
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving}
              />

              {/* Campo Tipo (No editable) */}
              <TextField
                label="Tipo de Recurso"
                fullWidth
                value={originalResourceType} // Usar el estado original para mostrar el tipo
                InputProps={{ readOnly: true }} // Hacer el campo de tipo NO editable
                disabled={isSaving}
              />

              {/* Campo específico según el tipo original - AHORA EDITABLE */}
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
                  required // Cuerpo de contenido es obligatorio
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
                  required // URL es obligatoria
                />
              )}


              {/* Botón de Guardar (Submit) */}
              {/* La condición de disabled ahora se basa en isSaving y si hay errores */}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={isSaving || !isFormValid}
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isSaving ? 'Guardando Cambios...' : 'Guardar Cambios'}
              </Button>

            </Stack>
          )}

        </DialogContent>
        {/* Botón de Cancelar fuera del formulario pero en las acciones */}
        <DialogActions>
          <Button onClick={onClose} color="secondary" disabled={isSaving}> {/* Deshabilitar cancelar durante guardado */}
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
  );
}

export default EditResourceModal;