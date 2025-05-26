// src/pages/components/EditContentAssignmentModal.jsx

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
  Grid,
  CircularProgress,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Alert,
  Skeleton
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// Iconos para el contenido
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LoopIcon from '@mui/icons-material/Loop';
import TimerIcon from '@mui/icons-material/Timer';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Helper para obtener el icono del contenido asociado
const getContentIcon = (content) => {
  const subType = content?.type;
  const isResourceItem = content?.link_url !== undefined || content?.content_body !== undefined || content?.video_url !== undefined;
  const isActivityItem = content?.cuestionario_questions !== undefined || content?.quiz_questions !== undefined || (subType === 'Trabajo' && content?.description !== undefined);

  if (isResourceItem) {
    if (subType === 'Contenido') return <DescriptionIcon color="primary" />;
    if (subType === 'Enlace') return <LinkIcon color="primary" />;
    if (subType === 'Video-Enlace') return <PlayCircleOutlinedIcon color="primary" />;
    return <CheckCircleOutlineIcon color="primary" />;
  }
  if (isActivityItem) {
    if (subType === 'Quiz') return <QuizIcon color="secondary" />;
    if (subType === 'Cuestionario') return <QuestionAnswerIcon color="secondary" />;
    if (subType === 'Trabajo') return <WorkIcon color="secondary" />;
    return <AssignmentIcon color="secondary" />;
  }
  return null;
};

/**
 * Componente para editar una asignación de contenido/actividad existente
 * 
 * @param {Object} props 
 * @param {boolean} props.open - Booleano para controlar si el modal está abierto
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {string} props.assignmentId - El ID de la asignación a editar
 * @param {Function} props.onUpdateSuccess - Función a llamar después de una actualización exitosa
 */
function EditContentAssignmentModal({ open, onClose, assignmentId, themeName, onUpdateSuccess }) {
  // Estado para los datos de la asignación
  const [assignment, setAssignment] = useState(null);
  // Estado para los datos del contenido asociado
  const [contentItem, setContentItem] = useState(null);

  // Estados del formulario
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [puntosMaximos, setPuntosMaximos] = useState('');
  const [intentosPermitidos, setIntentosPermitidos] = useState('');
  const [tiempoLimite, setTiempoLimite] = useState('');

  // Estados de carga y error
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estado para errores de validación frontend
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open && assignmentId) {
      const fetchAssignment = async () => {
        setIsLoading(true);
        setFetchError(null);
        setErrors({});

        try {
          const response = await axiosInstance.get(`/api/learning-paths/assignments/${assignmentId}`);
          const fetchedAssignment = response.data;
          console.log("Asignación cargada para edición:", fetchedAssignment);

          setAssignment(fetchedAssignment);

          const associatedContent = fetchedAssignment.type === 'Resource' 
            ? fetchedAssignment.resource_id 
            : fetchedAssignment.activity_id;
          setContentItem(associatedContent);
          console.log("Contenido asociado cargado:", associatedContent);

          // Rellenar los estados del formulario
          setFechaInicio(fetchedAssignment.fecha_inicio ? new Date(fetchedAssignment.fecha_inicio) : null);
          setFechaFin(fetchedAssignment.fecha_fin ? new Date(fetchedAssignment.fecha_fin) : null);
          setPuntosMaximos(fetchedAssignment.puntos_maximos !== undefined && fetchedAssignment.puntos_maximos !== null 
            ? String(fetchedAssignment.puntos_maximos) 
            : '');
          setIntentosPermitidos(fetchedAssignment.intentos_permitidos !== undefined && fetchedAssignment.intentos_permitidos !== null 
            ? String(fetchedAssignment.intentos_permitidos) 
            : '');
          setTiempoLimite(fetchedAssignment.tiempo_limite !== undefined && fetchedAssignment.tiempo_limite !== null 
            ? String(fetchedAssignment.tiempo_limite) 
            : '');

        } catch (err) {
          console.error('Error fetching assignment for editing:', err.response ? err.response.data : err.message);
          const errorMessage = err.response?.data?.message || 'Error al cargar los datos de la asignación para editar.';
          setFetchError(errorMessage);
          toast.error(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };

      fetchAssignment();

    } else if (!open) {
      // Limpiar estados si el modal se cierra
      setAssignment(null);
      setContentItem(null);
      setFechaInicio(null);
      setFechaFin(null);
      setPuntosMaximos('');
      setIntentosPermitidos('');
      setTiempoLimite('');
      setIsLoading(true);
      setFetchError(null);
      setErrors({});
      setIsSaving(false);
    }
  }, [open, assignmentId]);

  const validateForm = () => {
    const newErrors = {};

    // Validación de Fechas
    if (fechaInicio && isNaN(fechaInicio.getTime())) {
      newErrors.fechaInicio = 'Fecha de inicio inválida.';
    }
    if (fechaFin && isNaN(fechaFin.getTime())) {
      newErrors.fechaFin = 'Fecha de fin inválida.';
    }
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      newErrors.fechaFin = 'La fecha de fin no puede ser anterior a la fecha de inicio.';
    }

    const associatedContentItemType = contentItem?.type;

    // Determine if the activity type requires points
    const requiresPoints = contentItem && (
      associatedContentItemType === 'Quiz' || 
      associatedContentItemType === 'Cuestionario' ||
      associatedContentItemType === 'Trabajo' // Trabajo can also have points
    );

    // Determine if the activity type allows attempts
    const activityAllowsAttempts = contentItem && (
      associatedContentItemType === 'Quiz' || 
      associatedContentItemType === 'Cuestionario' ||
      associatedContentItemType === 'Trabajo' // Trabajo allows attempts
    );

    // Determine if the activity type allows a time limit
    const activityAllowsTimeLimit = contentItem && (
      associatedContentItemType === 'Quiz' || 
      associatedContentItemType === 'Cuestionario'
    );

    // Validación de Puntos Máximos
    if (requiresPoints) {
      if (puntosMaximos.trim() === '' || isNaN(puntosMaximos) || parseFloat(puntosMaximos.trim()) < 0) {
        newErrors.puntosMaximos = 'Es obligatorio y debe ser un número no negativo para este tipo de actividad.';
      }
    } else if (puntosMaximos.trim() !== '' && (isNaN(puntosMaximos) || parseFloat(puntosMaximos.trim()) < 0)) {
      newErrors.puntosMaximos = 'Si proporcionas puntos, deben ser un número no negativo.';
    }

    // Validación de Intentos Permitidos
    if (intentosPermitidos.trim() !== '') {
      if (isNaN(intentosPermitidos) || parseInt(intentosPermitidos.trim(), 10) < 0 || !Number.isInteger(parseFloat(intentosPermitidos.trim()))) {
        if (activityAllowsAttempts) {
          newErrors.intentosPermitidos = 'Debe ser un número entero no negativo.';
        } else {
          // This case implies a non-activity or an activity type that doesn't support attempts, yet a value was entered.
          newErrors.intentosPermitidos = 'Si proporcionas intentos, deben ser un número entero no negativo.';
        }
      }
    }
    // For 'Trabajo', 'Quiz', 'Cuestionario', intentosPermitidos is optional. So, no error if it's empty.

    // Validación de Tiempo Límite
    if (tiempoLimite.trim() !== '') {
      if (isNaN(tiempoLimite) || parseInt(tiempoLimite.trim(), 10) <= 0 || !Number.isInteger(parseFloat(tiempoLimite.trim()))) { // Tiempo límite debe ser > 0
        if (activityAllowsTimeLimit) {
          newErrors.tiempoLimite = 'Debe ser un número entero positivo en minutos.';
        } else {
          // This case implies a non-activity or an activity type that doesn't support time limit, yet a value was entered.
          newErrors.tiempoLimite = 'Si proporcionas tiempo límite, debe ser un número entero positivo en minutos.';
        }
      }
    }
    // For 'Quiz', 'Cuestionario', tiempoLimite is optional. So, no error if it's empty.

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateAssignment = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.warning('Por favor, corrige los errores en el formulario de asignación.');
      return;
    }

    // Prepara los datos para enviar al backend
    const updatedAssignmentData = {
      fecha_inicio: fechaInicio ? fechaInicio.toISOString() : null,
      fecha_fin: fechaFin ? fechaFin.toISOString() : null,
      puntos_maximos: puntosMaximos.trim() !== '' ? parseFloat(puntosMaximos.trim()) : undefined,
      intentos_permitidos: intentosPermitidos.trim() !== '' ? parseInt(intentosPermitidos.trim(), 10) : undefined,
      tiempo_limite: tiempoLimite.trim() !== '' ? parseInt(tiempoLimite.trim(), 10) : undefined,
    };

    setIsSaving(true);

    try {
      const response = await axiosInstance.put(`/api/learning-paths/assignments/${assignmentId}`, updatedAssignmentData);
      console.log("Asignación actualizada con éxito:", response.data);

      const responseMessage = response.data.message || 'Asignación actualizada con éxito.';
      toast.success(responseMessage);

      onClose();
      if (onUpdateSuccess) {
        onUpdateSuccess(response.data);
      }

    } catch (err) {
      console.error('Error updating assignment:', err.response ? err.response.data : err.message);
      const errorMessage = err.response?.data?.message || 'Error al intentar actualizar la asignación.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Determinar el subtipo del contenido asociado para el renderizado condicional
  const associatedContentItemType = contentItem?.type;

  // Controlar qué campos se muestran en el formulario de edición
  const rendersPointsField = contentItem && ['Quiz', 'Cuestionario', 'Trabajo'].includes(associatedContentItemType);
  // ** UPDATED ** Separate variables for attempts and time limit fields
  const rendersAttemptsField = contentItem && ['Quiz', 'Cuestionario', 'Trabajo'].includes(associatedContentItemType);
  const rendersTimeLimitField = contentItem && ['Quiz', 'Cuestionario'].includes(associatedContentItemType);

  // Función para formatear el tipo de contenido para mostrar
  const getContentTypeLabel = () => {
    if (!contentItem || !assignment) return 'Desconocido';
    
    const baseType = assignment.type === 'Resource' ? 'Recurso' : 'Actividad';
    const subType = contentItem.type || 'Desconocido';
    
    return `${baseType}: ${subType}`;
  };

  // Formatear fechas para mostrar
  const formatDateTime = (dateString) => {
    if (!dateString) return 'No definida';
    try {
        const date = new Date(dateString);
        // Opciones de formato para incluir fecha y hora
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // Para formato de 24 horas. Cámbialo a true si prefieres 12 horas con AM/PM
        };
        return date.toLocaleDateString(undefined, options); // 'undefined' para usar el locale por defecto del usuario
    } catch (e) {
        console.error("Error al formatear la fecha:", e);
        return 'Fecha inválida';
    }
};

  return (
    <Dialog 
      open={open} 
      onClose={isSaving ? undefined : onClose} 
      maxWidth="md" 
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 1,
          boxShadow: 10
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2,
        bgcolor: 'primary.light',
        color: 'primary.contrastText'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon />
          <Typography variant="h6" component="div">
            Editando Asignación del Tema: {themeName}
          </Typography>
        </Box>
        <IconButton 
          edge="end" 
          color="inherit" 
          onClick={onClose} 
          disabled={isSaving}
          size="small"
          aria-label="cerrar"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        {/* Estado de carga */}
        {isLoading && (
          <Box sx={{ width: '100%' }}>
            <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={120} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="rectangular" width="50%" height={56} />
              <Skeleton variant="rectangular" width="50%" height={56} />
            </Box>
          </Box>
        )}

        {/* Mostrar error si ocurre */}
        {fetchError && !isLoading && (
          <Alert 
            severity="error" 
            sx={{ my: 2 }}
            action={
              <Button color="inherit" size="small" onClick={onClose}>
                Cerrar
              </Button>
            }
          >
            Error al cargar asignación: {fetchError}
          </Alert>
        )}

        {/* Formulario */}
        {!isLoading && !fetchError && assignment && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <form onSubmit={handleUpdateAssignment}>
              <Stack spacing={3}>
                {/* Información del Contenido */}
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 2,
                    borderLeft: 4,
                    borderColor: assignment.type === 'Resource' ? 'primary.main' : 'secondary.main',
                    bgcolor: 'background.paper',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    {/* Icono grande */}
                    <Grid item xs={12} sm={2} sx={{ textAlign: 'center' }}>
                      <Box sx={{ 
                        p: 1.5, 
                        bgcolor: assignment.type === 'Resource' ? 'primary.light' : 'secondary.light',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        boxShadow: 1
                      }}>
                        {getContentIcon(contentItem) || <InfoOutlinedIcon color="action" />}
                      </Box>
                    </Grid>
                    
                    {/* Información del contenido */}
                    <Grid item xs={12} sm={10}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {contentItem?.title || 'Contenido sin título'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                        <Chip 
                          size="small" 
                          label={getContentTypeLabel()} 
                          color={assignment.type === 'Resource' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                        
                        {assignment.module_id && (
                          <Chip 
                            size="small" 
                            label={`Módulo: ${assignment.module_id.title || assignment.module_id}`} 
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      {/* Información actual de fechas como chips pequeños */}
                      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Tooltip title="Fecha de inicio actual">
                          <Chip 
                            size="small"
                            icon={<CalendarTodayIcon fontSize="small" />} 
                            label={`Inicio: ${formatDateTime(assignment.fecha_inicio)}`} 
                            variant="outlined"
                            color="default"
                          />
                        </Tooltip>
                        
                        <Tooltip title="Fecha de finalización actual">
                          <Chip 
                            size="small"
                            icon={<EventIcon fontSize="small" />} 
                            label={`Fin: ${formatDateTime(assignment.fecha_fin)}`}
                            variant="outlined" 
                            color="default"
                          />
                        </Tooltip>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>

                <Divider textAlign="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    Actualizar configuración
                  </Typography>
                </Divider>
                
                {/* Sección de fechas */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon fontSize="small" color="primary" />
                    Programación
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        {/* Usa DateTimePicker en lugar de DatePicker */}
                        <DateTimePicker
                            label="Fecha y Hora de Inicio" // Cambia la etiqueta para reflejar que incluye hora
                            value={fechaInicio}
                            onChange={(newValue) => setFechaInicio(newValue)}
                            format="dd/MM/yyyy HH:mm" // Define el formato de visualización (puedes ajustar según tu preferencia)
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.fechaInicio,
                                    helperText: errors.fechaInicio,
                                    variant: "outlined",
                                    size: "medium"
                                },
                            }}
                            // Puedes añadir prop como disablePast si quieres impedir seleccionar fechas pasadas en el picker (UX)
                            // disablePast={true}
                            sx={{ width: '100%' }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {/* Usa DateTimePicker en lugar de DatePicker */}
                        <DateTimePicker
                            label="Fecha y Hora de Fin" // Cambia la etiqueta
                            value={fechaFin}
                            onChange={(newValue) => setFechaFin(newValue)}
                            format="dd/MM/yyyy HH:mm" // Define el formato
                            slotProps={{
                                textField: {
                                    fullWidth: true,
                                    error: !!errors.fechaFin,
                                    helperText: errors.fechaFin,
                                    variant: "outlined",
                                    size: "medium"
                                },
                            }}
                            // Puedes añadir prop como minDateTime para asegurar que la fecha fin sea después de fecha inicio (UX)
                            // minDateTime={fechaInicio || undefined}
                            sx={{ width: '100%' }}
                        />
                    </Grid>
                </Grid>
                </Box>

                {/* Sección de configuraciones adicionales (condicional) */}
                {(rendersPointsField || rendersAttemptsField || rendersTimeLimitField) && ( // Adjusted condition
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmojiEventsIcon fontSize="small" color="secondary" />
                      Configuración de la Actividad
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {/* Campo de puntos */}
                      {rendersPointsField && (
                        // Adjust sm prop based on whether other fields are rendered
                        <Grid item xs={12} sm={(rendersAttemptsField || rendersTimeLimitField) ? 4 : 12}>
                          <TextField
                            label="Puntos Máximos"
                            type="number"
                            fullWidth
                            value={puntosMaximos}
                            onChange={(e) => setPuntosMaximos(e.target.value)}
                            error={!!errors.puntosMaximos}
                            helperText={errors.puntosMaximos}
                            InputProps={{ 
                              inputProps: { min: 0 },
                              startAdornment: <EmojiEventsIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                            variant="outlined"
                            size="medium"
                          />
                        </Grid>
                      )}
                      
                      {/* Campo Intentos Permitidos */}
                      {rendersAttemptsField && (
                        <Grid item xs={12} sm={rendersPointsField ? (rendersTimeLimitField ? 4 : 8) : (rendersTimeLimitField ? 6 : 12)}>
                          <TextField
                            label="Intentos Permitidos"
                            type="number"
                            fullWidth
                            value={intentosPermitidos}
                            onChange={(e) => setIntentosPermitidos(e.target.value)}
                            error={!!errors.intentosPermitidos}
                            helperText={errors.intentosPermitidos}
                            InputProps={{ 
                              inputProps: { min: 0, step: 1 },
                              startAdornment: <LoopIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                            variant="outlined"
                            size="medium"
                          />
                        </Grid>
                      )}
                      
                      {/* Campo Tiempo Límite */}
                      {rendersTimeLimitField && (
                        <Grid item xs={12} sm={rendersPointsField ? (rendersAttemptsField ? 4 : 8) : (rendersAttemptsField ? 6 : 12)}>
                          <TextField
                            label="Tiempo Límite (minutos)"
                            type="number"
                            fullWidth
                            value={tiempoLimite}
                            onChange={(e) => setTiempoLimite(e.target.value)}
                            error={!!errors.tiempoLimite}
                            helperText={errors.tiempoLimite}
                            InputProps={{ 
                              inputProps: { min: 1, step: 1 }, // Tiempo límite debe ser al menos 1 si se provee
                              startAdornment: <TimerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                            variant="outlined"
                            size="medium"
                          />
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                )}

                {/* Mensaje informativo sobre las configuraciones */}
                <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                  Las fechas de inicio y fin definen el período en que los estudiantes pueden acceder al contenido.
                  {rendersPointsField && " Los puntos máximos determinan la calificación total posible."}
                  {(rendersAttemptsField || rendersTimeLimitField) && " Los intentos y el tiempo límite establecen restricciones para la realización de la actividad."} 
                  {/* Adjusted message to reflect either can be present */}
                </Alert>
                
              </Stack>
            </form>
          </LocalizationProvider>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'right' }}>
        <Button
          onClick={handleUpdateAssignment}
          disabled={isSaving || isLoading || !!fetchError}
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSaving ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditContentAssignmentModal;