// src/pages/components/AddContentAssignmentModal.jsx
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
  Paper,
  CircularProgress,
  InputAdornment,
  Alert,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  FormHelperText
} from '@mui/material';

// *** Importar DateTimePicker en lugar de DatePicker ***
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'; // <-- MODIFICADO
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // O la que estés usando (ej. AdapterDayjs, AdapterLuxon)
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';


import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import LinkIcon from '@mui/icons-material/Link';
import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import QuizIcon from '@mui/icons-material/Quiz';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Importar axiosInstance desde AuthContext (ya lo tenías)
import { axiosInstance } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

// Helper para obtener el icono del contenido asociado (mantener)
const getContentIcon = (content) => {
  const subType = content.type;
  const isResourceItem = content.link_url !== undefined || content.content_body !== undefined || content.video_url !== undefined;
  const isActivityItem = content.cuestionario_questions !== undefined || content.quiz_questions !== undefined || (subType === 'Trabajo' && content.description !== undefined);

  if (isResourceItem) {
    if (subType === 'Contenido') return <DescriptionIcon />;
    if (subType === 'Enlace') return <LinkIcon />;
    if (subType === 'Video-Enlace') return <PlayCircleOutlinedIcon />;
    return <CheckCircleOutlineIcon />; // Icono por defecto para recursos si los tipos no coinciden
  }
  if (isActivityItem) {
    if (subType === 'Quiz') return <QuizIcon />;
    if (subType === 'Cuestionario') return <QuestionAnswerIcon />;
    if (subType === 'Trabajo') return <WorkIcon />;
    return <AssignmentIcon />; // Icono por defecto para actividades si los tipos no coinciden
  }
  return null; // Si no es recurso ni actividad reconocida
};


function AddContentAssignmentDialog({ open, onClose, onSubmitAssignment, onRequestCreateNewContent, themeName, isAssigning }) {
  // Estados (mantener)
  const [selectedContent, setSelectedContent] = useState(null);
  // Inicializar fechaInicio con la fecha/hora actual
  const [fechaInicio, setFechaInicio] = useState(new Date()); // <-- CAMBIO AQUÍ
  const [fechaFin, setFechaFin] = useState(null);
  const [puntosMaximos, setPuntosMaximos] = useState('');
  const [intentosPermitidos, setIntentosPermitidos] = useState('');
  const [tiempoLimite, setTiempoLimite] = useState('');
  const [contentBank, setContentBank] = useState([]);
  const [filteredContent, setFilteredContent] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [contentError, setContentError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState({});

  // --- Efecto para cargar el banco de contenido al abrir el modal ---
  useEffect(() => {
    if (open) { // Cargar solo si el modal está abierto
      const fetchContent = async () => {
        setIsLoadingContent(true);
        setContentError(null);
        try {
          // LLAMADA PARA OBTENER EL BANCO DE CONTENIDO - USANDO axiosInstance (ya lo tenías)
          const response = await axiosInstance.get('/api/content/my-bank');

          const combinedContent = [
            // Mapear recursos y actividades y añadirles flags para diferenciarlos (ya lo tenías)
            ...response.data.resources.map(item => ({ ...item, _isResource: true, _isActivity: false })),
            ...response.data.activities.map(item => ({ ...item, _isResource: false, _isActivity: true }))
          ];
          setContentBank(combinedContent);
          setFilteredContent(combinedContent); // Inicialmente, filtrados es igual a todo el banco

        } catch (err) {
          console.error('Error fetching content:', err.response ? err.response.data : err.message);
          const errorMessage = err.response?.data?.message || 'Error al cargar el banco de contenido.';
          setContentError(errorMessage);
          toast.error('Error al cargar contenido y actividades.');
        } finally {
          setIsLoadingContent(false);
        }
      };
      fetchContent(); // Llamar a la función fetchContent
    } else {
      // Limpiar estados si el modal se cierra (ya lo tenías)
      setSelectedContent(null);
      setFechaInicio(new Date()); // <-- CAMBIO AQUÍ: al cerrar, también reinicia a la fecha/hora actual
      setFechaFin(null);
      setPuntosMaximos('');
      setIntentosPermitidos('');
      setTiempoLimite('');
      setContentBank([]);
      setFilteredContent([]);
      setContentError(null);
      setSearchTerm('');
      setErrors({});
    }
  }, [open]); // Dependencia: se ejecuta al abrir/cerrar el modal

  // Efecto para filtrar el contenido basado en el término de búsqueda (mantener)
  useEffect(() => {
    const filtered = contentBank.filter(item =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredContent(filtered);
  }, [searchTerm, contentBank]);

  // --- Función de Validación Frontend ---
  const validateForm = () => {
    const newErrors = {};
    // Usamos new Date() para comparar con la hora actual
    const now = new Date();


    if (!selectedContent) {
      newErrors.selectedContent = 'Debe seleccionar un contenido del banco.';
    }

    // Validación de Fechas y Hora
    if (fechaInicio) { // Solo validar si se seleccionó una fecha de inicio
        const fechaInicioDate = new Date(fechaInicio);
        if (isNaN(fechaInicioDate.getTime())) {
            newErrors.fechaInicio = 'Fecha y hora de inicio inválidas.';
        }
        // *** NUEVA VALIDACIÓN: Fecha/Hora de inicio no puede ser anterior a la actual ***
        // Comparamos la fecha seleccionada con la fecha/hora actual
        if (fechaInicioDate < now) {
            newErrors.fechaInicio = 'La fecha y hora de inicio no pueden ser anteriores a la hora actual.';
        }
    } else {
         // Considerar si fechaInicio es obligatorio. Si es así:
        // newErrors.fechaInicio = 'La fecha y hora de inicio son obligatorias.';
    }


    if (fechaFin) { // Solo validar si se seleccionó una fecha de fin
        const fechaFinDate = new Date(fechaFin);
        if (isNaN(fechaFinDate.getTime())) {
            newErrors.fechaFin = 'Fecha y hora de fin inválidas.';
        }
        // Validación de que fecha_fin sea posterior a fecha_inicio si ambas están presentes
        if (fechaInicio && fechaFinDate && new Date(fechaInicio).getTime() >= fechaFinDate.getTime()) { // Usar getTime() para comparación precisa
            newErrors.fechaFin = 'La fecha y hora de fin deben ser posteriores a la fecha y hora de inicio.';
        }
    } else {
         // Considerar si fechaFin es obligatorio. Si es así:
        // newErrors.fechaFin = 'La fecha y hora de fin son obligatorias.';
    }


    // Lógica de validación condicional basada en el tipo de contenido/actividad seleccionado
    const isActivity = selectedContent?._isActivity;
    const activitySubType = selectedContent?.type;

    // Ajusta esto si 'Trabajo' también requiere puntos
    const requiresPoints = isActivity && (activitySubType === 'Quiz' || activitySubType === 'Cuestionario');
    // Ajusta esto si otros tipos de actividad permiten intentos o tiempo límite
    const allowsAttemptsOrTime = isActivity && (activitySubType === 'Quiz' || activitySubType === 'Cuestionario');


    // Validación de Puntos Máximos (tu lógica existente)
    if (requiresPoints) {
      if (puntosMaximos.trim() === '' || isNaN(puntosMaximos) || parseFloat(puntosMaximos.trim()) < 0) {
        newErrors.puntosMaximos = 'Es obligatorio y debe ser un número no negativo para este tipo de actividad.';
      }
    } else {
      if (puntosMaximos.trim() !== '' && (isNaN(puntosMaximos) || parseFloat(puntosMaximos.trim()) < 0)) {
        newErrors.puntosMaximos = 'Si proporcionas puntos, deben ser un número no negativo.';
      }
    }

    // Validación de Intentos Permitidos (tu lógica existente)
    if (allowsAttemptsOrTime) {
      if (intentosPermitidos.trim() !== '' && (isNaN(intentosPermitidos) || parseInt(intentosPermitidos.trim(), 10) < 0 || !Number.isInteger(parseFloat(intentosPermitidos.trim())))) {
        newErrors.intentosPermitidos = 'Debe ser un número entero no negativo.';
      }
    } else {
      if (intentosPermitidos.trim() !== '' ) {
           if (isNaN(intentosPermitidos) || parseInt(intentosPermitidos.trim(), 10) < 0 || !Number.isInteger(parseFloat(intentosPermitidos.trim()))) {
               newErrors.intentosPermitidos = 'Si proporcionas intentos, deben ser un número entero no negativo.';
           }
       }
    }

    // Validación de Tiempo Límite
    if (allowsAttemptsOrTime) {
      if (tiempoLimite.trim() !== '' && (isNaN(tiempoLimite) || parseInt(tiempoLimite.trim(), 10) <= 0 || !Number.isInteger(parseFloat(tiempoLimite.trim())))) { // *** CAMBIADO < 0 a <= 0 ***
        newErrors.tiempoLimite = 'Es obligatorio y debe ser un número entero positivo en minutos.'; // *** Mensaje ajustado ***
      } else if (tiempoLimite.trim() === '') {
        // Considerar si tiempoLimite es obligatorio para Quiz/Cuestionario. Si sí:
        // newErrors.tiempoLimite = 'El tiempo límite es obligatorio para este tipo de actividad.';
      }
    } else {
       if (tiempoLimite.trim() !== '' ) {
            // Si proporcionas tiempo límite para un tipo que no lo permite
            if (isNaN(tiempoLimite) || parseInt(tiempoLimite.trim(), 10) < 0 || !Number.isInteger(parseFloat(tiempoLimite.trim()))) {
                newErrors.tiempoLimite = 'Si proporcionas tiempo límite, debe ser un número entero no negativo.'; // Mensaje genérico
            }
        }
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Maneja el envío del formulario, pasa los datos al padre (mantener)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
        // El toast ya se muestra dentro de validateForm con mensajes específicos por campo
        toast.warning('Por favor, revisa los campos con errores.'); // Toast genérico para indicar errores
        return;
    }


    const data = {
      // Incluir _id solo si existe y es un recurso o actividad (ya lo tenías)
      resource_id: selectedContent?._isResource ? selectedContent._id : undefined,
      activity_id: selectedContent?._isActivity ? selectedContent._id : undefined,
      type: selectedContent?._isResource ? 'Resource' : 'Activity', // 'Resource' o 'Activity'
      // Convertir Date objects a ISO strings o null (ya lo tenías)
      fecha_inicio: fechaInicio ? fechaInicio.toISOString() : null,
      fecha_fin: fechaFin ? fechaFin.toISOString() : null,
      // Convertir strings de números a number o undefined si está vacío (ya lo tenías)
      puntos_maximos: puntosMaximos.trim() !== '' ? parseFloat(puntosMaximos.trim()) : undefined,
      intentos_permitidos: intentosPermitidos.trim() !== '' ? parseInt(intentosPermitidos.trim(), 10) : undefined,
      // Asegurarse de enviar tiempo_limite como número, pero solo si aplica y se proporcionó
      tiempo_limite: (selectedContent?._isActivity && (selectedContent.type === 'Quiz' || selectedContent.type === 'Cuestionario') && tiempoLimite.trim() !== '')
        ? parseInt(tiempoLimite.trim(), 10)
        : undefined // Envía undefined si no aplica o está vacío
    };

    // Llama a la función proporcionada por el padre para manejar la asignación (ya lo tenías)
    onSubmitAssignment(data);
    // Nota: onClose() no se llama aquí. El padre la llama DESPUÉS de que la asignación sea exitosa.
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
            Asignar un Contenido al Tema:  {themeName}
          </Typography>
        </Box>
      </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {/* Sección de selección de contenido (mantener) */}
            <Box>
              <Typography variant="h6">Seleccionar Contenido del Banco</Typography>
              <Button onClick={onRequestCreateNewContent} disabled={isLoadingContent || isAssigning} sx={{ my: 1 }}>
                ¿No encuentras el contenido? Crea uno nuevo.
              </Button>
              <TextField
                label="Buscar contenido"
                fullWidth
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isLoadingContent}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Paper sx={{ mt: 2, maxHeight: 250, overflow: 'auto', border: errors.selectedContent ? '1px solid red' : undefined }}>
                {isLoadingContent ? (
                  <Box display="flex" justifyContent="center" p={2}><CircularProgress /></Box>
                ) : contentError ? (
                  <Alert severity="error">{contentError}</Alert>
                ) : filteredContent.length === 0 ? (
                  <Typography variant="body2" p={2}>No se encontró contenido.</Typography>
                ) : (
                  <List dense>
                    {filteredContent.map((item, index) => (
                      <React.Fragment key={item._id}>
                        <ListItemButton
                          selected={selectedContent?._id === item._id}
                          onClick={() => setSelectedContent(item)}
                        >
                          <ListItemIcon>{getContentIcon(item)}</ListItemIcon>
                          <ListItemText primary={item.title} secondary={`Tipo: ${item.type}`} />
                          {selectedContent?._id === item._id && (
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <CheckCircleOutlineIcon color="primary" />
                            </ListItemIcon>
                          )}
                        </ListItemButton>
                        {index < filteredContent.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </Paper>
              {errors.selectedContent && <FormHelperText error>{errors.selectedContent}</FormHelperText>}
            </Box>

            <Divider />

            <Box component="form" onSubmit={handleSubmit} id="assignment-form">
              <Typography variant="h6" gutterBottom>Detalles de la Asignación</Typography>
              <Grid container spacing={2}>
                {/* *** Usar DateTimePicker para Fecha y Hora de Inicio *** */}
                <Grid item xs={12} sm={6}>
                  <DateTimePicker // <-- MODIFICADO
                    label="Fecha y Hora de Inicio" // <-- Etiqueta ajustada
                    value={fechaInicio}
                    onChange={setFechaInicio}
                    //minDate={new Date()} // Opcional: Deshabilita fechas pasadas en el picker visualmente
                    //minTime={new Date()} // Opcional: Deshabilita horas pasadas en el picker visualmente
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.fechaInicio,
                        helperText: errors.fechaInicio,
                        disabled: isAssigning || !selectedContent
                      }
                    }}
                  />
                </Grid>
                {/* *** Usar DateTimePicker para Fecha y Hora de Fin *** */}
                <Grid item xs={12} sm={6}>
                  <DateTimePicker // <-- MODIFICADO
                    label="Fecha y Hora de Fin" // <-- Etiqueta ajustada
                    value={fechaFin}
                    onChange={setFechaFin}
                    // Opcional: Puedes deshabilitar fechas anteriores a la de inicio seleccionada
                    // minDate={fechaInicio || undefined} // Requiere que fechaInicio esté seleccionado
                    // minTime={fechaInicio || undefined} // Deshabilita horas anteriores a fechaInicio si es hoy
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.fechaFin,
                        helperText: errors.fechaFin,
                        disabled: isAssigning || !selectedContent
                      }
                    }}
                  />
                </Grid>

                {selectedContent?._isActivity && (
                  <>
                    {/* Campo Puntos Máximos (mantener tu lógica de visualización) */}
                     { (selectedContent.type === 'Quiz' || selectedContent.type === 'Cuestionario' || selectedContent.type === 'Trabajo') && ( // Asumo que Trabajo también puede tener puntos
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Puntos Máximos"
                          type="number"
                          fullWidth
                          value={puntosMaximos}
                          onChange={(e) => setPuntosMaximos(e.target.value)}
                          InputProps={{ inputProps: { min: 0, step: 0.1 } }}
                          error={!!errors.puntosMaximos}
                          helperText={errors.puntosMaximos}
                          disabled={isAssigning || !selectedContent}
                      />
                    </Grid>
                     )}


                    {/* Campos solo para Quiz/Cuestionario (Intentos y Tiempo) - Mantener tu lógica de visualización */}
                    {(selectedContent.type === 'Quiz' || selectedContent.type === 'Cuestionario') && (
                      <>
                        {/* Campo Intentos Permitidos */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Intentos Permitidos"
                            type="number"
                            fullWidth
                            value={intentosPermitidos}
                            onChange={(e) => setIntentosPermitidos(e.target.value)}
                            InputProps={{ inputProps: { min: 0, step: 1 } }}
                            error={!!errors.intentosPermitidos}
                            helperText={errors.intentosPermitidos}
                            disabled={isAssigning || !selectedContent}
                          />
                        </Grid>
                        {/* Campo Tiempo Límite */}
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Tiempo Límite (min)"
                            type="number"
                            fullWidth
                            value={tiempoLimite}
                            onChange={(e) => setTiempoLimite(e.target.value)}
                            // min={0} es para permitir 0 intentos, pero tiempo debe ser positivo
                            InputProps={{ inputProps: { min: 0, step: 1 } }} // Min 0 aquí, validación > 0 en validateForm
                            error={!!errors.tiempoLimite}
                            helperText={errors.tiempoLimite}
                            disabled={isAssigning || !selectedContent}
                          />
                        </Grid>
                      </>
                    )}
                  </>
                )}
              </Grid>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isAssigning}>Cancelar</Button>
          <Button
            type="submit"
            form="assignment-form"
            variant="contained"
            // Solo deshabilitar si está asignando o no hay contenido seleccionado
            disabled={isAssigning || !selectedContent}
            endIcon={isAssigning ? <CircularProgress size={20} color="inherit" /> : null}
          >
            Asignar Contenido
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

export default AddContentAssignmentDialog;